import type { Evento } from './types'

/**
 * Linha do tempo do resto do dia (V12 em docs/CONCORRENTES.md): de agora até a meia-noite, onde estão os
 * compromissos e os horários reservados para passos, e quanto sobra livre. Posições em % da faixa.
 */
export interface Faixa {
  id: string
  titulo: string
  reservado: boolean
  inicio: number
  largura: number
}

export function linhaDoTempo(eventos: Evento[], de: number, ate: number) {
  const total = ate - de
  const doDia = eventos
    .filter((e) => !e.diaInteiro && e.fim > de && e.inicio < ate)
    .map((e) => ({ ...e, inicio: Math.max(e.inicio, de), fim: Math.min(e.fim, ate) }))
    .sort((a, b) => a.inicio - b.inicio)
  const faixas: Faixa[] = doDia.map((e) => ({
    id: e.id,
    titulo: e.titulo,
    reservado: Boolean(e.passoId),
    inicio: ((e.inicio - de) / total) * 100,
    largura: Math.max(1, ((e.fim - e.inicio) / total) * 100),
  }))
  // Tempo ocupado sem contar duas vezes o que se sobrepõe.
  let ocupado = 0
  let cursor = de
  for (const e of doDia) {
    const comeco = Math.max(e.inicio, cursor)
    if (e.fim > comeco) ocupado += e.fim - comeco
    cursor = Math.max(cursor, e.fim)
  }
  return { faixas, livreMin: Math.round((total - ocupado) / 60_000) }
}

/**
 * Compromissos colados (D05 em docs/CONCORRENTES.md): para cada compromisso seguido de outro em menos de `folgaMin`,
 * os minutos até o próximo (negativo quando o próximo começa antes de este terminar). Reservas de passo ficam de fora.
 */
export function apertos(eventos: Evento[], folgaMin = 15) {
  const lista = eventos.filter((e) => !e.diaInteiro && !e.passoId).sort((a, b) => a.inicio - b.inicio)
  const r = new Map<string, number>()
  for (let i = 0; i + 1 < lista.length; i++) {
    const folga = Math.round((lista[i + 1].inicio - lista[i].fim) / 60_000)
    if (folga < folgaMin) r.set(lista[i].id, folga)
  }
  return r
}
