export const pad = (n: number) => String(n).padStart(2, '0')

/** crypto.randomUUID exige contexto seguro (HTTPS/localhost); fallback para acesso via IP na rede local. */
export const novoId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`

/** AAAA-MM-DD no fuso local. */
export const dataISO = (d: Date | number = new Date()) => {
  const x = new Date(d)
  return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}`
}

export const hoje = () => dataISO()

/** AAAA-MM */
export const mesISO = (d: Date | number = new Date()) => dataISO(d).slice(0, 7)

export const inicioDoDia = (d: Date | number = new Date()) => new Date(d).setHours(0, 0, 0, 0)

export const diasNoMes = (mes: string) => {
  const [a, m] = mes.split('-').map(Number)
  return new Date(a, m, 0).getDate()
}

/** Converte "AAAA-MM-DD" + "HH:MM" para milissegundos no fuso local. */
export const juntarDataHora = (data: string, horaTexto: string) => {
  const [a, m, d] = data.split('-').map(Number)
  const [h, min] = horaTexto.split(':').map(Number)
  return new Date(a, m - 1, d, h, min).getTime()
}

export const hora = (ms: number) => new Date(ms).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

export const horaInput = (ms: number) => {
  const d = new Date(ms)
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export const duracao = (minutos: number) => {
  const m = Math.max(0, Math.round(minutos))
  if (m < 60) return `${m} min`
  return `${Math.floor(m / 60)}h${m % 60 ? pad(m % 60) : ''}`
}

export const nomeDoDia = (data: string) => {
  if (data === hoje()) return 'Hoje'
  if (data === dataISO(Date.now() + 86_400_000)) return 'Amanhã'
  return new Date(`${data}T12:00:00`).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })
}

const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

/** Formata centavos como moeda (BRL). */
export const reais = (centavos: number) => moeda.format(centavos / 100)

/**
 * Converte texto em centavos, aceitando formatos BR e US: "35", "35,5", "1.234,56", "R$ 1234.56", "-20".
 * Retorna null se não houver número.
 */
export function lerValor(texto: string): number | null {
  let t = texto.replace(/r\$|\s/gi, '')
  const negativo = t.startsWith('-')
  t = t.replace(/[^\d.,]/g, '')
  if (!t) return null
  const ultimoPonto = t.lastIndexOf('.')
  const ultimaVirgula = t.lastIndexOf(',')
  let decimal: ',' | '.' | null = null
  if (ultimoPonto >= 0 && ultimaVirgula >= 0) decimal = ultimoPonto > ultimaVirgula ? '.' : ','
  else if (ultimaVirgula >= 0) decimal = ','
  else if (ultimoPonto >= 0) decimal = t.length - ultimoPonto - 1 === 3 ? null : '.'
  const milhar = decimal === ',' ? '.' : decimal === '.' ? ',' : /[.,]/g
  const limpo = t.replaceAll(milhar, '').replace(',', '.')
  const n = Number(limpo)
  if (!Number.isFinite(n)) return null
  return Math.round(n * 100) * (negativo ? -1 : 1)
}

export function baixarArquivo(nome: string, conteudo: string, tipo = 'application/json') {
  const url = URL.createObjectURL(new Blob([conteudo], { type: tipo }))
  const a = document.createElement('a')
  a.href = url
  a.download = nome
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
