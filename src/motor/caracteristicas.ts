import { lerData, lerDinheiro, lerHora } from './extratores.ts'

/**
 * Texto → vetor esparso de entrada da rede (docs/MOTOR.md, parte 2). O mesmo código serve
 * ao treino (scripts/motor-treinar.ts) e ao app: se fossem dois, qualquer diferença entre
 * eles estragaria a rede sem nenhum erro aparente.
 *
 * Mudou alguma coisa aqui? Suba VERSAO_CARACTERISTICAS e retreine (npm run motor:treinar).
 */

export const VERSAO_CARACTERISTICAS = 2

/** Posições do hashing: pedaços de letras e palavras caem numa destas. */
export const DIMENSAO_HASH = 2048

/** Marcas dos extratores, depois das posições do hashing. */
export const MARCAS = [
  'tem_hora',
  'tem_data',
  'tem_dinheiro',
  'dinheiro_entrada',
  'dinheiro_saida',
  'comeca_com_verbo',
  'tem_lembrar',
  'tem_quero',
  'curto',
  'medio',
  'longo',
] as const

export const DIMENSAO = DIMENSAO_HASH + MARCAS.length

export interface Esparso {
  indices: number[]
  valores: number[]
}

/** Minúsculas, sem acento, algarismos viram 0: "R$ 35" e "R$ 12" ficam parecidos para a rede. */
export function normalizarParaRede(texto: string) {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\d/g, '0')
    .replace(/\s+/g, ' ')
    .trim()
}

/** FNV-1a de 32 bits: rápido, sem dependência e igual em qualquer lugar. */
export function fnv1a(s: string) {
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

const palavrasDe = (normalizado: string) => normalizado.match(/[a-z0]+|[+$-]/g) ?? []

/** Os pedaços que viram posições: 3 e 4 letras de cada palavra (com bordas), palavras e pares. */
export function pedacos(texto: string): string[] {
  const palavras = palavrasDe(normalizarParaRede(texto))
  const lista: string[] = []
  for (const p of palavras) {
    lista.push(`p:${p}`)
    const comBorda = `<${p}>`
    for (const n of [3, 4]) for (let i = 0; i + n <= comBorda.length; i++) lista.push(`l:${comBorda.slice(i, i + n)}`)
  }
  for (let i = 0; i + 1 < palavras.length; i++) lista.push(`d:${palavras[i]}_${palavras[i + 1]}`)
  return lista
}

// Infinitivos e imperativos comuns no começo de tarefas: "ligar", "mandar", "compra".
const VERBO_NO_INICIO = /^(?:[a-z]+(?:ar|er|ir|or)|faz|faca|liga|manda|compra|paga|ve|vai)\b/

function marcas(texto: string): number[] {
  const n = normalizarParaRede(texto)
  const agora = new Date(2026, 0, 5, 12) // a data não importa aqui: só se há data, não qual
  const dinheiro = lerDinheiro(texto)
  const palavras = palavrasDe(n).filter((p) => /[a-z]/.test(p)).length
  const valores: Record<(typeof MARCAS)[number], boolean> = {
    tem_hora: !!lerHora(texto),
    tem_data: !!lerData(texto, agora),
    tem_dinheiro: !!dinheiro,
    dinheiro_entrada: dinheiro?.direcao === 'entrada',
    dinheiro_saida: dinheiro?.direcao === 'saida',
    comeca_com_verbo: VERBO_NO_INICIO.test(n),
    tem_lembrar: /\b(lembr|esquec)/.test(n),
    tem_quero: /\b(quero|queria|vontade|desejo)\b/.test(n),
    curto: palavras <= 2,
    medio: palavras >= 3 && palavras <= 5,
    longo: palavras > 5,
  }
  return MARCAS.map((m) => (valores[m] ? 1 : 0))
}

/**
 * O vetor da rede: hashing com sinal (metade dos pedaços soma, metade subtrai, para as colisões
 * se anularem em média), normalizado para comprimento 1, mais as marcas dos extratores.
 */
export function caracteristicas(texto: string): Esparso {
  const soma = new Map<number, number>()
  for (const p of pedacos(texto)) {
    const h = fnv1a(p)
    const i = h % DIMENSAO_HASH
    soma.set(i, (soma.get(i) ?? 0) + (h & 0x80000000 ? -1 : 1))
  }
  let norma = 0
  for (const v of soma.values()) norma += v * v
  norma = Math.sqrt(norma) || 1

  const indices: number[] = []
  const valores: number[] = []
  for (const [i, v] of [...soma].sort((a, b) => a[0] - b[0])) {
    if (v === 0) continue
    indices.push(i)
    valores.push(v / norma)
  }
  marcas(texto).forEach((v, j) => {
    if (v) {
      indices.push(DIMENSAO_HASH + j)
      valores.push(v)
    }
  })
  return { indices, valores }
}
