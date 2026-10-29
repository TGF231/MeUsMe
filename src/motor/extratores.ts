import { lerValor } from '../util.ts'

/**
 * Extratores do motor local (docs/MOTOR.md): leem do texto o que precisa ser exato,
 * como valor, hora e data. Funções puras, sem estado, testadas em testes/motor-extratores.test.ts.
 */

export type Direcao = 'saida' | 'entrada'

export interface Dinheiro {
  /** Centavos, sempre positivo; o sentido vem em `direcao`. */
  valor: number
  /** null quando o texto não diz se entrou ou saiu ("R$ 1000 tv"). */
  direcao: Direcao | null
  /** O resto do texto, sem o valor e sem o verbo de direção. */
  descricao: string
}

// Dígitos com pontos e vírgulas no meio; quem decide o que é milhar e o que é centavo é o lerValor.
const NUMERO = String.raw`\d(?:[\d.,]*\d)?`
const SINAL = String.raw`(?:([+-])\s*|\b(mais|menos)\s+)?`
const MIL = String.raw`(\s+mil\b)?`

// Regra do tutorial: na captura livre, só é dinheiro o que tem marca de moeda.
const COM_MOEDA = [
  // R$ 35 · -R$ 35 · menos R$ 35 · R$ 2 mil
  new RegExp(String.raw`${SINAL}r\$\s*(${NUMERO})${MIL}`, 'gi'),
  // 35 reais · +1000 reais · menos 35 reais · 2 mil reais
  new RegExp(String.raw`${SINAL}\b(${NUMERO})${MIL}\s*(?:reais|real)\b`, 'gi'),
  // 35,00 · -12,90 (vírgula com dois dígitos de centavos)
  new RegExp(String.raw`${SINAL}(?<![\d.,])(\d+(?:\.\d{3})*,\d{2})(?![\d,])`, 'gi'),
]

// Onde o campo já é de valor (lista de espera): número solto no começo ou no fim.
const SOLTO_INICIO = new RegExp(String.raw`^${SINAL}(${NUMERO})${MIL}(?=\s)`, 'i')
const SOLTO_FIM = new RegExp(String.raw`(?<=\s)${SINAL}(${NUMERO})${MIL}$`, 'i')

const VERBOS = /\b(vendi|recebi|ganhei|paguei|comprei|gastei)\b/gi
const ENTRADA = /\b(vendi|recebi|ganhei|entrou|caiu|sal[aá]rio|reembolso)\b/i
const SAIDA = /\b(paguei|comprei|gastei|conta de|mensalidade)\b/i
const CONECTOR_INICIAL = /^(?:de|do|da|dos|das|no|na|em|com|pelo|pela|pra|para|o|a)\s+/i

interface Achado {
  inicio: number
  fim: number
  sinal: string | undefined
  numero: string
  mil: boolean
}

function achados(texto: string, padroes: RegExp[]): Achado[] {
  const lista: Achado[] = []
  for (const re of padroes) {
    for (const m of texto.matchAll(re)) {
      const inicio = m.index
      const fim = inicio + m[0].length
      // Os padrões se sobrepõem ("R$ 35,00" casa com o primeiro e o terceiro): fica o primeiro.
      if (lista.some((a) => inicio < a.fim && fim > a.inicio)) continue
      lista.push({ inicio, fim, sinal: m[1] ?? m[2], numero: m[3], mil: !!m[4] })
    }
  }
  return lista
}

function soltos(texto: string): Achado[] {
  for (const re of [SOLTO_INICIO, SOLTO_FIM]) {
    const m = texto.match(re)
    if (m?.index !== undefined) return [{ inicio: m.index, fim: m.index + m[0].length, sinal: m[1] ?? m[2], numero: m[3], mil: !!m[4] }]
  }
  return []
}

function direcaoDe(sinal: string | undefined, texto: string): Direcao | null {
  if (sinal === '+' || sinal?.toLowerCase() === 'mais') return 'entrada'
  if (sinal === '-' || sinal?.toLowerCase() === 'menos') return 'saida'
  const entrada = ENTRADA.test(texto)
  const saida = SAIDA.test(texto)
  if (entrada === saida) return null
  return entrada ? 'entrada' : 'saida'
}

function limparDescricao(texto: string) {
  let t = texto.replace(VERBOS, ' ').replace(/\s+/g, ' ').trim()
  t = t.replace(/^[\s,;:.–-]+|[\s,;:.–-]+$/g, '')
  while (CONECTOR_INICIAL.test(t)) t = t.replace(CONECTOR_INICIAL, '')
  return t
}

/**
 * Lê um valor em dinheiro. Na captura livre (`exigirMoeda`, o padrão) só conta o que tem
 * "R$", "reais" ou vírgula de centavos: "35 almoço" não é dinheiro, "dentista 13:00" também não.
 * Com mais de um valor no texto, devolve null: o motor não escolhe por você.
 */
export function lerDinheiro(texto: string, { exigirMoeda = true } = {}): Dinheiro | null {
  const t = texto.trim()
  let lista = achados(t, COM_MOEDA)
  if (lista.length === 0 && !exigirMoeda) lista = soltos(t)
  if (lista.length !== 1) return null

  const a = lista[0]
  const centavos = lerValor(a.numero)
  if (!centavos || centavos <= 0) return null

  return {
    valor: a.mil ? centavos * 1000 : centavos,
    direcao: direcaoDe(a.sinal, t),
    descricao: limparDescricao(t.slice(0, a.inicio) + ' ' + t.slice(a.fim)),
  }
}
