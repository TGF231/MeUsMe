import type { LinhaExtrato } from './csv.ts'

/**
 * Leitor de extrato OFX (V27 em docs/CONCORRENTES.md): o formato que quase todo banco exporta, e um caminho que
 * não depende de notificação nem de Open Finance. Entende o OFX 1.x (SGML, tags sem fechamento, o mais comum nos
 * bancos brasileiros) e o 2.x (XML).
 */

const ENTIDADES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" }

/** Valor de uma tag: em SGML ela vai até a próxima tag ou o fim da linha; em XML, até o fechamento. */
const tag = (bloco: string, nome: string) =>
  (bloco.match(new RegExp(`<${nome}>([^<\\r\\n]*)`, 'i'))?.[1] ?? '').trim().replace(/&(amp|lt|gt|quot|apos);/g, (_, e: string) => ENTIDADES[e])

export const pareceOFX = (texto: string) => /OFXHEADER|<OFX>/i.test(texto.slice(0, 2000))

/** "20261031120000[-3:BRT]" → "2026-10-31". */
function lerDataOFX(t: string) {
  const m = t.match(/^(\d{4})(\d{2})(\d{2})/)
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null
}

/** "-35.00", "-35,00" ou "1234.5" → centavos. Alguns bancos usam vírgula decimal, o que o padrão não prevê. */
function lerValorOFX(t: string) {
  const limpo = t.replace(/\s/g, '')
  if (!/^[+-]?\d+([.,]\d+)?$/.test(limpo)) return null
  return Math.round(Number(limpo.replace(',', '.')) * 100)
}

export function lerOFX(texto: string, contaId: string): { ok: LinhaExtrato[]; ignoradas: number } {
  // A conta do arquivo entra na chave: o mesmo FITID pode existir em contas diferentes.
  const conta = tag(texto, 'ACCTID') || contaId
  const ok: LinhaExtrato[] = []
  let ignoradas = 0
  const repeticoes = new Map<string, number>()
  for (const bruto of texto.split(/<STMTTRN>/i).slice(1)) {
    const bloco = bruto.split(/<\/STMTTRN>/i)[0]
    const data = lerDataOFX(tag(bloco, 'DTPOSTED'))
    const valor = lerValorOFX(tag(bloco, 'TRNAMT'))
    if (!data || valor === null || valor === 0) {
      ignoradas++
      continue
    }
    const descricao = tag(bloco, 'MEMO') || tag(bloco, 'NAME') || '(sem descrição)'
    const fitid = tag(bloco, 'FITID')
    // Sem FITID, a chave segue a do CSV: o contador separa lançamentos idênticos no mesmo dia.
    const base = fitid ? `ofx:${conta}:${fitid}` : `${contaId}|${data}|${valor}|${descricao.toLowerCase()}`
    const n = (repeticoes.get(base) ?? 0) + 1
    repeticoes.set(base, n)
    ok.push({ data, valor, descricao, chave: fitid && n === 1 ? base : `${base}|${n}` })
  }
  return { ok, ignoradas }
}
