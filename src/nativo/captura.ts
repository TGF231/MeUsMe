import { registerPlugin, type PluginListenerHandle } from '@capacitor/core'
import { useStore } from '../store'
import { useAvisos } from '../stores/config'
import { sugerirCategoria, useFinancas } from '../stores/financas'
import { dataISO, reais } from '../util'
import { BANCOS, lerNotificacao } from './bancos'
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

/** Converte a fila nativa em lançamentos provisórios; o que não for reconhecido vai para a Caixa. */
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
    const contaId = lido && contaPara(banco, lido.cartao)
    if (!lido || !contaId) {
      useStore.getState().capturar(`${banco}: ${c.titulo} — ${c.texto}`)
      paraRevisar++
      continue
    }
    registrados += fin.importar([
      {
        contaId,
        valor: lido.valor,
        descricao: lido.descricao,
        data: dataISO(c.quando),
        categoriaId: sugerirCategoria(lido.descricao, useFinancas.getState().transacoes, fin.categorias),
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
      .mostrar('Notificações do banco', [registrados && `${registrados} lançamento(s) registrado(s)`, paraRevisar && `${paraRevisar} para revisar na Caixa`].filter(Boolean).join(' · '))
}
