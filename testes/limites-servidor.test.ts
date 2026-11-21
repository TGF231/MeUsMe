// Executar com npm test.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { motivoRecusa } from '../src/sync/planejar.ts'

test('registro comum cabe no servidor', () => {
  assert.equal(motivoRecusa({ colecao: 'nucleo.passos', id: 'abc123', dados: { texto: 'Lavar a louça' }, apagado: false }), null)
})

test('coleção fora das quatro conhecidas é recusada, como no servidor', () => {
  assert.equal(motivoRecusa({ colecao: 'outra.coisa', id: 'a', dados: {}, apagado: false }), 'coleção desconhecida')
  assert.equal(motivoRecusa({ colecao: 'nucleo.passos;drop', id: 'a', dados: {}, apagado: false }), 'coleção desconhecida')
})

test('identificador vazio ou com mais de 128 caracteres é recusado', () => {
  assert.equal(motivoRecusa({ colecao: 'nucleo.passos', id: '', dados: {}, apagado: false }), 'identificador vazio ou longo demais')
  assert.equal(motivoRecusa({ colecao: 'nucleo.passos', id: 'x'.repeat(129), dados: {}, apagado: false }), 'identificador vazio ou longo demais')
})

test('registro com mais de 256 KB é recusado; apagado não carrega dados e passa', () => {
  const grande = { texto: 'á'.repeat(140_000) } // 2 bytes por letra em UTF-8
  assert.equal(motivoRecusa({ colecao: 'nucleo.capturas', id: 'a', dados: grande, apagado: false }), 'maior que 256 KB')
  assert.equal(motivoRecusa({ colecao: 'nucleo.capturas', id: 'a', dados: grande, apagado: true }), null)
})

test('toda coleção que o app sincroniza passa na regra de nome do servidor', async () => {
  const { readFileSync } = await import('node:fs')
  const fonte = readFileSync(new URL('../src/sync/colecoes.ts', import.meta.url), 'utf8')
  const nomes = [...fonte.matchAll(/nome: '([^']+)'/g)].map((m) => m[1])
  assert.ok(nomes.length > 20, 'achou as coleções')
  for (const colecao of nomes) assert.equal(motivoRecusa({ colecao, id: 'a', dados: null, apagado: false }), null, colecao)
})
