import type { CheckIn, Energia } from './types'

export const NOMES_ENERGIA: Record<Energia, string> = { 1: 'Baixa', 2: 'Média', 3: 'Alta' }

export const HUMORES: Record<CheckIn['humor'], string> = {
  1: 'Péssimo',
  2: 'Ruim',
  3: 'Ok',
  4: 'Bem',
  5: 'Ótimo',
}
