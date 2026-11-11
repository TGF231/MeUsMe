import assert from 'node:assert/strict'
import { test } from 'node:test'
import { dividirResgate, lerNotificacao } from '../src/nativo/bancos.ts'

type Esperado = { valor: number; descricao?: string; cartao?: boolean; reserva?: true } | 'propaganda' | 'recusada' | 'informativo' | null

// Formatos típicos de notificação; os textos reais podem variar por banco e mudam com o tempo.
const casos: [string, string, string, Esperado][] = [
  // Movimentações
  ['Nubank: compra no crédito', 'Compra aprovada', 'Compra de R$ 35,90 APROVADA em IFOOD *RESTAURANTE para o cartão com final 1234.', { valor: -3590, descricao: 'IFOOD *RESTAURANTE', cartao: true }],
  ['Nubank: Pix recebido', 'Transferência recebida', 'Você recebeu uma transferência de R$ 150,00 de Maria Silva.', { valor: 15000, descricao: 'Maria Silva' }],
  ['Inter: compra', 'Compra aprovada', 'Compra de R$ 1.234,56 aprovada no cartão final 9876 em MAGAZINE LUIZA.', { valor: -123456, descricao: 'MAGAZINE LUIZA', cartao: true }],
  ['Inter: Pix enviado', 'Pix enviado', 'Você enviou um Pix de R$ 50,00 para João Souza.', { valor: -5000, descricao: 'João Souza' }],
  ['Mercado Pago: pagamento', 'Pagamento aprovado', 'Você pagou R$ 27,50 a Padaria Pão Quente.', { valor: -2750, descricao: 'Padaria Pão Quente' }],
  ['Mercado Pago: valor sem centavos', 'Você recebeu dinheiro', 'Você recebeu R$ 50 de Ana Lima.', { valor: 5000, descricao: 'Ana Lima' }],
  ['PicPay: recebido', 'Você recebeu dinheiro', 'Você recebeu R$ 20,00 de @fulano.', { valor: 2000, descricao: '@fulano' }],
  ['Next: compra', 'Compra aprovada', 'Compra no crédito de R$ 89,90 em DROGASIL aprovada.', { valor: -8990, descricao: 'DROGASIL', cartao: true }],
  ['compra com venda junto ainda é compra', 'Compra aprovada', 'Compra de R$ 500,00 APROVADA em LOJA X para o cartão com final 1234. Parcele essa compra em até 12x.', { valor: -50000, descricao: 'LOJA X', cartao: true }],
  ['compra com o limite junto ainda é compra', 'Compra aprovada', 'Compra de R$ 80,00 aprovada em POSTO BR. Limite disponível: R$ 1.200,00.', { valor: -8000, descricao: 'POSTO BR' }],
  ['cashback que caiu é entrada', 'Cashback', 'Você recebeu R$ 2,00 de cashback.', { valor: 200 }],
  ['estorno é entrada', 'Estorno', 'Estorno de R$ 35,90 da compra em IFOOD.', { valor: 3590 }],

  // Cofrinhos, caixinhas e porquinhos: dinheiro que muda de lugar
  ['Mercado Pago: guardou no cofrinho', 'Cofrinhos', 'Você guardou R$ 100,00 no Cofrinho Viagem.', { valor: -10000, descricao: 'Guardado: Cofrinho Viagem', reserva: true }],
  ['Mercado Pago: retirou do cofrinho', 'Cofrinhos', 'Você retirou R$ 103,20 do Cofrinho Viagem.', { valor: 10320, descricao: 'Resgate: Cofrinho Viagem', reserva: true }],
  ['PicPay: resgate do cofrinho', 'Resgate realizado', 'Seu resgate de R$ 51,20 do Cofrinho Férias foi realizado.', { valor: 5120, descricao: 'Resgate: Cofrinho Férias', reserva: true }],
  ['PicPay: guardou', 'Cofrinho', 'Você guardou R$ 50,00 no Cofrinho.', { valor: -5000, descricao: 'Guardado: Cofrinho', reserva: true }],
  ['Nubank: caixinha', 'Dinheiro guardado', 'Você guardou R$ 200,00 na Caixinha Reserva de emergência.', { valor: -20000, descricao: 'Guardado: Caixinha Reserva de emergência', reserva: true }],
  ['Nubank: resgate da caixinha', 'Resgate concluído', 'Você resgatou R$ 80,00 da Caixinha Carro.', { valor: 8000, descricao: 'Resgate: Caixinha Carro', reserva: true }],

  // Propaganda com valor: descartada
  ['empréstimo pré-aprovado', 'Crédito para você', 'Você tem R$ 5.000,00 pré-aprovados de empréstimo. Simule agora.', 'propaganda'],
  ['ganhe cashback', 'Oferta', 'Ganhe até R$ 50 de cashback pagando boletos no app.', 'propaganda'],
  ['cupom', 'Presente', 'Você recebeu um cupom de R$ 10 para usar hoje.', 'propaganda'],
  ['desconto', 'Só hoje', 'R$ 15 de desconto na sua próxima compra. Aproveite!', 'propaganda'],
  ['indique e ganhe', 'Indique amigos', 'Indique e ganhe R$ 20,00 por amigo que abrir a conta.', 'propaganda'],
  ['limite como oferta', 'Boa notícia', 'Você ganhou R$ 1.000,00 de limite no cartão de crédito.', 'propaganda'],
  ['pague parcelado', 'Pix parcelado', 'Envie R$ 500 agora e pague em 12x.', 'propaganda'],
  ['cofrinho como convite', 'Cofrinhos', 'Guarde a partir de R$ 1 e veja seu dinheiro render 120% do CDI.', 'propaganda'],
  ['produto à venda', 'Shopping', 'Fone bluetooth por apenas R$ 89,90 com frete grátis.', 'propaganda'],

  // Não aconteceu ou não pede decisão
  ['compra recusada', 'Compra não autorizada', 'Compra de R$ 250,00 em LOJA Y não autorizada.', 'recusada'],
  ['compra negada', 'Compra negada', 'Sua compra de R$ 99,90 em SITE Z foi negada por limite insuficiente.', 'recusada'],
  ['limite não é gasto', 'Limite disponível', 'Seu limite disponível é de R$ 2.000,00.', 'informativo'],
  ['rendimento do dia', 'Seu dinheiro rendeu', 'Seu dinheiro rendeu R$ 0,12 hoje.', 'informativo'],
  ['fatura paga', 'Pagamento recebido', 'Recebemos o pagamento da sua fatura no valor de R$ 850,00.', 'informativo'],

  // Para Em espera: tem valor, mas pede decisão ou não dá para saber
  ['fatura fechada vai para Em espera', 'Fatura fechada', 'Sua fatura de R$ 850,00 fechou e vence dia 10.', null],
  ['cobrança vai para Em espera', 'Cobrança', 'Carlos pediu R$ 40,00 para você.', null],
  ['sem valor', 'Nubank', 'Seu cartão chegou! Ative pelo app.', null],
  ['ambíguo vai para Em espera', 'Aviso', 'Movimentação de R$ 10,00 na sua conta.', null],
]

