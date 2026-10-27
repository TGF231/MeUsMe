import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Captura, CheckIn, Energia, Ideia, Passo, Projeto, Sessao } from './types'
import { hoje, novoId as id } from './util'

export { hoje }

interface Estado {
  capturas: Captura[]
  projetos: Projeto[]
  passos: Passo[]
  ideias: Ideia[]
  sessoes: Sessao[]
  checkins: CheckIn[]
  focoId: string | null

  capturar: (texto: string) => void
  descartarCaptura: (id: string) => void

  criarProjeto: (titulo: string, chegada: string) => string
  concluirProjeto: (id: string) => void
  definirFoco: (id: string | null) => void

  criarPasso: (projetoId: string | null, texto: string, energia: Energia, antesDe?: string) => void
  concluirPasso: (id: string) => void
  atualizarPasso: (id: string, mudancas: Partial<Omit<Passo, 'id'>>) => void
  removerPasso: (id: string) => void

  estacionarIdeia: (texto: string, projetoId: string | null) => void
  removerIdeia: (id: string) => void

  iniciarSessao: (passoId: string) => string
  encerrarSessao: (id: string) => void

  salvarCheckIn: (c: CheckIn) => void
}

export const useStore = create<Estado>()(
  persist(
    (set) => ({
      capturas: [],
      projetos: [],
      passos: [],
      ideias: [],
      sessoes: [],
      checkins: [],
      focoId: null,

      capturar: (texto) =>
        set((s) => ({ capturas: [{ id: id(), texto, criadoEm: Date.now() }, ...s.capturas] })),
      descartarCaptura: (cid) => set((s) => ({ capturas: s.capturas.filter((c) => c.id !== cid) })),

      criarProjeto: (titulo, chegada) => {
        const pid = id()
        set((s) => ({ projetos: [...s.projetos, { id: pid, titulo, chegada, criadoEm: Date.now() }] }))
        return pid
      },
      concluirProjeto: (pid) =>
        set((s) => ({
          projetos: s.projetos.map((p) => (p.id === pid ? { ...p, concluidoEm: Date.now() } : p)),
          focoId: s.focoId === pid ? null : s.focoId,
        })),
      definirFoco: (pid) => set({ focoId: pid }),

      criarPasso: (projetoId, texto, energia, antesDe) =>
        set((s) => {
          const doProjeto = s.passos.filter((p) => p.projetoId === projetoId)
          let ordem = doProjeto.reduce((m, p) => Math.max(m, p.ordem), 0) + 1
          let criadoEm = Date.now()
          if (antesDe) {
            const alvo = s.passos.find((p) => p.id === antesDe)
            if (alvo) {
              // Herda criadoEm do original para ter a mesma prioridade por idade na escolha.
              ordem = alvo.ordem - 0.5
              criadoEm = alvo.criadoEm - 1
            }
          }
          return { passos: [...s.passos, { id: id(), projetoId, texto, energia, ordem, criadoEm }] }
        }),
      concluirPasso: (pid) =>
        set((s) => ({ passos: s.passos.map((p) => (p.id === pid ? { ...p, feitoEm: Date.now() } : p)) })),
      atualizarPasso: (pid, m) => set((s) => ({ passos: s.passos.map((p) => (p.id === pid ? { ...p, ...m } : p)) })),
      removerPasso: (pid) => set((s) => ({ passos: s.passos.filter((p) => p.id !== pid) })),

      estacionarIdeia: (texto, projetoId) =>
        set((s) => ({ ideias: [{ id: id(), texto, projetoId, criadoEm: Date.now() }, ...s.ideias] })),
      removerIdeia: (iid) => set((s) => ({ ideias: s.ideias.filter((i) => i.id !== iid) })),

      iniciarSessao: (passoId) => {
        const sid = id()
        set((s) => ({ sessoes: [...s.sessoes, { id: sid, passoId, inicio: Date.now() }] }))
        return sid
      },
      encerrarSessao: (sid) =>
        set((s) => ({ sessoes: s.sessoes.map((x) => (x.id === sid && !x.fim ? { ...x, fim: Date.now() } : x)) })),

      salvarCheckIn: (c) =>
        set((s) => ({ checkins: [...s.checkins.filter((x) => x.dia !== c.dia), c] })),
    }),
    { name: 'meusme', version: 1 },
  ),
)

/** Passos pendentes de um projeto, ordenados. */
export const pendentes = (passos: Passo[], projetoId: string | null) =>
  passos.filter((p) => p.projetoId === projetoId && !p.feitoEm).sort((a, b) => a.ordem - b.ordem)

export { minutosDoPasso } from './calculos'

export const checkInDeHoje = () => useStore.getState().checkins.find((c) => c.dia === hoje())
