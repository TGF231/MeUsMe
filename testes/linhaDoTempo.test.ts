import assert from 'node:assert/strict'
import { test } from 'node:test'
import { linhaDoTempo } from '../src/linhaDoTempo.ts'
import type { Evento } from '../src/types.ts'

const H = 3_600_000
const ev = (id: string, ini: number, fim: number, extra: Partial<Evento> = {}): Evento => ({ id, titulo: id, inicio: ini * H, fim: fim * H, origem: 'local', ...extra })

test('posições em % e tempo livre sem contar sobreposição duas vezes', () => {
  const { faixas, livreMin } = linhaDoTempo([ev('a', 2, 4), ev('b', 3, 5, { passoId: 'p' }), ev('dia', 0, 24, { diaInteiro: true })], 0, 10 * H)
  assert.deepEqual(faixas.map((f) => [f.id, f.inicio, f.largura, f.reservado]), [['a', 20, 20, false], ['b', 30, 20, true]])
  assert.equal(livreMin, 7 * 60)
})

test('evento que começou antes de agora é cortado no começo da faixa', () => {
  const { faixas } = linhaDoTempo([ev('a', 1, 3)], 2 * H, 12 * H)
  assert.equal(faixas[0].inicio, 0)
  assert.equal(faixas[0].largura, 10)
})
