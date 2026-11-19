import assert from 'node:assert/strict'
import { test } from 'node:test'
import { anotadosFora, escolherPasso } from '../src/escolher.ts'
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

test('"só a partir de" no futuro esconde o passo, e o seguinte do projeto concorre', () => {
  const comInicio = [passo('lista', 1, { aPartirDe: '2026-11-10' }), passo('convite', 2)]
  assert.equal(escolherPasso([projeto], comInicio, 'festa', 2, new Set(), new Set(), '2026-11-01')?.passo.id, 'convite')
  assert.equal(escolherPasso([projeto], comInicio, 'festa', 2, new Set(), new Set(), '2026-11-10')?.passo.id, 'lista')
})

test('prazo perto passa na frente de tarefa solta sem prazo e diz o motivo', () => {
  const outro: Projeto = { id: 'obra', titulo: 'Obra', chegada: 'Pronta', criadoEm: 0 }
  const lista = [
    passo('a', 1), passo('b', 2), passo('c', 3), passo('d', 4), passo('e', 5),
    passo('pedreiro', 1, { projetoId: 'obra', prazo: '2026-11-02' }),
    passo('p2', 2, { projetoId: 'obra' }), passo('p3', 3, { projetoId: 'obra' }), passo('p4', 4, { projetoId: 'obra' }), passo('p5', 5, { projetoId: 'obra' }),
  ]
  const escolha = escolherPasso([projeto, outro], lista, null, 2, new Set(), new Set(), '2026-11-01')
  assert.equal(escolha?.passo.id, 'pedreiro')
  assert.equal(escolha?.motivo, 'O prazo é amanhã.')
})

test('prazo vencido pesa como hoje e o motivo não cobra', () => {
  const solta = [passo('boleto', 1, { projetoId: null, prazo: '2026-10-20' })]
  const escolha = escolherPasso([], solta, null, 2, new Set(), new Set(), '2026-11-01')
  assert.match(escolha!.motivo, /sem pressa/)
})

test('projeto em foco continua vencendo um prazo distante', () => {
  const lista = [passo('lista', 1), passo('boleto', 1, { projetoId: null, prazo: '2026-11-06' })]
  assert.equal(escolherPasso([projeto], lista, 'festa', 2, new Set(), new Set(), '2026-11-01')?.passo.id, 'lista')
})

test('pedaços de uma tarefa solta com o mesmo prazo vêm antes do original', () => {
  const lista = [
    passo('original', 1, { projetoId: null, prazo: '2026-11-01' }),
    passo('pedaco1', 0.5, { projetoId: null, prazo: '2026-11-01' }),
    passo('pedaco2', 0.75, { projetoId: null, prazo: '2026-11-01' }),
  ].map((p) => ({ ...p, criadoEm: 0 }))
  assert.equal(escolherPasso([], lista, null, 2, new Set(), new Set(), '2026-11-01')?.passo.id, 'pedaco1')
})

test('passo com 3 "Agora não" passa na frente de uma tarefa solta igual', () => {
  const soltas = [passo('a', 1, { projetoId: null }), passo('b', 2, { projetoId: null, adiamentos: 3 })]
  assert.equal(escolherPasso([], soltas, null, 2, new Set())?.passo.id, 'b')
  // Com 2, ainda não: a ordem de antes vale.
  const duas = [passo('a', 1, { projetoId: null }), passo('b', 2, { projetoId: null, adiamentos: 2 })]
  assert.equal(escolherPasso([], duas, null, 2, new Set())?.passo.id, 'a')
})

test('no trabalho, passo marcado para casa dá lugar ao seguinte; sem lugar vale nos dois', () => {
  const comLugar = [passo('lista', 1, { contexto: 'casa' }), passo('convite', 2)]
  const no = (lugar: 'trabalho' | 'casa' | null) =>
    escolherPasso([projeto], comLugar, 'festa', 2, new Set(), new Set(), undefined, lugar)?.passo.id
  assert.equal(no('trabalho'), 'convite')
  assert.equal(no('casa'), 'lista')
  assert.equal(no(null), 'lista')
})

test('chegada: mostra só o que foi anotado para o lugar enquanto você estava fora', () => {
  const lista = [
    passo('antes', 1, { contexto: 'trabalho', criadoEm: 100 }),
    passo('fora', 2, { contexto: 'trabalho', criadoEm: 200 }),
    passo('casa', 3, { contexto: 'casa', criadoEm: 210 }),
    passo('feito', 4, { contexto: 'trabalho', criadoEm: 220, feitoEm: 230 }),
    passo('depois', 5, { contexto: 'trabalho', criadoEm: 400 }),
  ]
  assert.deepEqual(anotadosFora(lista, 'trabalho', 150, 300).map((p) => p.id), ['fora'])
  assert.deepEqual(anotadosFora(lista, 'trabalho', undefined, 300), [])
})
