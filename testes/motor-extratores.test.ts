import assert from 'node:assert/strict'
import { test } from 'node:test'
import { lerDinheiro, type Dinheiro } from '../src/motor/extratores.ts'

// [texto, esperado]; null quando o texto não deve virar dinheiro.
const comMoeda: [string, Partial<Dinheiro> | null][] = [
  // Regra do tutorial: só é dinheiro com R$, "reais" ou vírgula de centavos.
  ['R$ 35 almoço', { valor: 3500, direcao: null, descricao: 'almoço' }],
  ['r$35 almoço', { valor: 3500, descricao: 'almoço' }],
  ['35 reais almoço', { valor: 3500, direcao: null, descricao: 'almoço' }],
  ['almoço 35 reais', { valor: 3500, descricao: 'almoço' }],
  ['35,00 almoço', { valor: 3500, descricao: 'almoço' }],
  ['almoço 12,90', { valor: 1290, descricao: 'almoço' }],
  ['35 almoço', null],
  ['dentista 13:00', null],
  ['comprar 2 pães', null],

  // Formatos de número
  ['R$ 1.234,56 mercado', { valor: 123456, descricao: 'mercado' }],
  ['R$ 35.50 uber', { valor: 3550, descricao: 'uber' }],
  ['R$ 1.000 tv', { valor: 100000, descricao: 'tv' }],
  ['R$ 2 mil tv', { valor: 200000, descricao: 'tv' }],
  ['2 mil reais tv', { valor: 200000, descricao: 'tv' }],
  ['R$ 0 nada', null],

  // Sinal: + é entrada, - é saída; falando, "mais" e "menos".
  ['-R$ 35 almoço', { valor: 3500, direcao: 'saida', descricao: 'almoço' }],
  ['+R$ 1000 tv', { valor: 100000, direcao: 'entrada', descricao: 'tv' }],
  ['+1000 reais tv', { valor: 100000, direcao: 'entrada', descricao: 'tv' }],
  ['-12,90 padaria', { valor: 1290, direcao: 'saida', descricao: 'padaria' }],
  ['menos 35 reais almoço', { valor: 3500, direcao: 'saida', descricao: 'almoço' }],
  ['mais 2 mil reais tv', { valor: 200000, direcao: 'entrada', descricao: 'tv' }],

  // O sinal colado no número basta: sem R$, que é lento no teclado do celular.
  ['-35 almoço', { valor: 3500, direcao: 'saida', descricao: 'almoço' }],
  ['+1000 tv', { valor: 100000, direcao: 'entrada', descricao: 'tv' }],
  ['almoço -35', { valor: 3500, direcao: 'saida', descricao: 'almoço' }],
  ['-12.90 padaria', { valor: 1290, direcao: 'saida', descricao: 'padaria' }],
  ['+2 mil tv', { valor: 200000, direcao: 'entrada', descricao: 'tv' }],
  ['-1.234,56 aluguel', { valor: 123456, direcao: 'saida', descricao: 'aluguel' }],
  // ...mas não quando o sinal é outra coisa.
  ['- 2 pães', null],
  ['ligar +55 11 98765-4321', null],
  ['ligar 99999-1234', null],
  ['plantão 13-15h', null],
  ['-5 kg de arroz', null],
  ['correr +2 km', null],
  ['desconto de -10%', null],
  ['ficar +2 dias', null],

  // Sem sinal, palavras decidem; sem nenhuma das duas, a direção fica em aberto.
  ['R$ 1000 tv', { direcao: null }],
  ['vendi tv R$ 1.000', { valor: 100000, direcao: 'entrada', descricao: 'tv' }],
  ['paguei R$ 35 no almoço', { direcao: 'saida', descricao: 'almoço' }],
  ['recebi R$ 200 do João', { direcao: 'entrada', descricao: 'João' }],
  ['conta de luz R$ 120,50', { valor: 12050, direcao: 'saida', descricao: 'conta de luz' }],
  ['salário R$ 3.000', { valor: 300000, direcao: 'entrada', descricao: 'salário' }],
  ['recebi R$ 50 e paguei a luz', { direcao: null }],
  // O sinal vence as palavras.
  ['+R$ 200 paguei a mais', { direcao: 'entrada' }],

  // Dois valores: o motor não escolhe.
  ['R$ 35 almoço e R$ 10 café', null],
]

for (const [texto, esperado] of comMoeda) {
  test(`dinheiro: ${texto}`, () => {
    const lido = lerDinheiro(texto)
    if (esperado === null) return assert.equal(lido, null)
    assert.ok(lido, 'deveria ter lido o valor')
    for (const [campo, valor] of Object.entries(esperado)) assert.equal(lido[campo as keyof Dinheiro], valor, campo)
  })
}

// Onde o campo já é de valor (lista de espera), o número solto vale.
const soltos: [string, Partial<Dinheiro> | null][] = [
  ['250 fone novo', { valor: 25000, descricao: 'fone novo' }],
  ['fone novo 250', { valor: 25000, descricao: 'fone novo' }],
  ['fone novo 1.299,90', { valor: 129990, descricao: 'fone novo' }],
  ['R$ 250 fone', { valor: 25000, descricao: 'fone' }],
  ['fone novo', null],
]

for (const [texto, esperado] of soltos) {
  test(`dinheiro sem exigir moeda: ${texto}`, () => {
    const lido = lerDinheiro(texto, { exigirMoeda: false })
    if (esperado === null) return assert.equal(lido, null)
    assert.ok(lido, 'deveria ter lido o valor')
    for (const [campo, valor] of Object.entries(esperado)) assert.equal(lido[campo as keyof Dinheiro], valor, campo)
  })
}