for (const [nome, titulo, texto, esperado] of casos) {
  test(nome, () => {
    const lido = lerNotificacao(titulo, texto)
    if (esperado === null) return assert.equal(lido, null)
    assert.ok(lido, 'deveria ter lido a notificação')
    if (typeof esperado === 'string') return assert.deepEqual(lido, { tipo: 'ignorar', motivo: esperado })
    assert.equal(lido.tipo, esperado.reserva ? 'reserva' : 'movimento')
    assert.ok(lido.tipo !== 'ignorar')
    assert.equal(lido.valor, esperado.valor)
    if (esperado.descricao !== undefined) assert.equal(lido.descricao, esperado.descricao)
    if (esperado.cartao !== undefined) assert.equal(lido.tipo === 'movimento' && lido.cartao, esperado.cartao)
  })
}

test('resgate: o que passa do guardado é rendimento', () => {
  assert.deepEqual(dividirResgate(10000, 10320), { principal: 10000, rendimento: 320 })
})

test('resgate parcial: nada de rendimento ainda', () => {
  assert.deepEqual(dividirResgate(10000, 4000), { principal: 4000, rendimento: 0 })
})

test('resgate sem histórico do que foi guardado: tudo é dinheiro voltando', () => {
  assert.deepEqual(dividirResgate(0, 5000), { principal: 5000, rendimento: 0 })
})
