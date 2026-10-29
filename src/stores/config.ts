import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface Estado {
  /** "HH:MM" ou vazio para desligar. */
  horaCheckIn: string
  horaContas: string
  minutosAntesEvento: number
  /** Minutos de sessão até o aviso de pausa (0 desliga). */
  avisoFocoMin: number
  /** Avisos já disparados (chave: timestamp), para não repetir. */
  disparados: Record<string, number>
  /** 'auto' segue o sistema. Não sincroniza (preferência por aparelho). */
  tema: 'auto' | 'claro' | 'escuro'
  /** Id de acento predefinido (tema/cores.ts) ou cor livre "#RRGGBB". Sincroniza. */
  acento: string
  /** Introdução vista neste aparelho. Não sincroniza. */
  introducaoVista: boolean
  /** Dia da revisão semanal (0 = domingo … 6 = sábado; -1 desliga). Sincroniza. */
  diaRevisao: number
  /** Quando a última revisão semanal foi feita ou pulada. Sincroniza. */
  revisaoFeitaEm: number
  /** Horas de espera antes de decidir uma compra da lista de espera. Sincroniza. */
  horasDeEspera: number
  /** O motor cria compromissos, lembretes e lançamentos sozinho (docs/MOTOR.md). Sincroniza. */
  organizarSozinho: boolean
  /** Tutorial "Como escrever rápido" visto neste aparelho. Não sincroniza. */
  tutorialCapturaVisto: boolean

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
      introducaoVista: false,
      diaRevisao: 0,
      revisaoFeitaEm: 0,
      horasDeEspera: 48,
      organizarSozinho: true,
      tutorialCapturaVisto: false,

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

/** Avisos exibidos dentro do app. Não persistidos. */
interface Aviso extends OpcoesAviso {
  id: number
  titulo: string
  corpo: string
}

export interface OpcoesAviso {
  /** Trecho do corpo mostrado em negrito (o motivo de uma regra do motor). */
  destaque?: string
  /** Um botão no aviso, como Desfazer. Tocar fecha o aviso. */
  acao?: { rotulo: string; fazer: () => void }
}

export const useAvisos = create<{ avisos: Aviso[]; mostrar: (t: string, c: string, o?: OpcoesAviso) => void; fechar: (id: number) => void }>()(
  (set) => ({
    avisos: [],
    mostrar: (titulo, corpo, opcoes) => {
      const id = Date.now() + Math.random()
      set((s) => ({ avisos: [...s.avisos, { id, titulo, corpo, ...opcoes }] }))
      setTimeout(() => set((s) => ({ avisos: s.avisos.filter((a) => a.id !== id) })), 12_000)
    },
    fechar: (id) => set((s) => ({ avisos: s.avisos.filter((a) => a.id !== id) })),
  }),
)
