import { calibracao } from './calculos.ts'
import { escolherPasso } from './escolher.ts'
import type { Energia, Evento, Passo, Projeto, Sessao } from './types'
import { dataISO } from './util.ts'

/**
 * "Montar meu dia" e "Refazer o resto do dia" (D01 e D02 em docs/CONCORRENTES.md): sugerem horários para
 * passos nos vãos livres da agenda. Nada é marcado sem você confirmar, e nada vira "atrasado".
 */

const MIN = 60_000
/** Duração quando o passo não tem palpite, pela energia que ele pede (leve, média, pesada). */
const PADRAO_POR_ENERGIA = { 1: 15, 2: 25, 3: 45 } as const
/** Intervalo entre um bloco e o seguinte: trocar de atividade leva tempo. */
export const FOLGA_MIN = 10

/** Duração prevista: o palpite corrigido pelo seu ritmo (calibração), em múltiplos de 5 min, entre 5 e 120. */
export function duracaoPrevista(passo: Passo, fator = 1) {
  const base = passo.estimativaMin ?? PADRAO_POR_ENERGIA[passo.energia]
  return Math.min(120, Math.max(5, Math.round((base * fator) / 5) * 5))
}

export interface Bloco {
  id: string
  inicio: number
  fim: number
}

/**
 * Encaixa blocos, na ordem dada, no primeiro vão livre entre `de` e `ate`, com folga antes e depois de cada
 * compromisso e depois de cada bloco. O que não couber fica em `semEspaco`, na mesma ordem.
 */
export function encaixar(itens: { id: string; minutos: number }[], ocupados: Evento[], de: number, ate: number, folgaMin = FOLGA_MIN) {
  const folga = folgaMin * MIN
  // Compromisso ocupa também a folga antes e depois; o primeiro bloco começa no próximo múltiplo de 5 minutos.
  const faixas = ocupados
    .filter((e) => !e.diaInteiro && e.fim > de && e.inicio < ate)
    .map((e) => ({ inicio: e.inicio - folga, fim: e.fim + folga }))
  const blocos: Bloco[] = []
  const semEspaco: string[] = []
  let cursor = Math.ceil(de / (5 * MIN)) * 5 * MIN
  for (const item of itens) {
    const duracao = item.minutos * MIN
    let t = cursor
    for (;;) {
      const choque = faixas.find((f) => f.inicio < t + duracao && f.fim > t)
      if (!choque) break
      t = Math.ceil(choque.fim / (5 * MIN)) * 5 * MIN
    }
    if (t + duracao > ate) {
      semEspaco.push(item.id)
      continue
    }
    blocos.push({ id: item.id, inicio: t, fim: t + duracao })
    faixas.push({ inicio: t, fim: t + duracao + folga })
    cursor = t + duracao + folga
  }
  return { blocos, semEspaco }
}

/**
 * Até `quantos` horários livres para um passo (V13 em docs/CONCORRENTES.md), espaçados de pelo menos 1 hora,
 * em cada faixa dada (por exemplo, o resto de hoje e amanhã). Só propõe: quem marca é você.
 */
export function horariosLivres(minutos: number, eventos: Evento[], faixas: [number, number][], quantos = 3) {
  const achados: Bloco[] = []
  for (const [de, ate] of faixas) {
    let desde = de
    while (achados.length < quantos) {
      const { blocos } = encaixar([{ id: String(achados.length), minutos }], eventos, desde, ate)
      if (!blocos.length) break
      achados.push(blocos[0])
      desde = Math.max(blocos[0].fim, blocos[0].inicio + 60 * MIN)
    }
  }
  return achados
}

export interface Proposta extends Bloco {
  passo: Passo
  projeto: Projeto | null
  motivo: string
}

interface Dados {
  projetos: Projeto[]
  passos: Passo[]
  sessoes: Sessao[]
  eventos: Evento[]
  focoId: string | null
  energia: Energia
}

/**
 * Sugere até `limite` passos para o resto do dia, na ordem de escolherPasso, com horário nos vãos livres.
 * Passos acima da energia ficam de fora, e os que já têm horário reservado também.
 */
export function montarDia(d: Dados, agora: number, ate: number, limite = 4) {
  const dia = dataISO(new Date(agora))
  const fora = new Set(d.eventos.filter((e) => e.passoId && e.fim > agora).map((e) => e.passoId!))
  const escolhidos: Omit<Proposta, keyof Bloco>[] = []
  while (escolhidos.length < limite) {
    const e = escolherPasso(d.projetos, d.passos, d.focoId, d.energia, new Set(), fora, dia)
    if (!e || e.acimaDaEnergia) break
    escolhidos.push({ passo: e.passo, projeto: e.projeto, motivo: e.motivo })
    fora.add(e.passo.id)
  }
  const fator = Math.min(2, Math.max(0.5, calibracao(d.passos, d.sessoes)?.fator ?? 1))
  const { blocos, semEspaco } = encaixar(
    escolhidos.map((c) => ({ id: c.passo.id, minutos: duracaoPrevista(c.passo, fator) })),
    d.eventos,
    agora,
    ate,
  )
  const porId = new Map(escolhidos.map((c) => [c.passo.id, c]))
  return {
    propostas: blocos.map((b): Proposta => ({ ...b, ...porId.get(b.id)! })),
    semEspaco: semEspaco.map((id) => porId.get(id)!.passo),
  }
}

/**
 * Reencaixa no resto do dia os horários reservados de hoje (criados no MeUsMe) cujo passo não foi feito:
 * os que já passaram e os que ainda vão chegar, na ordem original e com a mesma duração. O horário em
 * andamento fica como está. Só faz sentido quando algum já passou (`passaram` > 0).
 */
export function refazerResto(eventos: Evento[], passos: Passo[], agora: number, ate: number, desde: number) {
  const pendente = (e: Evento) =>
    e.passoId && e.origem === 'local' && !e.diaInteiro && e.inicio >= desde && passos.some((p) => p.id === e.passoId && !p.feitoEm)
  const alvos = eventos.filter((e) => pendente(e) && (e.fim <= agora || e.inicio > agora)).sort((a, b) => a.inicio - b.inicio)
  const ids = new Set(alvos.map((e) => e.id))
  const { blocos, semEspaco } = encaixar(
    alvos.map((e) => ({ id: e.id, minutos: Math.round((e.fim - e.inicio) / MIN) })),
    eventos.filter((e) => !ids.has(e.id)),
    agora,
    ate,
  )
  const porId = new Map(alvos.map((e) => [e.id, e]))
  return {
    passaram: alvos.filter((e) => e.fim <= agora).length,
    mover: blocos.map((b) => ({ ...b, evento: porId.get(b.id)! })),
    naoCabem: semEspaco.map((id) => porId.get(id)!),
  }
}
