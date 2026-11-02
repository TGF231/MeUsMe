import type { Evento } from './types'

/** Conversão dos eventos da API do Google Agenda (sem login nem rede, para dar para testar). */

export interface EventoGoogle {
  id: string
  summary?: string
  status?: string
  start: { dateTime?: string; date?: string }
  end: { dateTime?: string; date?: string }
}

const paraMs = (p: { dateTime?: string; date?: string }) =>
  p.dateTime ? new Date(p.dateTime).getTime() : new Date(`${p.date}T00:00:00`).getTime()

/**
 * Eventos do Google no formato do app. Os de outra agenda (D08) levam o nome dela e um googleId com o ID da agenda na
 * frente: o mesmo evento pode estar em duas agendas, e o app não tenta apagá-los no Google.
 */
export function paraEventos(itens: EventoGoogle[], agenda?: { id: string; nome: string }): Omit<Evento, 'id'>[] {
  return itens
    .filter((e) => e.status !== 'cancelled')
    .map((e) => ({
      titulo: e.summary ?? '(sem título)',
      inicio: paraMs(e.start),
      fim: paraMs(e.end),
      diaInteiro: !e.start.dateTime,
      origem: 'google' as const,
      googleId: agenda ? `${agenda.id}/${e.id}` : e.id,
      ...(agenda && { agendaGoogle: agenda.nome }),
    }))
}
