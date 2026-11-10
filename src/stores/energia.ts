import { create } from 'zustand'
import type { Energia } from '../types'

/**
 * A energia escolhida agora, dividida entre Próximo passo e Planejar (montar o dia usa a mesma). Não persiste: ao
 * abrir o app, vale a do check-in de hoje, ou média.
 */
export const useEnergiaEscolhida = create<{ energia: Energia | null; escolher: (e: Energia) => void }>()((set) => ({
  energia: null,
  escolher: (energia) => set({ energia }),
}))
