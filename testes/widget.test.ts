import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { Evento, Passo, Projeto } from '../src/types.ts'
import { textoDoWidget, WIDGET_VAZIO } from '../src/widget.ts'

const AGORA = new Date(2026, 10, 2, 14).getTime()
const projeto: Projeto = { id: 'festa', titulo: 'Festa', chegada: 'Festa feita', criadoEm: 0 }
const passo = (id: string, ordem: number, extra: Partial<Passo> = {}): Passo => ({ id, projetoId: 'festa', texto: id, energia: 1, ordem, criadoEm: AGORA, ...extra })
const base = { projetos: [projeto], passos: [passo('lista', 1), passo('convite', 2)], focoId: null, checkins: [] }
const ev = (inicio: number, fim: number, passoId: string): Evento => ({ id: 'r', titulo: 'r', inicio, fim, origem: 'local', passoId })

test('mostra a sugestão da tela Agora com o projeto no rótulo', () => {
  assert.deepEqual(textoDoWidget(base, [], AGORA), { rotulo: 'Próximo passo · Festa', passo: 'lista' })
})

test('horário reservado agora vence a sugestão', () => {
  const t = textoDoWidget(base, [ev(AGORA - 60_000, AGORA + 30 * 60_000, 'convite')], AGORA)
  assert.equal(t.passo, 'convite')
  assert.match(t.rotulo, /^Reservado até /)
})

test('passo com reserva mais tarde dá lugar ao seguinte; fila vazia mostra o convite para capturar', () => {
  assert.equal(textoDoWidget(base, [ev(AGORA + 3_600_000, AGORA + 5_400_000, 'lista')], AGORA).passo, 'convite')
  assert.deepEqual(textoDoWidget({ ...base, passos: [] }, [], AGORA), { rotulo: 'Próximo passo', passo: WIDGET_VAZIO })
})
