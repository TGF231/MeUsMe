import assert from 'node:assert/strict'
import { test } from 'node:test'
import { duracaoPrevista, encaixar, montarDia, refazerResto } from '../src/montarDia.ts'
import type { Evento, Passo, Projeto } from '../src/types.ts'

const H = 3_600_000
const M = 60_000
// Um dia qualquer às 0h no fuso local, para as horas abaixo serem horas do relógio.
const DIA = new Date(2026, 10, 2).getTime()
const as = (h: number, m = 0) => DIA + h * H + m * M
const ev = (id: string, ini: number, fim: number, extra: Partial<Evento> = {}): Evento => ({ id, titulo: id, inicio: ini, fim, origem: 'local', ...extra })
const passo = (id: string, ordem: number, extra: Partial<Passo> = {}): Passo => ({
  id,
  projetoId: 'festa',
  texto: id,
  energia: 1,
  ordem,
  criadoEm: DIA,
  ...extra,
})
const projeto: Projeto = { id: 'festa', titulo: 'Festa', chegada: 'Festa feita', criadoEm: 0 }

test('duração: palpite corrigido pelo ritmo, ou padrão pela energia', () => {
  assert.equal(duracaoPrevista(passo('a', 1)), 15)
  assert.equal(duracaoPrevista(passo('a', 1, { energia: 3 })), 45)
  assert.equal(duracaoPrevista(passo('a', 1, { estimativaMin: 20 }), 1.5), 30)
  assert.equal(duracaoPrevista(passo('a', 1, { estimativaMin: 200 })), 120)
})

test('encaixar pula compromissos com folga e começa no próximo múltiplo de 5 min', () => {
  const { blocos, semEspaco } = encaixar(
    [
      { id: 'a', minutos: 30 },
      { id: 'b', minutos: 30 },
    ],
    [ev('reuniao', as(9, 40), as(10))],
    as(9, 2),
    as(12),
  )
  // 9h05–9h35 invade a folga antes da reunião: vai para 10h10 (reunião + 10 min de folga); b vem 10 min depois de a.
  assert.deepEqual(
    blocos.map((b) => [b.id, b.inicio, b.fim]),
    [
      ['a', as(10, 10), as(10, 40)],
      ['b', as(10, 50), as(11, 20)],
    ],
  )
  assert.deepEqual(semEspaco, [])
})

test('o que não cabe até o fim fica de fora, e um menor ainda pode caber', () => {
  const { blocos, semEspaco } = encaixar(
    [
      { id: 'grande', minutos: 90 },
      { id: 'pequeno', minutos: 20 },
    ],
    [ev('dia', DIA, DIA + 24 * H, { diaInteiro: true })],
    as(21),
    as(22),
  )
  assert.deepEqual(semEspaco, ['grande'])
  assert.deepEqual(blocos.map((b) => b.id), ['pequeno'])
})

test('montarDia sugere vários passos do mesmo projeto em ordem e respeita a energia', () => {
  const passos = [passo('lista', 1), passo('convite', 2), passo('bolo', 3, { energia: 3 }), passo('solta', 1, { projetoId: null })]
  const dados = { projetos: [projeto], passos, sessoes: [], eventos: [], focoId: 'festa', energia: 2 as const }
  const { propostas } = montarDia(dados, as(14), as(22))
  assert.deepEqual(propostas.map((p) => p.passo.id), ['lista', 'convite', 'solta'])
  assert.equal(propostas[0].inicio, as(14))
  assert.equal(propostas[1].inicio, as(14, 25))
})

test('montarDia deixa de fora passos que já têm horário reservado', () => {
  const passos = [passo('lista', 1), passo('convite', 2)]
  const eventos = [ev('r', as(18), as(18, 30), { passoId: 'lista' })]
  const { propostas } = montarDia({ projetos: [projeto], passos, sessoes: [], eventos, focoId: null, energia: 2 }, as(14), as(22))
  assert.deepEqual(propostas.map((p) => p.passo.id), ['convite'])
})

test('refazerResto reencaixa o que passou e o que vem, e mantém o horário em andamento', () => {
  const passos = [passo('a', 1), passo('b', 2), passo('c', 3), passo('feito', 4, { feitoEm: as(8) })]
  const eventos = [
    ev('ra', as(9), as(9, 30), { passoId: 'a' }),
    ev('rf', as(9, 30), as(10), { passoId: 'feito' }),
    ev('agora', as(10, 50), as(11, 20), { passoId: 'b' }),
    ev('rc', as(15), as(15, 45), { passoId: 'c' }),
    ev('google', as(16), as(17), { passoId: 'c', origem: 'google' }),
  ]
  const r = refazerResto(eventos, passos, as(11), as(22), DIA)
  assert.equal(r.passaram, 1)
  // a vai para depois do bloco em andamento (11h20 + folga); c vem em seguida, com a mesma duração.
  assert.deepEqual(
    r.mover.map((m) => [m.id, m.inicio, m.fim]),
    [
      ['ra', as(11, 30), as(12)],
      ['rc', as(12, 10), as(12, 55)],
    ],
  )
  assert.deepEqual(r.naoCabem, [])
})

test('refazerResto: o que não cabe até o fim do dia volta para a fila', () => {
  const passos = [passo('a', 1)]
  const r = refazerResto([ev('ra', as(9), as(11), { passoId: 'a' })], passos, as(21, 30), as(22), DIA)
  assert.equal(r.passaram, 1)
  assert.deepEqual(r.mover, [])
  assert.deepEqual(r.naoCabem.map((e) => e.id), ['ra'])
})
