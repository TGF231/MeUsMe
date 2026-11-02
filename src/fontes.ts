import { BANCOS } from './nativo/bancos.ts'
import type { Conta, Transacao } from './types'

/**
 * Saúde das fontes de lançamentos (D25 em docs/CONCORRENTES.md): quando cada fonte trouxe dado pela última vez.
 * A origem vem do chaveImport: "notificacao:<pacote>:…", "pluggy:…" ou a chave do CSV. Lançamento manual não conta.
 */

const DIA = 86_400_000

export interface Fonte {
  chave: string
  nome: string
  /** Notificações e Open Finance chegam sozinhos; o CSV depende de você importar. */
  automatica: boolean
  /** Quando o último lançamento dessa fonte chegou ao app. */
  ultima: number
  diasSemDados: number
  /** Dias com chegada nos últimos 30 dias. */
  diasComDados30: number
  /** Intervalo típico entre dias com chegada (mediana dos últimos 90 dias), ou null com poucos dados. */
  ritmoDias: number | null
  /** Automática que passou bem do próprio ritmo: talvez o banco tenha parado de avisar. */
  parada: boolean
}

function origem(t: Transacao, contas: Conta[]) {
  const k = t.chaveImport
  if (!k) return null
  if (k.startsWith('notificacao:')) {
    const pacote = k.split(':')[1]
    return { chave: `notificacao:${pacote}`, nome: `Notificações do ${BANCOS[pacote] ?? pacote}`, automatica: true }
  }
  if (k.startsWith('pluggy:')) return { chave: 'pluggy', nome: 'Meu Pluggy (Open Finance)', automatica: true }
  const conta = contas.find((c) => c.id === t.contaId)
  return { chave: `csv:${t.contaId}`, nome: `Extrato importado${conta ? ` · ${conta.nome}` : ''}`, automatica: false }
}

const mediana = (xs: number[]) => {
  const o = [...xs].sort((a, b) => a - b)
  const m = Math.floor(o.length / 2)
  return o.length % 2 ? o[m] : (o[m - 1] + o[m]) / 2
}

/**
 * "Parada" usa o ritmo da própria fonte: quem recebe aviso todo dia estranha 4 dias de silêncio; quem recebe a cada
 * semana, não. O limite é 3 vezes o ritmo, nunca menos de 7 dias (uma semana sem gastar é normal). Sem ritmo, 14 dias.
 */
export function saudeDasFontes(transacoes: Transacao[], contas: Conta[], agora = Date.now()): Fonte[] {
  const grupos = new Map<string, { nome: string; automatica: boolean; chegadas: number[] }>()
  for (const t of transacoes) {
    const o = origem(t, contas)
    if (!o) continue
    const g = grupos.get(o.chave) ?? { nome: o.nome, automatica: o.automatica, chegadas: [] }
    g.chegadas.push(t.criadoEm)
    grupos.set(o.chave, g)
  }

  return [...grupos.entries()]
    .map(([chave, g]) => {
      const ultima = Math.max(...g.chegadas)
      const diasSemDados = Math.floor((agora - ultima) / DIA)
      // Um import traz muitos lançamentos no mesmo instante: o ritmo conta dias com chegada, não lançamentos.
      const dias = [...new Set(g.chegadas.filter((c) => agora - c <= 90 * DIA).map((c) => Math.floor(c / DIA)))].sort((a, b) => a - b)
      const intervalos = dias.slice(1).map((d, i) => d - dias[i])
      const ritmoDias = intervalos.length >= 2 ? mediana(intervalos) : null
      const limite = ritmoDias === null ? 14 : Math.max(7, Math.ceil(3 * ritmoDias))
      const diasComDados30 = new Set(g.chegadas.filter((c) => agora - c <= 30 * DIA).map((c) => Math.floor(c / DIA))).size
      const parada = g.automatica && diasSemDados > limite
      return { chave, nome: g.nome, automatica: g.automatica, ultima, diasSemDados, diasComDados30, ritmoDias, parada }
    })
    .sort((a, b) => Number(b.parada) - Number(a.parada) || Number(b.automatica) - Number(a.automatica) || b.ultima - a.ultima)
}

/** "hoje", "ontem" ou "há N dias". */
export const haQuanto = (dias: number) => (dias <= 0 ? 'hoje' : dias === 1 ? 'ontem' : `há ${dias} dias`)
