import assert from 'node:assert/strict'
import { test } from 'node:test'
import { compararVersoes, NOVIDADES, novidadesEntre, novidadesPendentes } from '../src/novidades.ts'

test('compara versões número a número', () => {
  assert.equal(compararVersoes('0.10.0', '0.9.0'), 1)
  assert.equal(compararVersoes('0.6.0', '0.6'), 0)
  assert.equal(compararVersoes('0.5.1', '0.6.0'), -1)
})

test('só as versões depois da vista e até a atual', () => {
  assert.deepEqual(novidadesEntre('0.5.0', '0.6.0').map((n) => n.versao), ['0.6.0'])
  assert.deepEqual(novidadesEntre('0.6.0', '0.6.0'), [])
  // Ainda na 0.5.0: a entrada da próxima versão não aparece antes da hora.
  assert.deepEqual(novidadesEntre('0.4.0', '0.5.0'), [])
})

test('entradas da mais nova para a mais antiga, curtas', () => {
  for (let i = 1; i < NOVIDADES.length; i++) assert.equal(compararVersoes(NOVIDADES[i - 1].versao, NOVIDADES[i].versao), 1)
  for (const n of NOVIDADES) assert.ok(n.itens.length <= 8, `${n.versao}: no máximo 8 linhas`)
})

test('pendentes: quem já usava vem da 0.5.0; quem acabou de instalar não vê a lista', () => {
  assert.deepEqual(novidadesPendentes('', true, '0.6.0').map((n) => n.versao), ['0.6.0'])
  assert.deepEqual(novidadesPendentes('', false, '0.6.0'), [])
  assert.deepEqual(novidadesPendentes('0.6.0', true, '0.6.0'), [])
})
