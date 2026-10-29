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
  /** O trecho que virou o valor ("-R$ 35"), mostrado no aviso como motivo. */
  trecho: string
}

// Dígitos com pontos e vírgulas no meio; quem decide o que é milhar e o que é centavo é o lerValor.
const NUMERO = String.raw`\d(?:[\d.,]*\d)?`
const SINAL = String.raw`(?:([+-])\s*|\b(mais|menos)\s+)?`
const MIL = String.raw`(\s+mil\b)?`

// Unidades que tiram o número do dinheiro: "-5 kg", "+2 min", "-10%".
const UNIDADE = String.raw`\s*(?:kg|g|mg|km|m|cm|mm|ml|l|min|h|hs|horas?|dias?|%|°|x)(?![\wÀ-ÿ])`

// Regra do tutorial: na captura livre, só é dinheiro o que tem sinal ou marca de moeda.
const COM_MOEDA = [
  // R$ 35 · -R$ 35 · menos R$ 35 · R$ 2 mil
  new RegExp(String.raw`${SINAL}r\$\s*(${NUMERO})${MIL}`, 'gi'),
  // 35 reais · +1000 reais · menos 35 reais · 2 mil reais
  new RegExp(String.raw`${SINAL}\b(${NUMERO})${MIL}\s*(?:reais|real)\b`, 'gi'),
  // 35,00 · -12,90 (vírgula com dois dígitos de centavos)
  new RegExp(String.raw`${SINAL}(?<![\d.,])(\d+(?:\.\d{3})*,\d{2})(?![\d,])`, 'gi'),
  // -35 · +1000 · +2 mil: o sinal colado no número basta, e fica no mesmo teclado dos números.
  // Não vale grudado em outra palavra ou número (99999-1234, 13-15h), solto como marcador de lista
  // ("- 2 pães"), com unidade (-5 kg) nem seguido de outro número (+55 11 98765-4321).
  // O grupo vazio () ocupa o lugar do "mais/menos" dos outros padrões.
  new RegExp(String.raw`(?<![\wÀ-ÿ])([+-])()(${NUMERO})${MIL}(?!${UNIDADE})(?!\s+\d)(?![\wÀ-ÿ])`, 'gi'),
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
    trecho: t.slice(a.inicio, a.fim).trim(),
  }
}

/** Posição de um trecho no texto, para tirá-lo do título e mostrá-lo como motivo. */
export interface Trecho {
  inicio: number
  fim: number
  trecho: string
}

// Fronteira de palavra que entende acentos (\b do JavaScript trata "à" como não-letra).
const ANTES = String.raw`(?<![\wÀ-ÿ])`
const DEPOIS = String.raw`(?![\wÀ-ÿ])`

function primeiro(texto: string, re: RegExp): (RegExpMatchArray & { index: number }) | null {
  const m = texto.match(re)
  return m && m.index !== undefined ? (m as RegExpMatchArray & { index: number }) : null
}

const trechoDe = (m: RegExpMatchArray & { index: number }): Trecho => ({ inicio: m.index, fim: m.index + m[0].length, trecho: m[0].trim() })

export interface Hora extends Trecho {
  h: number
  m: number
}

const PERIODO = String.raw`(?:\s+(da\s+manh[ãa]|da\s+tarde|da\s+noite))?`
const HORAS = [
  // meio-dia, meia-noite
  new RegExp(String.raw`${ANTES}(?:[àa]o?\s+)?(meio[- ]dia|meia[- ]noite)${DEPOIS}`, 'i'),
  // 13:00 · às 13:00 · 13:00h
  new RegExp(String.raw`${ANTES}(?:[àa]s\s+)?([01]?\d|2[0-3]):([0-5]\d)(?:\s*h(?:s|oras?)?)?${PERIODO}${DEPOIS}`, 'i'),
  // 13h · 13h30 · 13 horas · às 3h da tarde
  new RegExp(String.raw`${ANTES}(?:[àa]s\s+)?([01]?\d|2[0-3])\s*(?:h|hs|horas?)(?:\s*([0-5]\d))?${PERIODO}${DEPOIS}`, 'i'),
  // às 3 · às 3 da tarde. Sem acento ("as 3"), só com o período: "comprar as 3 camisas" não é hora.
  // O grupo vazio () ocupa o lugar dos minutos, para o período ficar no grupo 3 como nos outros.
  new RegExp(String.raw`${ANTES}(?:às|as(?=\s+\d{1,2}\s+da\s+(?:manh|tarde|noite)))\s+([01]?\d|2[0-3])()${PERIODO}(?![\wÀ-ÿ:,.])`, 'i'),
]

/** Lê uma hora: "13:00", "13h30", "às 3 da tarde", "meio-dia". */
export function lerHora(texto: string): Hora | null {
  for (const [i, re] of HORAS.entries()) {
    const m = primeiro(texto, re)
    if (!m) continue
    if (i === 0) return { ...trechoDe(m), h: /meio/i.test(m[1]) ? 12 : 0, m: 0 }
    let h = Number(m[1])
    const min = m[2] ? Number(m[2]) : 0
    const periodo = m[3]?.toLowerCase() ?? ''
    // "estudar 2h" é duração, não hora. Com "às", minutos ou período, é hora.
    if (i === 2 && !/^[àa]s\s/i.test(m[0]) && !m[2] && !periodo && h >= 1 && h <= 4) continue
    if (/tarde|noite/.test(periodo) && h < 12) h += 12
    // "às 3" sem período: ninguém marca dentista às 3 da madrugada. "3h" e "3:00" valem como escritos.
    else if (i === 3 && !periodo && h >= 1 && h <= 7) h += 12
    return { ...trechoDe(m), h, m: min }
  }
  return null
}

