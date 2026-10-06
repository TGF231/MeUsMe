import assert from 'node:assert/strict'
import { test } from 'node:test'
import { lerNotificacao } from '../src/nativo/bancos.ts'

// Exemplos no formato típico das notificações desses bancos (os textos reais podem variar).
const casos: [string, string, string, { valor: number; descricao: string; cartao?: boolean } | null][] = [
  ['Nubank: compra no crédito', 'Compra aprovada', 'Compra de R$ 35,90 APROVADA em IFOOD *RESTAURANTE para o cartão com final 1234.', { valor: -3590, descricao: 'IFOOD *RESTAURANTE', cartao: true }],
  ['Nubank: Pix recebido', 'Transferência recebida', 'Você recebeu uma transferência de R$ 150,00 de Maria Silva.', { valor: 15000, descricao: 'Maria Silva' }],
  ['Inter: compra', 'Compra aprovada', 'Compra de R$ 1.234,56 aprovada no cartão final 9876 em MAGAZINE LUIZA.', { valor: -123456, descricao: 'MAGAZINE LUIZA', cartao: true }],
  ['Inter: Pix enviado', 'Pix enviado', 'Você enviou um Pix de R$ 50,00 para João Souza.', { valor: -5000, descricao: 'João Souza' }],
  ['Mercado Pago: pagamento', 'Pagamento aprovado', 'Você pagou R$ 27,50 a Padaria Pão Quente.', { valor: -2750, descricao: 'Padaria Pão Quente' }],
  ['PicPay: recebido', 'Você recebeu dinheiro', 'Você recebeu R$ 20,00 de @fulano.', { valor: 2000, descricao: '@fulano' }],
  ['Next: compra', 'Compra aprovada', 'Compra no crédito de R$ 89,90 em DROGASIL aprovada.', { valor: -8990, descricao: 'DROGASIL', cartao: true }],
  ['fatura não é gasto', 'Fatura fechada', 'Sua fatura de R$ 850,00 fechou e vence dia 10.', null],
  ['limite não é gasto', 'Limite disponível', 'Seu limite disponível é de R$ 2.000,00.', null],
  ['sem valor', 'Nubank', 'Seu cartão chegou! Ative pelo app.', null],
  ['ambíguo vai para a Caixa', 'Aviso', 'Movimentação de R$ 10,00 na sua conta.', null],
]

for (const [nome, titulo, texto, esperado] of casos) {
  test(nome, () => {
    const lido = lerNotificacao(titulo, texto)
    if (esperado === null) return assert.equal(lido, null)
    assert.ok(lido, 'deveria ter lido a notificação')
    assert.equal(lido.valor, esperado.valor)
    assert.equal(lido.descricao, esperado.descricao)
    if (esperado.cartao !== undefined) assert.equal(lido.cartao, esperado.cartao)
  })
}
