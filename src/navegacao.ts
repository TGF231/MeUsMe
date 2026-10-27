import { create } from 'zustand'

export type Aba = 'agora' | 'agenda' | 'caixa' | 'financas' | 'projetos' | 'historico' | 'ajustes'

/** Aba aberta (não persiste: o app sempre abre em Agora). Telas usam `ir` para levar a outra aba. */
export const useNavegacao = create<{ aba: Aba; projetoAberto: string | null; ir: (aba: Aba, projetoId?: string) => void }>()(
  (set) => ({
    aba: 'agora',
    projetoAberto: null,
    ir: (aba, projetoId) => set({ aba, projetoAberto: projetoId ?? null }),
  }),
)
