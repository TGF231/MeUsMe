import assert from 'node:assert/strict'
import test from 'node:test'
import { contagemDasRotinas } from '../src/rotinas.ts'
import type { Passo } from '../src/types.ts'

const DIA = 86_400_000
const agora = new Date(2026, 10, 4, 12).getTime()
const passo = (id: string, extra: Partial<Passo> = {}): Passo => ({ id, projetoId: null, texto: 'Regar as plantas', energia: 1, ordem: 1, criadoEm: agora - 60 * DIA, repetir: 'semanal', ...extra })

test('Rotina semanal: conta as vezes feitas nas últimas 4 semanas, de 4', () => {
  const passos = [
    passo('a', { feitoEm: agora - 40 * DIA }),
    passo('b', { repeteDe: 'a', feitoEm: agora - 20 * DIA }),
    passo('c', { repeteDe: 'b', feitoEm: agora - 6 * DIA }),
    passo('d', { repeteDe: 'c' }),
  ]
  assert.deepEqual(contagemDasRotinas(passos, agora), [{ id: 'd', texto: 'Regar as plantas', repetir: 'semanal', vezes: 2, esperado: 4 }])
})

test('Rotina nova: espera só pelo tempo que existe, e a primeira vez pendente não aparece', () => {
  const nova = [passo('a', { criadoEm: agora - 10 * DIA, feitoEm: agora - 9 * DIA }), passo('b', { repeteDe: 'a' })]
  assert.equal(contagemDasRotinas(nova, agora)[0].esperado, 2)
  assert.deepEqual(contagemDasRotinas([passo('x', { criadoEm: agora - DIA })], agora), [])
})

test('Mensal espera 1; passo sem repetir fica de fora', () => {
  const passos = [passo('a', { repetir: 'mensal', feitoEm: agora - 3 * DIA }), passo('b', { repetir: 'mensal', repeteDe: 'a' }), passo('s', { repetir: undefined })]
  assert.deepEqual(
    contagemDasRotinas(passos, agora).map((r) => [r.vezes, r.esperado]),
    [[1, 1]],
  )
})
