import { useStore } from '../store'
import { useAgenda } from '../stores/agenda'
import { useAvisos, useConfig } from '../stores/config'
import { sugerirCategoria, useFinancas } from '../stores/financas'
import { useMotor } from '../stores/motor'
import { dataISO, hora, reais } from '../util'
import { carregarRede } from './carregar'
import { decidir, type Decisao, type MotorRede, type Origem } from './interpretar'
import { comCamadaPessoal, memoriaDe } from './pessoal'
import type { Interpretacao } from './regras'

const DURACAO_COMPROMISSO = 60 * 60_000
const DIA = 86_400_000
const ENERGIA_MEDIA = 2

/** "hoje às 13:00", "amanhã às 15:00", "sexta, 30/10 às 09:00". */
export function quandoPorExtenso(t: number, agora = Date.now()) {
  const dia = dataISO(t)
  let nome = new Date(t).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit' }).replace('-feira', '')
  if (dia === dataISO(agora)) nome = 'hoje'
  else if (dia === dataISO(agora + DIA)) nome = 'amanhã'
  return `${nome} às ${hora(t)}`
}

/** Cria o item e devolve a função que o apaga; null se não houver como criar. */
function criar(r: Interpretacao): (() => void) | null {
  if (r.classe === 'compromisso' && r.quando) {
    const agenda = useAgenda.getState()
    const id = agenda.criarEvento({ titulo: r.titulo, inicio: r.quando, fim: r.fim ?? r.quando + DURACAO_COMPROMISSO, origem: 'local' })
    return () => useAgenda.getState().removerEvento(id)
  }
  if (r.classe === 'lembrete' && r.quando) {
    const id = useAgenda.getState().criarLembrete({ texto: r.titulo, quando: r.quando, repetir: r.repetir ?? 'nunca' })
    return () => useAgenda.getState().removerLembrete(id)
  }
  if (r.classe === 'passo') {
    const id = useStore.getState().criarPasso(r.projeto?.id ?? null, r.titulo, ENERGIA_MEDIA)
    return () => useStore.getState().removerPasso(id)
  }
  const f = useFinancas.getState()
  if ((r.classe === 'despesa' || r.classe === 'receita') && r.valor && f.contas[0]) {
    const id = f.lancar({
      contaId: f.contas[0].id,
      valor: r.valor,
      descricao: r.titulo,
      data: r.data ?? dataISO(),
      categoriaId: r.valor < 0 ? sugerirCategoria(r.titulo, f.transacoes, f.categorias) : null,
    })
    return () => useFinancas.getState().removerTransacao(id)
  }
  return null
}

const REPETE = { diario: 'todo dia', semanal: 'toda semana', mensal: 'todo mês' }

const NOMES: Record<string, [regra: string, rede: string]> = {
  compromisso: ['Compromisso', 'Parece um compromisso'],
  lembrete: ['Lembrete', 'Parece um lembrete'],
  despesa: ['Gasto', 'Parece um gasto'],
  receita: ['Entrada', 'Parece uma entrada'],
  passo: ['Tarefa', 'Parece uma tarefa'],
}

/** Título e corpo do aviso: a regra diz o porquê, a memória diz que repetiu você, a rede diz "parece". */
function aviso(r: Interpretacao, origem: Origem): [string, string] {
  // Dentro de um projeto, o app chama de passo; solta, de tarefa.
  const nome = r.projeto ? 'Passo' : NOMES[r.classe][origem === 'rede' ? 1 : 0]
  const titulo = r.titulo ? `${nome}: ${r.titulo}` : nome
  const detalhe = [
    r.quando ? quandoPorExtenso(r.quando) + (r.fim ? ` até ${hora(r.fim)}` : '') : r.valor ? reais(Math.abs(r.valor)) : r.projeto ? `no projeto ${r.projeto.titulo}` : 'solta, energia média',
    r.repetir && REPETE[r.repetir],
    r.data && r.data !== dataISO() && (r.data === dataISO(Date.now() - DIA) ? 'ontem' : 'anteontem'),
  ]
    .filter(Boolean)
    .join(' · ')
  if (origem === 'regra') return [titulo, `${detalhe} · por causa de ${r.motivo}`]
  if (origem === 'memoria') return [titulo, `${detalhe} · como você organizou da última vez`]
  return [titulo, detalhe]
}

/** A decisão com tudo o que o app sabe agora: ajustes, memória, camada pessoal e projetos abertos. */
export function decidirAgora(texto: string, base: MotorRede | null): Decisao {
  const { exemplos, pessoal } = useMotor.getState()
  const rede = base && { ...base, rede: comCamadaPessoal(base.rede, base.hashDados ?? '', pessoal) }
  const projetos = useStore.getState().projetos.filter((p) => !p.concluidoEm)
  return decidir(texto.trim(), new Date(), { automatico: useConfig.getState().organizarSozinho, rede, memoria: memoriaDe(exemplos), projetos })
}

const SUGESTOES: Record<string, string> = {
  compromisso: 'um compromisso',
  lembrete: 'um lembrete',
  despesa: 'um gasto',
  receita: 'uma entrada',
  passo: 'uma tarefa',
  ideia: 'uma ideia',
  compra: 'vontade de comprar',
}

/** O que o app faria com o texto, numa linha, sem criar nada (o "Experimente" do tutorial). */
export function descrever(d: Decisao): string {
  if ('criar' in d) return aviso(d.criar, d.origem).join(' · ')
  return d.sugestao ? `Fica na Caixa, com "parece ${SUGESTOES[d.sugestao]}" na frente` : 'Fica na Caixa'
}

/**
 * Passa o texto pelo motor (docs/MOTOR.md). Se uma regra, a sua correção anterior ou a rede
 * liberada decide, cria o item e avisa com Desfazer, que apaga o item e devolve o texto para a
 * Caixa. Senão, guarda na Caixa com a sugestão.
 */
export async function organizar(texto: string) {
  const t = texto.trim()
  if (!t) return
  const d = decidirAgora(t, await carregarRede())
  if ('caixa' in d) return useStore.getState().capturar(t, d.sugestao)

  const desfazer = criar(d.criar)
  if (!desfazer) return useStore.getState().capturar(t, d.criar.classe)
  const [titulo, corpo] = aviso(d.criar, d.origem)
  useAvisos.getState().mostrar(titulo, corpo, {
    destaque: d.origem === 'regra' ? d.criar.motivo : undefined,
    acao: {
      rotulo: 'Desfazer',
      // Sem sugestão: se foi desfeito, o tipo estava errado.
      fazer: () => {
        desfazer()
        useStore.getState().capturar(t)
      },
    },
  })
}
