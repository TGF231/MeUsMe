import { lerValor } from './util'

/** Parser de CSV com suporte a aspas; detecta separador vírgula ou ponto e vírgula. */
export function lerCSV(texto: string): string[][] {
  const limpo = texto.replace(/^\uFEFF/, '')
  const primeira = limpo.split(/\r?\n/, 1)[0]
  const sep = (primeira.match(/;/g)?.length ?? 0) > (primeira.match(/,/g)?.length ?? 0) ? ';' : ','
  const linhas: string[][] = []
  let linha: string[] = []
  let campo = ''
  let aspas = false
  for (let i = 0; i < limpo.length; i++) {
    const c = limpo[i]
    if (aspas) {
      if (c === '"' && limpo[i + 1] === '"') {
        campo += '"'
        i++
      } else if (c === '"') aspas = false
      else campo += c
    } else if (c === '"') aspas = true
    else if (c === sep) {
      linha.push(campo.trim())
      campo = ''
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && limpo[i + 1] === '\n') i++
      linha.push(campo.trim())
      if (linha.some((x) => x)) linhas.push(linha)
      linha = []
      campo = ''
    } else campo += c
  }
  linha.push(campo.trim())
  if (linha.some((x) => x)) linhas.push(linha)
  return linhas
}

export interface Colunas {
  data: number
  valor: number
  descricao: number
}

/** Mapeia cabeçalhos conhecidos (Nubank, Inter, Wallet) para data, valor e descrição. */
export function detectarColunas(cabecalho: string[]): Colunas | null {
  const h = cabecalho.map((c) => c.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''))
  const achar = (re: RegExp) => h.findIndex((c) => re.test(c))
  const data = achar(/^(data|date)|data (da )?(transacao|lancamento|compra)/)
  const valor = achar(/^(valor|amount|quantia)|valor/)
  let descricao = achar(/descri|title|titulo|historico|memo|estabelecimento|note|nota/)
  if (descricao < 0) descricao = achar(/identificador|payee/)
  if (data < 0 || valor < 0 || descricao < 0) return null
  return { data, valor, descricao }
}

export function lerData(texto: string): string | null {
  const t = texto.trim()
  let m = t.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (m) return `${m[1]}-${m[2]}-${m[3]}`
  m = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/)
  if (m) {
    const ano = m[3].length === 2 ? `20${m[3]}` : m[3]
    return `${ano}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`
  }
  return null
}

export interface LinhaExtrato {
  data: string
  valor: number
  descricao: string
  chave: string
}

export function converterExtrato(linhas: string[][], colunas: Colunas, inverter: boolean, contaId: string) {
  const ok: LinhaExtrato[] = []
  let ignoradas = 0
  const repeticoes = new Map<string, number>()
  for (const l of linhas) {
    const data = lerData(l[colunas.data] ?? '')
    const valor = lerValor(l[colunas.valor] ?? '')
    const descricao = (l[colunas.descricao] ?? '').trim()
    if (!data || valor === null || valor === 0) {
      ignoradas++
      continue
    }
    // O contador distingue lançamentos idênticos no mesmo dia e mantém a chave estável entre importações.
    const base = `${contaId}|${data}|${valor}|${descricao.toLowerCase()}`
    const n = (repeticoes.get(base) ?? 0) + 1
    repeticoes.set(base, n)
    ok.push({ data, valor: inverter ? -valor : valor, descricao: descricao || '(sem descrição)', chave: `${base}|${n}` })
  }
  return { ok, ignoradas }
}
