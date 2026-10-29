import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  calibracao,
  diasDesde,
  explicarFator,
  inicioDaSemana,
  passosParaModelo,
  progresso,
  proximaOcorrencia,
  revisaoPendente,
  sugestoesDePasso,
  ultimaAtividade,
} from '../src/calculos.ts'
import type { Passo, Sessao } from '../src/types.ts'

const MIN = 60_000
const passo = (id: string, extra: Partial<Passo> = {}): Passo => ({ id, projetoId: 'p', texto: id, energia: 2, ordem: 1, criadoEm: 0, ...extra })

test('progresso conta o que já foi feito', () => {
  const passos = [passo('a', { feitoEm: 1 }), passo('b', { feitoEm: 2 }), passo('c'), passo('x', { projetoId: 'outro' })]
  assert.deepEqual(progresso(passos, 'p'), { feitos: 2, total: 3, fracao: 2 / 3 })
  assert.deepEqual(progresso([], 'p'), { feitos: 0, total: 0, fracao: 0 })
})

test('calibração usa a mediana de real/estimado e soma cronômetro e minutos manuais', () => {
  const passos = [
    passo('a', { feitoEm: 100 * MIN, estimativaMin: 10 }), // 20 min de sessão → 2×
    passo('b', { feitoEm: 100 * MIN, estimativaMin: 30, minutosManuais: 30 }), // 1×
    passo('c', { feitoEm: 100 * MIN, estimativaMin: 5 }), // 300 min esquecido ligado → 60×, não pode dominar
    passo('d', { estimativaMin: 10 }), // não concluído: fora
    passo('e', { feitoEm: 100 * MIN }), // sem palpite: fora
  ]
  const sessoes: Sessao[] = [
    { id: 's1', passoId: 'a', inicio: 0, fim: 20 * MIN },
    { id: 's3', passoId: 'c', inicio: 0, fim: 300 * MIN },
  ]
  assert.deepEqual(calibracao(passos, sessoes), { passos: 3, fator: 2 })
  assert.equal(calibracao([], []), null)
})

test('a frase da calibração não julga', () => {
  assert.match(explicarFator(2), /2,0×/)
  assert.match(explicarFator(1), /perto do real/)
  assert.match(explicarFator(0.5), /50%/)
})

test('última atividade e dias desde', () => {
  const agora = new Date(2026, 9, 26, 15).getTime()
  const ha3dias = new Date(2026, 9, 23, 23).getTime()
  assert.equal(ultimaAtividade({ passos: [passo('a', { criadoEm: ha3dias })], sessoes: [], capturas: [], checkins: [] }), ha3dias)
  assert.equal(ultimaAtividade({ passos: [], sessoes: [], capturas: [], checkins: [] }), null)
  assert.equal(diasDesde(ha3dias, agora), 3)
  assert.equal(diasDesde(agora, agora), 0)
})

test('revisão semanal: pendente até ser feita na semana atual; -1 desliga', () => {
  const segunda = new Date(2026, 9, 26, 15).getTime()
  const sabadoPassado = new Date(2026, 9, 24, 10).getTime()
  const domingo = new Date(2026, 9, 25, 10).getTime()
  assert.equal(revisaoPendente(segunda, 0, sabadoPassado), true) // semana começou no domingo
  assert.equal(revisaoPendente(segunda, 0, domingo), false)
  assert.equal(revisaoPendente(segunda, -1, 0), false)
})

test('início da semana respeita o dia escolhido', () => {
  const segunda = new Date(2026, 9, 26, 15).getTime() // 26/10/2026 é segunda-feira
  assert.equal(inicioDaSemana(segunda, 0), new Date(2026, 9, 25).getTime()) // domingo
  assert.equal(inicioDaSemana(segunda, 1), new Date(2026, 9, 26).getTime()) // a própria segunda
  assert.equal(inicioDaSemana(segunda, 5), new Date(2026, 9, 23).getTime()) // sexta anterior
})

