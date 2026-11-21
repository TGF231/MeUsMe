import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { armazenar } from '../armazenamento.ts'
import type { Contexto } from '../types'

interface Estado {
  /** Onde você está agora. null = tanto faz: todos os passos concorrem em Em ação. */
  atual: Contexto | null
  /** Quando você saiu de cada lugar: o que for anotado para ele depois disso aparece quando você voltar. */
  saiuEm: Partial<Record<Contexto, number>>
  /** Quando você chegou ao lugar atual: a lista da chegada vai até aqui. */
  chegouEm: number
  /** A lista da chegada já foi fechada neste lugar. */
  chegadaVista: boolean
  ir: (lugar: Contexto | null) => void
  verChegada: () => void
}

/**
 * Trabalho ou casa, escolhido em Em ação. Não sincroniza: cada aparelho sabe onde está (o celular vai junto, o PC do
 * trabalho fica no trabalho).
 */
export const useContexto = create<Estado>()(
  persist(
    (set) => ({
      atual: null,
      saiuEm: {},
      chegouEm: 0,
      chegadaVista: true,
      ir: (lugar) =>
        set((s) => {
          if (lugar === s.atual) return s
          const agora = Date.now()
          return {
            atual: lugar,
            saiuEm: s.atual ? { ...s.saiuEm, [s.atual]: agora } : s.saiuEm,
            chegouEm: agora,
            chegadaVista: false,
          }
        }),
      verChegada: () => set({ chegadaVista: true }),
    }),
    { name: 'meusme-contexto', storage: armazenar(), version: 1 },
  ),
)
