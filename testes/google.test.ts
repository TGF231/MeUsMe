import assert from 'node:assert/strict'
import { test } from 'node:test'
import { paraEventos } from '../src/googleEventos.ts'

const itens = [
  { id: 'a', summary: 'Reunião', start: { dateTime: '2026-11-03T14:00:00-03:00' }, end: { dateTime: '2026-11-03T15:00:00-03:00' } },
  { id: 'b', summary: 'Feriado', start: { date: '2026-11-15' }, end: { date: '2026-11-16' } },
  { id: 'c', summary: 'Cancelado', status: 'cancelled', start: { date: '2026-11-04' }, end: { date: '2026-11-05' } },
]

test('agenda principal: googleId puro, sem nome de agenda, cancelados fora', () => {
  const ev = paraEventos(itens)
  assert.deepEqual(ev.map((e) => e.googleId), ['a', 'b'])
  assert.equal(ev[0].agendaGoogle, undefined)
  assert.equal(ev[1].diaInteiro, true)
})

test('outra agenda (D08): nome da agenda e googleId com o ID dela na frente', () => {
  const ev = paraEventos(itens, { id: 'equipe@group.calendar.google.com', nome: 'Equipe' })
  assert.equal(ev[0].googleId, 'equipe@group.calendar.google.com/a')
  assert.equal(ev[0].agendaGoogle, 'Equipe')
  assert.equal(ev[0].inicio, Date.parse('2026-11-03T17:00:00Z'))
})