test('sugestões: sem busca, os mais repetidos primeiro, preferindo o próprio projeto', () => {
  const passos = [
    passo('1', { texto: 'Ligar para a Ana', projetoId: null, feitoEm: 10 }),
    passo('2', { texto: 'ligar para a ana', projetoId: null, feitoEm: 20 }),
    passo('3', { texto: 'Pagar a luz', projetoId: null, feitoEm: 30 }),
    passo('4', { texto: 'Separar a roupa', projetoId: 'casa', feitoEm: 5, energia: 1 }),
  ]
  assert.deepEqual(
    sugestoesDePasso(passos, '', 'casa').map((s) => s.texto),
    ['Separar a roupa', 'ligar para a ana', 'Pagar a luz'],
  )
  assert.deepEqual(sugestoesDePasso(passos, '', 'casa')[0], { texto: 'Separar a roupa', energia: 1 })
})

test('sugestões: a busca ignora acento e caixa e não repete o que já está escrito', () => {
  const passos = [passo('1', { texto: 'Pagar a conta de água', feitoEm: 1 }), passo('2', { texto: 'Abrir o e-mail', feitoEm: 2 })]
  assert.deepEqual(sugestoesDePasso(passos, 'AGUA', 'p').map((s) => s.texto), ['Pagar a conta de água'])
  assert.deepEqual(sugestoesDePasso(passos, 'Abrir o e-mail', 'p'), [])
})

test('sugestões: o que já está na fila do projeto não aparece', () => {
  const passos = [passo('1', { texto: 'Lavar a louça', feitoEm: 1 }), passo('2', { texto: 'Lavar a louça' })]
  assert.deepEqual(sugestoesDePasso(passos, '', 'p'), [])
  assert.equal(sugestoesDePasso(passos, '', 'outro').length, 1)
})

test('modelo: passos feitos na ordem em que foram feitos, depois a fila, sem repetidos', () => {
  const passos = [
    passo('b', { texto: 'Estender', feitoEm: 20 }),
    passo('a', { texto: 'Separar', feitoEm: 10 }),
    passo('c', { texto: 'Dobrar', ordem: 2 }),
    passo('d', { texto: 'separar', ordem: 3 }),
    passo('x', { texto: 'Outro', projetoId: 'outro' }),
  ]
  assert.deepEqual(passosParaModelo(passos, 'p').map((s) => s.texto), ['Separar', 'Estender', 'Dobrar'])
})

test('lembrete mensal no dia 31 cai no último dia dos meses curtos e volta ao 31', () => {
  const em = (a: number, m: number, d: number) => new Date(a, m, d, 9).getTime()
  let quando = em(2026, 9, 31)
  const vistos: string[] = []
  for (let i = 0; i < 5; i++) {
    quando = proximaOcorrencia({ quando, repetir: 'mensal', dia: 31 }, quando)
    const d = new Date(quando)
    vistos.push(`${d.getDate()}/${d.getMonth() + 1}`)
  }
  assert.deepEqual(vistos, ['30/11', '31/12', '31/1', '28/2', '31/3'])
})

test('lembrete mensal antigo, sem dia guardado, usa o dia da data', () => {
  const quando = new Date(2026, 0, 15, 9).getTime()
  assert.equal(new Date(proximaOcorrencia({ quando, repetir: 'mensal' }, quando)).getDate(), 15)
})

test('lembrete diário e semanal pulam o que já passou', () => {
  const quando = new Date(2026, 9, 20, 9).getTime()
  const agora = new Date(2026, 9, 28, 10).getTime()
  assert.equal(proximaOcorrencia({ quando, repetir: 'diario' }, agora), new Date(2026, 9, 29, 9).getTime())
  assert.equal(proximaOcorrencia({ quando, repetir: 'semanal' }, agora), new Date(2026, 10, 3, 9).getTime())
  assert.equal(proximaOcorrencia({ quando, repetir: 'nunca' }, agora), quando)
})
