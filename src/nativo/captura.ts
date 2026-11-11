import { registerPlugin, type PluginListenerHandle } from '@capacitor/core'
import { useStore } from '../store'
import { useAvisos } from '../stores/config'
import { sugerirCategoria, TRANSFERENCIA, useFinancas } from '../stores/financas'
import { dataISO, reais } from '../util'
import { BANCOS, dividirResgate, lerNotificacao } from './bancos'
import { ehAndroid } from './plataforma'

interface CapturaNativa {
  pacote: string
  titulo: string
  texto: string
  quando: number
}

interface PluginCaptura {
  estado(): Promise<{ permitido: boolean; pacotes: string[] }>
  abrirAjustes(): Promise<void>
  abrirInfoDoApp(): Promise<void>
  bateria(): Promise<{ otimizado: boolean }>
  abrirBateria(): Promise<void>
  widget(o: { rotulo: string; passo: string }): Promise<void>
  salvarBackup(o: { nome: string; conteudo: string }): Promise<{ ok: boolean; caminho?: string }>
  definirPacotes(o: { pacotes: string[] }): Promise<void>
  pegarCapturas(): Promise<{ capturas: CapturaNativa[] }>
  candidatos(): Promise<{ candidatos: { pacote: string; nome: string; vezes: number }[] }>
  addListener(evento: 'captura', ouvinte: () => void): Promise<PluginListenerHandle>
}

/** Plugin nativo: android/app/src/main/java/app/meusme/CapturaPlugin.java */
export const Captura = registerPlugin<PluginCaptura>('Captura')

export const nomeDoApp = (pacote: string) => BANCOS[pacote] ?? pacote

/** Conta pelo nome do banco; prefere a de cartão para compras no crédito. */
function contaPara(banco: string, cartao: boolean) {
  const contas = useFinancas.getState().contas
  const doBanco = contas.filter((c) => c.nome.toLowerCase().includes(banco.toLowerCase()))
  const ehCartao = (nome: string) => /cart|cr[eé]dito/i.test(nome)
  return (doBanco.find((c) => ehCartao(c.nome) === cartao) ?? doBanco[0] ?? contas[0])?.id
}

/** O que as notificações deste app já registraram como guardado em cofrinho e ainda não voltou, em centavos. */
function guardadoEm(pacote: string) {
  const prefixo = `notificacao:${pacote}:reserva:`
  return -useFinancas
    .getState()
    .transacoes.filter((t) => t.chaveImport?.startsWith(prefixo))
    .reduce((soma, t) => soma + t.valor, 0)
}

/**
 * Converte a fila nativa em lançamentos provisórios. Propaganda, compra recusada e avisos de limite ou saldo são
 * descartados; o que tem valor mas não deu para entender vai para Em espera.
 */
export async function processarCapturas() {
  if (!ehAndroid()) return
  const { capturas } = await Captura.pegarCapturas()
  if (!capturas.length) return
  const fin = useFinancas.getState()
  let registrados = 0
  let paraRevisar = 0

  for (const c of capturas) {
    const banco = nomeDoApp(c.pacote)
    const lido = lerNotificacao(c.titulo, c.texto)
    if (lido?.tipo === 'ignorar') continue
    const contaId = lido && contaPara(banco, lido.tipo === 'movimento' && lido.cartao)
    if (!lido || !contaId) {
      useStore.getState().capturar(`${banco}: ${c.titulo} — ${c.texto}`)
      paraRevisar++
      continue
    }
    if (lido.tipo === 'reserva') {
      // Cofrinho: o dinheiro muda de lugar, sem contar como gasto nem receita. No resgate, o que passa do guardado é
      // rendimento. Com Open Finance na conta o lançamento oficial vem inteiro, então não se divide (senão não casa).
      const conta = useFinancas.getState().contas.find((x) => x.id === contaId)
      const { principal, rendimento } =
        lido.valor > 0 && !conta?.pluggyId ? dividirResgate(guardadoEm(c.pacote), lido.valor) : { principal: lido.valor, rendimento: 0 }
      const base = { contaId, data: dataISO(c.quando), provisoria: true }
      registrados += fin.importar([
        { ...base, valor: principal, descricao: lido.descricao, categoriaId: TRANSFERENCIA, chaveImport: `notificacao:${c.pacote}:reserva:${c.quando}:${lido.valor}` },
        ...(rendimento
          ? [
              {
                ...base,
                valor: rendimento,
                descricao: `Rendimento · ${lido.descricao}`.slice(0, 60),
                categoriaId: fin.categorias.find((x) => x.id === 'cat-outras-receitas')?.id ?? null,
                chaveImport: `notificacao:${c.pacote}:rendimento:${c.quando}:${rendimento}`,
              },
            ]
          : []),
      ])
      if (capturas.length === 1)
        useAvisos
          .getState()
          .mostrar(
            lido.valor < 0 ? 'Dinheiro guardado' : 'Resgate registrado',
            `${reais(Math.abs(lido.valor))} · ${lido.descricao} (${banco})${rendimento ? ` · rendeu ${reais(rendimento)}` : ''}`,
          )
      continue
    }
    registrados += fin.importar([
      {
        contaId,
        valor: lido.valor,
        descricao: lido.descricao,
        data: dataISO(c.quando),
        categoriaId: sugerirCategoria(lido.descricao, useFinancas.getState().transacoes, fin.categorias, fin.regras),
        chaveImport: `notificacao:${c.pacote}:${c.quando}:${lido.valor}`,
        provisoria: true,
      },
    ])
    if (capturas.length === 1)
      useAvisos.getState().mostrar(lido.valor < 0 ? 'Gasto registrado' : 'Entrada registrada', `${reais(Math.abs(lido.valor))} · ${lido.descricao} (${banco})`)
  }
  if (capturas.length > 1 && (registrados || paraRevisar))
    useAvisos
      .getState()
      .mostrar('Notificações do banco', [registrados && `${registrados} lançamento(s) registrado(s)`, paraRevisar && `${paraRevisar} em espera para revisar`].filter(Boolean).join(' · '))
}
