import { useStore } from '../store'
import { useAgenda } from '../stores/agenda'
import { useAvisos, useConfig } from '../stores/config'
import { sugerirCategoria, useFinancas } from '../stores/financas'
import { dataISO, hora, reais } from '../util'
import { decidir } from './interpretar'
import type { Interpretacao } from './regras'

const DURACAO_COMPROMISSO = 60 * 60_000
const DIA = 86_400_000

/** "hoje às 13:00", "amanhã às 15:00", "sexta, 30/10 às 09:00". */
export function quandoPorExtenso(t: number, agora = Date.now()) {
  const dia = dataISO(t)
  const nome =
    dia === dataISO(agora)
      ? 'hoje'
      : dia === dataISO(agora + DIA)
        ? 'amanhã'
        : new Date(t).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit' }).replace('-feira', '')
  return `${nome} às ${hora(t)}`
}

/** Cria o item e devolve a função que o apaga; null se não houver como criar. */
function criar(r: Interpretacao): (() => void) | null {
  if (r.classe === 'compromisso' && r.quando) {
    const agenda = useAgenda.getState()
    const id = agenda.criarEvento({ titulo: r.titulo, inicio: r.quando, fim: r.quando + DURACAO_COMPROMISSO, origem: 'local' })
    return () => useAgenda.getState().removerEvento(id)
  }
  if (r.classe === 'lembrete' && r.quando) {
    const id = useAgenda.getState().criarLembrete({ texto: r.titulo, quando: r.quando, repetir: 'nunca' })
    return () => useAgenda.getState().removerLembrete(id)
  }
  const f = useFinancas.getState()
  if ((r.classe === 'despesa' || r.classe === 'receita') && r.valor && f.contas[0]) {
    const id = f.lancar({
      contaId: f.contas[0].id,
      valor: r.valor,
      descricao: r.titulo,
      data: dataISO(),
      categoriaId: r.valor < 0 ? sugerirCategoria(r.titulo, f.transacoes, f.categorias) : null,
    })
    return () => useFinancas.getState().removerTransacao(id)
  }
  return null
}

function aviso(r: Interpretacao): [string, string] {
  const motivo = ` · por causa de ${r.motivo}`
  if (r.classe === 'compromisso') return [`Compromisso: ${r.titulo}`, quandoPorExtenso(r.quando!) + motivo]
  if (r.classe === 'lembrete') return [`Lembrete: ${r.titulo}`, quandoPorExtenso(r.quando!) + motivo]
  const nome = r.classe === 'receita' ? 'Entrada' : 'Gasto'
  return [r.titulo ? `${nome}: ${r.titulo}` : nome, reais(Math.abs(r.valor!)) + motivo]
}

/**
 * Passa o texto pelo motor (docs/MOTOR.md). Se uma regra se aplica, cria o item e avisa com
 * Desfazer, que apaga o item e devolve o texto para a Caixa. Senão, guarda na Caixa com a sugestão.
 */
export function organizar(texto: string) {
  const t = texto.trim()
  if (!t) return
  const d = decidir(t, new Date(), { automatico: useConfig.getState().organizarSozinho })
  if ('caixa' in d) return useStore.getState().capturar(t, d.sugestao)

  const desfazer = criar(d.criar)
  if (!desfazer) return useStore.getState().capturar(t, d.criar.classe)
  const [titulo, corpo] = aviso(d.criar)
  useAvisos.getState().mostrar(titulo, corpo, {
    destaque: d.criar.motivo,
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
