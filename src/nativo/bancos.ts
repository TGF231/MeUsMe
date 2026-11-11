import { lerValor } from '../util.ts'

/** Pacotes Android lidos por padrão (editável em Finanças > Bancos). */
export const BANCOS: Record<string, string> = {
  'com.nu.production': 'Nubank',
  'br.com.intermedium': 'Inter',
  'com.mercadopago.wallet': 'Mercado Pago',
  'com.picpay': 'PicPay',
  'br.com.bradesco.next': 'Next',
}

/**
 * O que uma notificação de banco pode ser:
 * - movimento: dinheiro que saiu ou entrou (compra, Pix, pagamento, estorno);
 * - reserva: dinheiro guardado ou resgatado de cofrinho, caixinha ou porquinho. Não é gasto nem receita: muda de
 *   lugar. No resgate o valor pode ser maior que o guardado, e a diferença é rendimento (ver `dividirResgate`);
 * - ignorar: não é movimentação e não pede decisão (propaganda com valor, compra recusada, limite, saldo).
 * `null` é o que sobra: tem valor, mas não dá para saber o que houve. O chamador manda para Em espera.
 */
export type NotificacaoLida =
  | { tipo: 'movimento'; /** Centavos; negativo para saída. */ valor: number; descricao: string; cartao: boolean }
  | { tipo: 'reserva'; /** Centavos; negativo ao guardar, positivo ao resgatar. */ valor: number; descricao: string }
  | { tipo: 'ignorar'; motivo: 'propaganda' | 'recusada' | 'informativo' }

// "R$ 35,90", "R$ 1.234,56" e também "R$ 50", sem centavos, como o Mercado Pago e o PicPay escrevem.
const DINHEIRO = /R\$\s?(\d{1,3}(?:\.\d{3})+(?:,\d{2})?|\d+(?:,\d{2})?)/i

// A compra não aconteceu: nada a registrar.
const RECUSADA =
  /recusad|negad|n[aã]o (foi )?(autorizad|aprovad|conclu[ií]d|realizad|efetuad|processad)|n[aã]o conseguimos|n[aã]o foi poss[ií]vel|falhou|tentativa de (compra|pagamento)|bloquead|suspeit/i

// Cofrinho (Mercado Pago, PicPay), Caixinha (Nubank), Porquinho (Inter) e Reservas (Mercado Pago).
const COFRE = /cofrinho|caixinha|porquinho|\breservas?\b/i
const GUARDOU = /guardou|guardad[oa]|reservou|reservad[oa]|aplicou|aplicad[oa]|depositou|adicionou|dinheiro guardado|dep[oó]sito (realizado|feito|conclu)/i
const RESGATOU = /resgatou|resgatad[oa]|resgate\b.{0,40}\b(realizad|conclu|feito|efetuad|aprovad)|retirou|retirad[oa]|retirada\b.{0,40}\b(realizad|conclu|feita)|sacou/i
const NOME_DO_COFRE = /\b(cofrinho|caixinha|porquinho|reserva)\s+(?:d[eo]\s+)?(.+?)(?=\s+(?:foi|j[aá]|est[aá]|com sucesso)\b|[.;,!]|$)/i

// Movimentação confirmada, no passado: vence qualquer frase de venda que venha junto na mesma notificação.
const SAIU =
  /compra\b.{0,80}\b(aprovad|realizad|efetuad|confirmad)|(aprovad|realizad|efetuad)a?\b.{0,40}\bcompra|voc[eê] (pagou|comprou|enviou|transferiu|sacou|fez (um|uma) (pix|transfer|pagamento|compra))|pagamento\b.{0,80}\b(aprovad|realizad|efetuad|confirmad|enviad)|pix (enviado|realizado|feito)|transfer[eê]ncia\b.{0,40}\b(enviad|realizad|feita|efetuad)|d[eé]bito\b.{0,40}\b(realizad|efetuad|aprovad)|debitad|saque\b.{0,30}\b(realizad|efetuad)/i
const ENTROU =
  /voc[eê] recebeu|recebeu (um|uma) (pix|transfer|pagamento|dep)|(pix|transfer[eê]ncia|pagamento|dep[oó]sito|ted|doc)\b.{0,30}\brecebid|(entrou|caiu) na (sua )?conta|creditad|estorn|reembols|devolu[cç][aã]o/i
// "Você recebeu" seguido de algo que não é dinheiro na conta: é oferta.
const PREMIO =
  /(recebeu|ganhou|tem|conquistou|liberamos|liberou)\b.{0,50}\b(cupom|cupons|desconto|oferta|convite|proposta|limite|cr[eé]dito (pr[eé]|dispon|liberad|aprovad)|voucher|vale[- ]|pontos|milhas|b[oô]nus|chance)/i

