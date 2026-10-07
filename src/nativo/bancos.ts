import { lerValor } from '../util.ts'

/** Pacotes Android lidos por padrão (editável em Finanças > Bancos). */
export const BANCOS: Record<string, string> = {
  'com.nu.production': 'Nubank',
  'br.com.intermedium': 'Inter',
  'com.mercadopago.wallet': 'Mercado Pago',
  'com.picpay': 'PicPay',
  'br.com.bradesco.next': 'Next',
}

export interface NotificacaoLida {
  /** Centavos; negativo para saída. */
  valor: number
  descricao: string
  cartao: boolean
}

const DINHEIRO = /R\$\s?([\d.]+,\d{2})/i
// Notificações com valor que não representam movimentação (fatura, limite, saldo, ofertas).
const INFORMATIVO =
  /fatura|limite|saldo|vencimento|vence |agendad|cashback dispon|oferta|empr[eé]stimo|rendeu|rendimento|parcel(as|amento) dispon|pr[eé]-aprovad|proposta|boleto (dispon|gerado)/i
const ENTRADA = /receb|entrou|creditad|dep[oó]sito|estorno|devolu|reembols|caiu na (sua )?conta/i
const SAIDA = /compra|pagamento|pagou|\bpago\b|enviou|enviad|transfer[eê]ncia (realizada|feita)|d[eé]bito|debitad|saque|pix (realizado|feito)/i

// Padrões para extrair estabelecimento ou contraparte, aplicados ao texto após o valor.
const ALVOS = [
  /\bem\s+(.+?)(?=\s+(?:para o|no|com o|pelo) cart|\s+[àa]s?\s+\d|\s+foi\b|[.;,!]|$)/i,
  /\bpara\s+(?!o cart)(.+?)(?=\s+foi\b|\s+com sucesso|[.;,!]|$)/i,
  /\bde\s+(?!R\$)(.+?)(?=\s+foi\b|\s+na sua|[.;,!]|$)/i,
  /\b(?:a|à|ao)\s+(.+?)(?=[.;,!]|$)/i,
]

const limpar = (s: string) =>
  s
    .replace(/\s+/g, ' ')
    .replace(/\s*(com final|final)\s*\d+.*$/i, '')
    .replace(/\s+(aprovad[ao]|realizad[ao]|confirmad[ao]|efetuad[ao])\b.*$/i, '')
    .trim()
    .slice(0, 60)

/**
 * Interpreta uma notificação bancária. Retorna null quando valor ou direção são ambíguos;
 * nesse caso o chamador envia o texto para a Caixa.
 */
export function lerNotificacao(titulo: string, texto: string): NotificacaoLida | null {
  const tudo = `${titulo}. ${texto}`
  const m = tudo.match(DINHEIRO)
  if (!m || INFORMATIVO.test(tudo)) return null
  const centavos = lerValor(m[1])
  if (!centavos) return null

  const entrada = ENTRADA.test(tudo)
  if (!entrada && !SAIDA.test(tudo)) return null

  const depoisDoValor = tudo.slice(tudo.indexOf(m[0]) + m[0].length)
  let descricao = ''
  for (const re of ALVOS) {
    const a = depoisDoValor.match(re) ?? texto.match(re)
    if (a && limpar(a[1]).length >= 2) {
      descricao = limpar(a[1])
      break
    }
  }

  return {
    valor: entrada ? centavos : -centavos,
    descricao: descricao || limpar(titulo) || 'Movimentação',
    cartao: /cart[aã]o|cr[eé]dito/i.test(tudo) && !/d[eé]bito/i.test(tudo),
  }
}
