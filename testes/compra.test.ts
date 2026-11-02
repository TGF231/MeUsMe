import assert from 'node:assert/strict'
import { test } from 'node:test'
import { dividirEmParcelas, efeitoDaCompra } from '../src/compra.ts'

test('compra que cabe: livre por dia cai e diz quantos dias de livre consome', () => {
  const e = efeitoDaCompra({ livre: 200000, diasRestantes: 20, porDia: 10000 }, 30000)
  assert.deepEqual(e, { porDiaAntes: 10000, porDiaDepois: 8500, diasDeLivre: 3, falta: 0 })
})

test('compra que passa do livre do mês mostra quanto falta', () => {
  const e = efeitoDaCompra({ livre: 10000, diasRestantes: 10, porDia: 1000 }, 25000)
  assert.equal(e.falta, 15000)
  assert.equal(e.porDiaDepois, -1500)
})

test('sem livre por dia positivo, não calcula dias de livre', () => {
  assert.equal(efeitoDaCompra({ livre: -500, diasRestantes: 5, porDia: -100 }, 1000).diasDeLivre, null)
})

test('parcelas: uma por mês, centavos que sobram na primeira, dia 31 vira o último dia do mês', () => {
  const p = dividirEmParcelas(-10000, 3, '2027-01-31')
  assert.deepEqual(p.map((x) => x.data), ['2027-01-31', '2027-02-28', '2027-03-31'])
  assert.deepEqual(p.map((x) => x.valor), [-3334, -3333, -3333])
  assert.equal(p.reduce((t, x) => t + x.valor, 0), -10000)
  assert.equal(p[2].sufixo, ' (3/3)')
})
