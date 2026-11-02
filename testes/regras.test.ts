import assert from 'node:assert/strict'
import { test } from 'node:test'
import { compararComMesesAnteriores, mesAntes, palavraDaRegra, sugerirCategoria, useFinancas } from '../src/stores/financas.ts'
import type { Categoria, Transacao } from '../src/types.ts'

const categorias: Categoria[] = [
  { id: 'cat-transporte', nome: 'Transporte', tipo: 'gasto' },
  { id: 'trabalho', nome: 'Trabalho', tipo: 'gasto' },
]
const t = (id: string, descricao: string, categoriaId: string | null = null): Transacao => ({ id, contaId: 'c', categoriaId, valor: -1000, descricao, data: '2026-11-02', criadoEm: 0 })

test('palavra da regra: primeira palavra com 3 letras ou mais, sem acento e sem números', () => {
  assert.equal(palavraDaRegra('UBER *TRIP 1234'), 'uber')
  assert.equal(palavraDaRegra('12 Pão de Açúcar'), 'pao')
  assert.equal(palavraDaRegra('12 34'), null)
})

test('a regra vence o histórico e as palavras-chave; regra de categoria apagada não vale', () => {
  const regras = [{ id: 'r', contem: 'uber', categoriaId: 'trabalho', criadoEm: 0 }]
  assert.equal(sugerirCategoria('UBER *TRIP', [t('a', 'UBER *TRIP', 'cat-transporte')], categorias, regras), 'trabalho')
  assert.equal(sugerirCategoria('Uber viagem', [], categorias), 'cat-transporte')
  assert.equal(sugerirCategoria('Uber viagem', [], categorias.slice(0, 1), regras), 'cat-transporte')
})

test('criarRegra aplica nos lançamentos sem categoria que batem e substitui regra com o mesmo trecho', () => {
  useFinancas.setState({ categorias, regras: [], transacoes: [t('a', 'UBER *TRIP'), t('b', 'Ubér centro', 'cat-transporte'), t('c', 'Padaria')] })
  assert.equal(useFinancas.getState().criarRegra('Uber', 'trabalho'), 1)
  assert.equal(useFinancas.getState().criarRegra('UBER', 'cat-transporte'), 0)
  const s = useFinancas.getState()
  assert.deepEqual(s.transacoes.map((x) => x.categoriaId), ['trabalho', 'cat-transporte', null])
  assert.deepEqual(s.regras.map((r) => [r.contem, r.categoriaId]), [['uber', 'cat-transporte']])
})

test('comparar meses: mesmo trecho do mês, média só dos meses com lançamentos, só diferenças relevantes', () => {
  const g = (id: string, data: string, valor: number, categoriaId: string | null): Transacao => ({ id, contaId: 'c', categoriaId, valor, descricao: id, data, criadoEm: 0 })
  const transacoes = [
    g('a', '2026-11-02', -30000, 'mercado'),
    g('b', '2026-11-01', -2000, 'cafe'),
    g('c', '2026-10-02', -10000, 'mercado'),
    g('d', '2026-10-20', -90000, 'mercado'), // depois do dia 2: fora do trecho
    g('e', '2026-09-01', -10000, 'mercado'),
    g('f', '2026-09-02', -1500, 'cafe'),
    g('g', '2026-10-01', -20000, 'lazer'),
  ]
  const r = compararComMesesAnteriores(transacoes, '2026-11', 2)
  assert.equal(r.meses, 2)
  assert.deepEqual(
    r.diferencas.map((d) => [d.categoriaId, d.agora, d.media]),
    [
      ['mercado', 30000, 10000],
      ['lazer', 0, 10000],
    ],
  )
  assert.equal(mesAntes('2026-01', 1), '2025-12')
  assert.deepEqual(compararComMesesAnteriores(transacoes.slice(0, 2), '2026-11', 2), { meses: 0, diferencas: [] })
})