// Fatura do cartão: fechar, vencer e pagar não são gasto (as compras já foram contadas uma a uma).
const FATURA = /fatura/i
// Avisos que pedem atenção, mas não são movimentação: seguem para Em espera, como antes.
const AVISO = /vencimento|vence |agendad|boleto (dispon|gerado)|cobran[cç]a|pediu|solicitou/i
// Informação sem decisão a tomar.
const INFORMATIVO = /limite|saldo|rendeu|rendimento|rendendo/i
// Frases de venda. Só valem quando não há movimentação confirmada na mesma notificação.
const PROPAGANDA =
  /\bat[eé]\s+R\$|a partir de|por apenas|por s[oó]\b|\d\s?% ?(off|de desconto|do cdi)|\boff\b|cupom|cupons|desconto|cashback|ganhe|ganhar|garanta|aproveite|concorra|sorteio|indique|convide|oferta|promo[cç][aã]o|imperd[ií]vel|exclusiv|pr[eé]-aprovad|empr[eé]stimo|cr[eé]dito (dispon|pessoal|liberad)|simule|contrate|pe[cç]a (j[aá]|o seu|agora)|conhe[cç]a|que tal|sabia que|[uú]ltimos dias|s[oó] hoje|frete gr[aá]tis|parcel|\d+x\b|sem juros|anuidade|seguro|cons[oó]rcio|invista|investir|renda extra|black friday|antecipe|saque-anivers[aá]rio|portabilidade|traga seu sal[aá]rio|pode ser seu|economize|guarde|comece a|abra (sua|seu|j[aá])|assine|experimente|novidade|chegou/i

// Sem frase confirmada: palavras soltas de direção, como antes.
const ENTRADA_SOLTA = /receb|entrou|dep[oó]sito/i
const SAIDA_SOLTA = /compra|pagamento|pagou|\bpago\b|enviou|enviad|d[eé]bito|saque/i

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

const maiuscula = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()

/**
 * Interpreta uma notificação bancária. A ordem importa: recusada, cofrinho, fatura, movimentação confirmada,
 * propaganda e, por último, as palavras soltas. Retorna null quando há valor mas não dá para saber o que houve.
 */
export function lerNotificacao(titulo: string, texto: string): NotificacaoLida | null {
  const tudo = `${titulo}. ${texto}`
  const m = tudo.match(DINHEIRO)
  if (!m) return null
  const centavos = lerValor(m[1])
  if (!centavos) return null

  if (RECUSADA.test(tudo)) return { tipo: 'ignorar', motivo: 'recusada' }

  if (COFRE.test(tudo)) {
    const resgate = RESGATOU.test(tudo)
    if (resgate || GUARDOU.test(tudo)) {
      const nome = tudo.match(NOME_DO_COFRE)
      const cofre = nome && limpar(nome[2]).length >= 2 ? `${maiuscula(nome[1])} ${limpar(nome[2])}` : maiuscula(tudo.match(COFRE)![0])
      return { tipo: 'reserva', valor: resgate ? centavos : -centavos, descricao: `${resgate ? 'Resgate' : 'Guardado'}: ${cofre}`.slice(0, 60) }
    }
  }

  const saiu = SAIU.test(tudo)
  const entrou = !PREMIO.test(tudo) && ENTROU.test(tudo)
  // Compra aprovada que cita a fatura ("entra na próxima fatura") ainda é compra; o resto sobre fatura não é.
  if (FATURA.test(tudo) && !/compra\b.{0,80}\baprovad/i.test(tudo))
    // Fatura paga é dinheiro indo da conta para o cartão: nada a decidir. Fechou ou vai vencer: segue para Em espera.
    return /pagamento|\bpag[ao]\b|pagou|recebemos/i.test(tudo) ? { tipo: 'ignorar', motivo: 'informativo' } : null

  if (!saiu && !entrou) {
    if (PREMIO.test(tudo) || PROPAGANDA.test(tudo)) return { tipo: 'ignorar', motivo: 'propaganda' }
    if (AVISO.test(tudo)) return null
    if (INFORMATIVO.test(tudo)) return { tipo: 'ignorar', motivo: 'informativo' }
  }
  const entrada = entrou || (!saiu && ENTRADA_SOLTA.test(tudo))
  if (!entrada && !saiu && !SAIDA_SOLTA.test(tudo)) return null

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
    tipo: 'movimento',
    valor: entrada ? centavos : -centavos,
    descricao: descricao || limpar(titulo) || 'Movimentação',
    cartao: /cart[aã]o|cr[eé]dito/i.test(tudo) && !/d[eé]bito/i.test(tudo),
  }
}

/**
 * Resgate de cofrinho: o que volta até o total guardado é só o dinheiro mudando de lugar; o que passa disso é
 * rendimento. `guardado` é o que as notificações anteriores registraram como guardado e ainda não resgatado. Sem
 * histórico (0), não há como saber o que é lucro: tudo conta como dinheiro voltando.
 */
export function dividirResgate(guardado: number, resgate: number): { principal: number; rendimento: number } {
  if (guardado <= 0 || resgate <= guardado) return { principal: resgate, rendimento: 0 }
  return { principal: guardado, rendimento: resgate - guardado }
}
