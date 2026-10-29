import assert from 'node:assert/strict'
import { test } from 'node:test'
import { lerData, lerHora, limparTitulo, resolverQuando } from '../src/motor/extratores.ts'
import { decidir } from '../src/motor/interpretar.ts'
import { aplicarRegras } from '../src/motor/regras.ts'
import { TUTORIAL } from '../src/motor/tutorial.ts'

// Quarta-feira, 28/10/2026, 10:00, no fuso de quem roda o teste.
const AGORA = new Date(2026, 9, 28, 10, 0)
const em = (dia: number, h: number, m = 0, mes = 9) => new Date(2026, mes, dia, h, m).getTime()

const horas: [string, [number, number] | null][] = [
  ['dentista 13:00', [13, 0]],
  ['dentista às 13:00', [13, 0]],
  ['reunião 15h', [15, 0]],
  ['reunião 15h30', [15, 30]],
  ['reunião 15 horas', [15, 0]],
  ['academia 6h', [6, 0]],
  ['às 3 da tarde', [15, 0]],
  ['as 3 da tarde', [15, 0]],
  ['às 9 da manhã', [9, 0]],
  ['às 8 da noite', [20, 0]],
  ['dentista às 3', [15, 0]],
  ['dentista às 10', [10, 0]],
  ['almoço ao meio-dia', [12, 0]],
  ['meia-noite', [0, 0]],
  // Não são hora
  ['estudar 2h', null],
  ['comprar as 3 camisas', null],
  ['comprar 2 pães', null],
  ['R$ 13,00 lanche', null],
  ['15/11', null],
]

for (const [texto, esperado] of horas) {
  test(`hora: ${texto}`, () => {
    const h = lerHora(texto)
    assert.deepEqual(h && [h.h, h.m], esperado)
  })
}

const datas: [string, number | null][] = [
  ['hoje', em(28, 0)],
  ['amanhã', em(29, 0)],
  ['amanha', em(29, 0)],
  ['depois de amanhã', em(30, 0)],
  ['sexta', em(30, 0)],
  ['na segunda-feira', em(2, 0, 0, 10)],
  ['quarta', em(28, 0)],
  ['sábado', em(31, 0)],
  ['semana que vem', em(2, 0, 0, 10)],
  ['dia 30', em(30, 0)],
  ['dia 5', em(5, 0, 0, 10)],
  ['15/11', em(15, 0, 0, 10)],
  ['10/01', new Date(2027, 0, 10).getTime()],
  ['31/02', null],
  ['ver a planilha', null],
]

for (const [texto, esperado] of datas) {
  test(`data: ${texto}`, () => assert.equal(lerData(texto, AGORA)?.dia.getTime() ?? null, esperado))
}

test('quando: só hora que já passou vai para amanhã', () => {
  assert.equal(resolverQuando(null, lerHora('8:00'), AGORA), em(29, 8))
  assert.equal(resolverQuando(null, lerHora('13:00'), AGORA), em(28, 13))
})

test('quando: dia da semana de hoje com hora passada vai para a próxima semana', () => {
  assert.equal(resolverQuando(lerData('quarta', AGORA), lerHora('8h'), AGORA), em(4, 8, 0, 10))
  assert.equal(resolverQuando(lerData('quarta', AGORA), lerHora('15h'), AGORA), em(28, 15))
})

test('quando: data sem hora fica na hora padrão; hoje com ela passada, na próxima hora cheia', () => {
  assert.equal(resolverQuando(lerData('sexta', AGORA), null, AGORA), em(30, 9))
  assert.equal(resolverQuando(lerData('hoje', AGORA), null, AGORA), em(28, 11))
  assert.equal(resolverQuando(null, null, AGORA), null)
})

test('título: tira os trechos usados e os conectores soltos', () => {
  const t = 'reunião amanhã às 15h com João'
  assert.equal(limparTitulo(t, [lerData(t, AGORA), lerHora(t)]), 'Reunião com João')
  const u = 'dentista no dia 30 às 13:00'
  assert.equal(limparTitulo(u, [lerData(u, AGORA), lerHora(u)]), 'Dentista')
})

// [texto, classe, título, quando ou valor, falta]
const regras: [string, string | null, string?, number?, string?][] = [
  ['dentista 13:00', 'compromisso', 'Dentista', em(28, 13)],
  ['reunião amanhã 15h', 'compromisso', 'Reunião', em(29, 15)],
  ['lembrar de pagar a luz sexta', 'lembrete', 'Pagar a luz', em(30, 9)],
  ['me lembra de ligar pro João amanhã às 14h', 'lembrete', 'Ligar pro João', em(29, 14)],
  ['lembrar de comprar pão', 'lembrete', 'Comprar pão', undefined, 'quando'],
  ['-R$ 35 almoço', 'despesa', 'almoço', -3500],
  ['+R$ 1000 tv', 'receita', 'tv', 100000],
  ['R$ 1000 tv', 'despesa', 'tv', -100000, 'direcao'],
  // Precedência: lembrar > dinheiro > hora.
  ['lembrar de pagar R$ 50 sexta 10h', 'lembrete', 'Pagar R$ 50', em(30, 10)],
  ['-R$ 35 almoço 13h', 'despesa', 'almoço 13h', -3500],
  ['ver aquele negócio do carro', null],
  ['estudar 2h', null],
]

for (const [texto, classe, titulo, numero, falta] of regras) {
  test(`regras: ${texto}`, () => {
    const r = aplicarRegras(texto, AGORA)
    if (classe === null) return assert.equal(r, null)
    assert.ok(r)
    assert.equal(r.classe, classe)
    assert.equal(r.titulo, titulo)
    if (numero !== undefined) assert.equal(r.classe === 'despesa' || r.classe === 'receita' ? r.valor : r.quando, numero)
    assert.equal(r.falta, falta)
  })
}

test('decisão: falta algo ou automático desligado vai para a Caixa com sugestão', () => {
  assert.deepEqual(decidir('lembrar de comprar pão', AGORA), { caixa: true, sugestao: 'lembrete' })
  assert.deepEqual(decidir('R$ 1000 tv', AGORA), { caixa: true, sugestao: 'despesa' })
  assert.deepEqual(decidir('dentista 13:00', AGORA, { automatico: false }), { caixa: true, sugestao: 'compromisso' })
  assert.deepEqual(decidir('ver aquele negócio do carro', AGORA), { caixa: true })
  assert.ok('criar' in decidir('dentista 13:00', AGORA))
})

// O tutorial promete; o motor cumpre.
for (const tela of TUTORIAL)
  for (const e of tela.exemplos)
    test(`tutorial: ${e.texto}`, () => {
      const d = decidir(e.texto, AGORA)
      if (e.espera === null) return assert.deepEqual(d, { caixa: true })
      assert.ok('criar' in d, `"${e.texto}" deveria ser criado sozinho`)
      for (const [campo, valor] of Object.entries(e.espera)) assert.equal(d.criar[campo as keyof typeof d.criar], valor, campo)
    })