const DIAS_DA_SEMANA = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado']
const semAcento = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

export interface Data extends Trecho {
  /** Meia-noite do dia, no fuso do aparelho. */
  dia: Date
  /** Dia da semana: se a hora já passou hoje, vale a próxima semana. */
  semanal: boolean
}

const DATAS: [RegExp, (m: RegExpMatchArray, hoje: Date) => Date | null, boolean][] = [
  [new RegExp(String.raw`${ANTES}depois\s+de\s+amanh[ãa]${DEPOIS}`, 'i'), (_, h) => somarDias(h, 2), false],
  [new RegExp(String.raw`${ANTES}amanh[ãa]${DEPOIS}`, 'i'), (_, h) => somarDias(h, 1), false],
  [new RegExp(String.raw`${ANTES}hoje${DEPOIS}`, 'i'), (_, h) => h, false],
  [new RegExp(String.raw`${ANTES}(?:na\s+)?semana\s+que\s+vem${DEPOIS}`, 'i'), (_, h) => somarDias(h, (8 - h.getDay()) % 7 || 7), false],
  [
    new RegExp(
      String.raw`${ANTES}(?:(?:n[ao]|nest[ae]|ness[ae]|est[ae]|ess[ae]|pr[óo]xim[ao])\s+)?(segunda|ter[çc]a|quarta|quinta|sexta|s[áa]bado|domingo)(?:[- ]feira)?${DEPOIS}`,
      'i',
    ),
    (m, h) => somarDias(h, (DIAS_DA_SEMANA.indexOf(semAcento(m[1])) - h.getDay() + 7) % 7),
    true,
  ],
  [new RegExp(String.raw`${ANTES}(?:n?o\s+)?dia\s+(\d{1,2})(?![\d/])`, 'i'), (m, h) => diaDoMes(Number(m[1]), h), false],
  [new RegExp(String.raw`(?<![\d/])(\d{1,2})/(\d{1,2})(?:/(\d{2,4}))?(?![\d/])`), (m, h) => diaEMes(m, h), false],
]

function somarDias(d: Date, n: number) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)
}

/** "dia 15": este mês se ainda não passou; senão o próximo que tiver esse dia. */
function diaDoMes(n: number, hoje: Date) {
  if (n < 1 || n > 31) return null
  for (let i = n < hoje.getDate() ? 1 : 0; i < 3; i++) {
    const d = new Date(hoje.getFullYear(), hoje.getMonth() + i, n)
    if (d.getDate() === n) return d
  }
  return null
}

/** "15/11" ou "15/11/2026": sem ano, a próxima vez que a data acontece. */
function diaEMes(m: RegExpMatchArray, hoje: Date) {
  const [dia, mes] = [Number(m[1]), Number(m[2]) - 1]
  let ano = m[3] ? Number(m[3]) : hoje.getFullYear()
  if (ano < 100) ano += 2000
  let d = new Date(ano, mes, dia)
  if (d.getMonth() !== mes || d.getDate() !== dia) return null
  if (!m[3] && d < hoje) d = new Date(ano + 1, mes, dia)
  return d
}

/** Lê uma data relativa a `agora`: "amanhã", "sexta", "dia 15", "15/11". Fica com a que aparece primeiro. */
export function lerData(texto: string, agora: Date): Data | null {
  const hoje = somarDias(agora, 0)
  let melhor: Data | null = null
  for (const [re, resolver, semanal] of DATAS) {
    const m = primeiro(texto, re)
    if (!m || (melhor && m.index >= melhor.inicio)) continue
    const dia = resolver(m, hoje)
    if (dia) melhor = { ...trechoDe(m), dia, semanal }
  }
  return melhor
}

/**
 * Junta data e hora num instante. Só hora: hoje, ou amanhã se já passou. Só data: na hora
 * padrão, ou na próxima hora cheia se for hoje e ela já passou. Nenhuma das duas: null.
 */
export function resolverQuando(data: Data | null, hora: Hora | null, agora: Date, horaPadrao = 9): number | null {
  if (!data && !hora) return null
  const dia = data?.dia ?? somarDias(agora, 0)
  const em = (d: Date, h: number, m: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), h, m).getTime()
  if (hora) {
    let t = em(dia, hora.h, hora.m)
    if (t <= agora.getTime() && (!data || data.semanal)) t = em(somarDias(dia, data ? 7 : 1), hora.h, hora.m)
    return t
  }
  const t = em(dia, horaPadrao, 0)
  if (t > agora.getTime()) return t
  const proximaHora = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate(), agora.getHours() + 1)
  return dia.getTime() === somarDias(agora, 0).getTime() ? proximaHora.getTime() : t
}

const CONECTOR_NO_INICIO = /^(?:de|do|da|no|na|em|às|as|a|o|para|pra|que)\s+/i
const CONECTOR_NO_FIM = /\s+(?:às|as|a|o|no|na|de|do|da|em|para|pra|dia|com|e)$/i

/** O texto sem os trechos usados, sem conectores soltos nas pontas e com a primeira letra maiúscula. */
export function limparTitulo(texto: string, usados: (Trecho | null)[]): string {
  let t = texto
  for (const u of [...usados].filter((u): u is Trecho => !!u).sort((a, b) => b.inicio - a.inicio)) t = t.slice(0, u.inicio) + ' ' + t.slice(u.fim)
  t = t.replace(/\s+/g, ' ').trim()
  for (let antes = ''; antes !== t; ) {
    antes = t
    t = t.replace(/^[\s,;:.–-]+|[\s,;:.–-]+$/g, '').replace(CONECTOR_NO_INICIO, '').replace(CONECTOR_NO_FIM, '')
  }
  return t.charAt(0).toUpperCase() + t.slice(1)
}
