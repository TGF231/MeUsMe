import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface Estado {
  /** "HH:MM" ou vazio para desligar. */
  horaCheckIn: string
  horaContas: string
  minutosAntesEvento: number
  /** Depois de quantos minutos no mesmo passo o app pergunta se você quer pausar. */
  avisoFocoMin: number
  /** Chaves de avisos já disparados → quando, para não repetir. */
  disparados: Record<string, number>
  /** Claro, escuro ou o que o sistema estiver usando. Vale só para este aparelho. */
  tema: 'auto' | 'claro' | 'escuro'
  /** Id de um acento pronto (src/tema/cores.ts) ou uma cor livre "#RRGGBB". Sincroniza entre aparelhos. */
  acento: string

  ajustar: (m: Partial<Omit<Estado, 'ajustar' | 'marcarDisparado'>>) => void
  marcarDisparado: (chave: string) => void
}

const SETE_DIAS = 7 * 86_400_000

export const useConfig = create<Estado>()(
  persist(
    (set) => ({
      horaCheckIn: '21:00',
      horaContas: '09:00',
      minutosAntesEvento: 10,
      avisoFocoMin: 25,
      disparados: {},
      tema: 'auto',
      acento: 'assinatura',

      ajustar: (m) => set(m),
      marcarDisparado: (chave) =>
        set((s) => {
          const agora = Date.now()
          const disparados = Object.fromEntries(Object.entries(s.disparados).filter(([, t]) => agora - t < SETE_DIAS))
          disparados[chave] = agora
          return { disparados }
        }),
    }),
    { name: 'meusme-config', version: 1 },
  ),
)

/** Avisos dentro do app (aparecem quando o app está aberto e em uso). Não são persistidos. */
interface Aviso {
  id: number
  titulo: string
  corpo: string
}

export const useAvisos = create<{ avisos: Aviso[]; mostrar: (t: string, c: string) => void; fechar: (id: number) => void }>()(
  (set) => ({
    avisos: [],
    mostrar: (titulo, corpo) => {
      const id = Date.now() + Math.random()
      set((s) => ({ avisos: [...s.avisos, { id, titulo, corpo }] }))
      setTimeout(() => set((s) => ({ avisos: s.avisos.filter((a) => a.id !== id) })), 12_000)
    },
    fechar: (id) => set((s) => ({ avisos: s.avisos.filter((a) => a.id !== id) })),
  }),
)
