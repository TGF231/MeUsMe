import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Evento, Lembrete } from '../types'
import { novoId } from '../util'

interface Estado {
  /** Eventos locais e a cópia em cache dos eventos do Google, para funcionar offline. */
  eventos: Evento[]
  lembretes: Lembrete[]
  googleClientId: string
  googleConectado: boolean
  ultimaSync?: number

  criarEvento: (e: Omit<Evento, 'id'>) => string
  atualizarEvento: (id: string, m: Partial<Evento>) => void
  removerEvento: (id: string) => void
  /** Troca o cache do Google na janela [de, ate) pelos eventos recém-baixados. */
  substituirGoogle: (eventos: Omit<Evento, 'id'>[], de: number, ate: number) => void

  criarLembrete: (l: Omit<Lembrete, 'id'>) => void
  concluirLembrete: (id: string) => void
  avancarLembrete: (id: string) => void
  removerLembrete: (id: string) => void

  configurarGoogle: (m: Partial<Pick<Estado, 'googleClientId' | 'googleConectado' | 'ultimaSync'>>) => void
}

export function proximaOcorrencia(l: Lembrete) {
  const d = new Date(l.quando)
  const agora = Date.now()
  do {
    if (l.repetir === 'diario') d.setDate(d.getDate() + 1)
    else if (l.repetir === 'semanal') d.setDate(d.getDate() + 7)
    else if (l.repetir === 'mensal') d.setMonth(d.getMonth() + 1)
    else break
  } while (d.getTime() <= agora)
  return d.getTime()
}

export const useAgenda = create<Estado>()(
  persist(
    (set) => ({
      eventos: [],
      lembretes: [],
      googleClientId: import.meta.env.VITE_GOOGLE_CLIENT_ID ?? '',
      googleConectado: false,

      criarEvento: (e) => {
        const id = novoId()
        set((s) => ({ eventos: [...s.eventos, { ...e, id }] }))
        return id
      },
      atualizarEvento: (id, m) => set((s) => ({ eventos: s.eventos.map((e) => (e.id === id ? { ...e, ...m, id } : e)) })),
      removerEvento: (id) => set((s) => ({ eventos: s.eventos.filter((e) => e.id !== id) })),
      substituirGoogle: (novos, de, ate) =>
        set((s) => {
          // Preserva o vínculo com passos que foram agendados daqui para o Google.
          const vinculos = new Map(s.eventos.filter((e) => e.googleId && e.passoId).map((e) => [e.googleId, e.passoId]))
          const fora = s.eventos.filter((e) => e.origem !== 'google' || e.fim <= de || e.inicio >= ate)
          return {
            eventos: [
              ...fora,
              ...novos.map((e) => ({ ...e, id: novoId(), passoId: e.passoId ?? vinculos.get(e.googleId) })),
            ],
          }
        }),

      criarLembrete: (l) => set((s) => ({ lembretes: [...s.lembretes, { ...l, id: novoId() }] })),
      concluirLembrete: (id) =>
        set((s) => ({
          lembretes: s.lembretes.map((l) =>
            l.id !== id ? l : l.repetir === 'nunca' ? { ...l, concluido: true } : { ...l, quando: proximaOcorrencia(l) },
          ),
        })),
      avancarLembrete: (id) =>
        set((s) => ({
          lembretes: s.lembretes.map((l) => (l.id === id && l.repetir !== 'nunca' ? { ...l, quando: proximaOcorrencia(l) } : l)),
        })),
      removerLembrete: (id) => set((s) => ({ lembretes: s.lembretes.filter((l) => l.id !== id) })),

      configurarGoogle: (m) => set(m),
    }),
    { name: 'meusme-agenda', version: 1 },
  ),
)

export const eventosDoDia = (eventos: Evento[], diaInicio: number) => {
  const fim = diaInicio + 86_400_000
  return eventos.filter((e) => e.inicio < fim && e.fim > diaInicio).sort((a, b) => a.inicio - b.inicio)
}

/** Situação do momento para combater a "cegueira do tempo": o que está acontecendo e quanto tempo livre resta. */
export function situacaoAgora(eventos: Evento[], agora = Date.now()) {
  const comHora = eventos.filter((e) => !e.diaInteiro)
  const atual = comHora.find((e) => e.inicio <= agora && e.fim > agora)
  const proximo = comHora.filter((e) => e.inicio > agora).sort((a, b) => a.inicio - b.inicio)[0]
  return { atual, proximo }
}
