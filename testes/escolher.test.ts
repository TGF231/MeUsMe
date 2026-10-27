import assert from 'node:assert/strict'
import { test } from 'node:test'
import { escolherPasso } from '../src/escolher.ts'
import type { Passo, Projeto } from '../src/types.ts'

const projeto: Projeto = { id: 'festa', titulo: 'Festa', chegada: 'Festa feita', criadoEm: 0 }
const passo = (id: string, ordem: number, extra: Partial<Passo> = {}): Passo => ({
  id,
  projetoId: 'festa',
  texto: id,
  energia: 1,
  ordem,
  criadoEm: Date.now(),
  ...extra,
})
const passos = [passo('lista', 1), passo('convite', 2), passo('dentista', 1, { projetoId: null })]

test('escolhe o primeiro passo pendente do projeto', () => {
  assert.equal(escolherPasso([projeto], passos, 'festa', 2, new Set())?.passo.id, 'lista')
})

test('passo com horário reservado dá lugar ao seguinte do mesmo projeto', () => {
  const escolha = escolherPasso([projeto], passos, 'festa', 2, new Set(), new Set(['lista']))
  assert.equal(escolha?.passo.id, 'convite')
})

test('"Agora não" tira o projeto da vez, e a tarefa solta aparece', () => {
  assert.equal(escolherPasso([projeto], passos, 'festa', 2, new Set(['lista']))?.passo.id, 'dentista')
})

test('tarefa solta reservada também fica de fora', () => {
  const soSolta = [passo('dentista', 1, { projetoId: null })]
  assert.equal(escolherPasso([], soSolta, null, 2, new Set(), new Set(['dentista'])), null)
})
