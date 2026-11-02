import assert from 'node:assert/strict'
import { test } from 'node:test'
import { palavraDaRegra, sugerirCategoria, useFinancas } from '../src/stores/financas.ts'
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
