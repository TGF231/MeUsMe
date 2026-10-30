/** Tamanhos do texto em Ajustes → Acessibilidade, em relação ao normal. */
export const TAMANHOS_TEXTO = [
  [1, 'Normal'],
  [1.15, 'Grande'],
  [1.3, 'Maior'],
  [1.5, 'Máximo'],
] as const

export type TamanhoTexto = (typeof TAMANHOS_TEXTO)[number][0]

/**
 * O tamanho seguinte (+1) ou anterior (-1), parando nas pontas. Um valor fora da lista (de uma versão antiga)
 * conta como o mais próximo.
 */
export function proximoTamanho(atual: number, direcao: 1 | -1): TamanhoTexto {
  const valores = TAMANHOS_TEXTO.map(([t]) => t)
  const i = valores.reduce((melhor, t, j) => (Math.abs(t - atual) < Math.abs(valores[melhor] - atual) ? j : melhor), 0)
  return valores[Math.min(valores.length - 1, Math.max(0, i + direcao))]
}
