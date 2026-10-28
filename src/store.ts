import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { passosParaModelo } from './calculos'
import type { Captura, CheckIn, Energia, Ideia, Modelo, Passo, Projeto, Sessao } from './types'
import { hoje, novoId as id } from './util'

export { hoje }

interface Estado {
  capturas: Captura[]
  projetos: Projeto[]
  passos: Passo[]
  ideias: Ideia[]
  sessoes: Sessao[]
  checkins: CheckIn[]
  modelos: Modelo[]
  focoId: string | null

  capturar: (texto: string) => void
  descartarCaptura: (id: string) => void

  criarProjeto: (titulo: string, chegada: string) => string
  concluirProjeto: (id: string) => void
  reabrirProjeto: (id: string) => void
  atualizarProjeto: (id: string, mudancas: Partial<Pick<Projeto, 'titulo' | 'chegada'>>) => void
  /** Apaga o projeto e os passos pendentes. Passos feitos ficam no Histórico; ideias voltam para a Caixa. */
  removerProjeto: (id: string) => void
  definirFoco: (id: string | null) => void

  criarPasso: (projetoId: string | null, texto: string, energia: Energia, antesDe?: string) => void
  concluirPasso: (id: string) => void
  atualizarPasso: (id: string, mudancas: Partial<Omit<Passo, 'id'>>) => void
  removerPasso: (id: string) => void
  /** Cria de novo um passo já feito: no mesmo projeto, se ainda estiver aberto, ou como tarefa solta. */
  repetirPasso: (id: string) => void

  /** Guarda o projeto (nome, chegada e passos, feitos ou não) como modelo. */
  salvarModelo: (projetoId: string) => void
  removerModelo: (id: string) => void
  /** Cria um projeto novo com os passos do modelo e devolve o id. */
  usarModelo: (id: string) => string | null

  estacionarIdeia: (texto: string, projetoId: string | null) => void
  removerIdeia: (id: string) => void

  iniciarSessao: (passoId: string) => string
  encerrarSessao: (id: string) => void

  salvarCheckIn: (c: CheckIn) => void
}

/** Encerra o cronômetro de passos que estão saindo; senão a sessão aberta somaria tempo para sempre. */
const fecharSessoes = (sessoes: Sessao[], passos: Set<string>) =>
  sessoes.map((x) => (passos.has(x.passoId) && !x.fim ? { ...x, fim: Date.now() } : x))

export const useStore = create<Estado>()(
  persist(
    (set) => ({
      capturas: [],
      projetos: [],
      passos: [],
      ideias: [],
      sessoes: [],
      checkins: [],
      modelos: [],
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
      reabrirProjeto: (pid) =>
        set((s) => ({
          projetos: s.projetos.map((p) => {
            if (p.id !== pid) return p
            const { concluidoEm: _, ...aberto } = p
            return aberto
          }),
        })),
      atualizarProjeto: (pid, m) => set((s) => ({ projetos: s.projetos.map((p) => (p.id === pid ? { ...p, ...m } : p)) })),
      removerProjeto: (pid) =>
        set((s) => {
          const saem = new Set(s.passos.filter((p) => p.projetoId === pid && !p.feitoEm).map((p) => p.id))
          return {
            projetos: s.projetos.filter((p) => p.id !== pid),
            passos: s.passos.filter((p) => !saem.has(p.id)),
            sessoes: fecharSessoes(s.sessoes, saem),
            ideias: s.ideias.map((i) => (i.projetoId === pid ? { ...i, projetoId: null } : i)),
            focoId: s.focoId === pid ? null : s.focoId,
          }
        }),
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
      removerPasso: (pid) =>
        set((s) => ({ passos: s.passos.filter((p) => p.id !== pid), sessoes: fecharSessoes(s.sessoes, new Set([pid])) })),
      repetirPasso: (pid) => {
        const { passos, projetos, criarPasso } = useStore.getState()
        const p = passos.find((x) => x.id === pid)
        if (!p) return
        const aberto = projetos.some((x) => x.id === p.projetoId && !x.concluidoEm)
        criarPasso(aberto ? p.projetoId : null, p.texto, p.energia)
      },

      salvarModelo: (projetoId) =>
        set((s) => {
          const projeto = s.projetos.find((p) => p.id === projetoId)
          if (!projeto) return {}
          const modelo: Modelo = {
            id: id(),
            titulo: projeto.titulo,
            chegada: projeto.chegada,
            passos: passosParaModelo(s.passos, projetoId),
            criadoEm: Date.now(),
          }
          // Mesmo nome substitui o modelo antigo, para salvar de novo não duplicar.
          return { modelos: [...s.modelos.filter((m) => m.titulo !== projeto.titulo), modelo] }
        }),
      removerModelo: (mid) => set((s) => ({ modelos: s.modelos.filter((m) => m.id !== mid) })),
      usarModelo: (mid) => {
        const m = useStore.getState().modelos.find((x) => x.id === mid)
        if (!m) return null
        const pid = id()
        const agora = Date.now()
        set((s) => ({
          projetos: [...s.projetos, { id: pid, titulo: m.titulo, chegada: m.chegada, criadoEm: agora }],
          passos: [...s.passos, ...m.passos.map((p, i) => ({ id: id(), projetoId: pid, texto: p.texto, energia: p.energia, ordem: i + 1, criadoEm: agora }))],
        }))
        return pid
      },

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

export { minutosDoPasso, pendentes } from './calculos'

export const checkInDeHoje = () => useStore.getState().checkins.find((c) => c.dia === hoje())
