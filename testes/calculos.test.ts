import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  calibracao,
  diasAte,
  diasDesde,
  explicarFator,
  inicioDaSemana,
  marcoDePassos,
  ordemAntesDe,
  paradas,
  passosParaModelo,
  progresso,
  proximaRepeticao,
  proximaOcorrencia,
  revisaoPendente,
  somarDias,
  sugerirNovasDatas,
  sugestoesDePasso,
  vencidos,
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

test('diasAte e somarDias atravessam mês e ano', () => {
  assert.equal(diasAte('2026-11-02', '2026-11-01'), 1)
  assert.equal(diasAte('2026-10-30', '2026-11-01'), -2)
  assert.equal(somarDias('2026-12-31', 1), '2027-01-01')
})

test('vencidos ignora feitos e sem prazo; novas datas espalham dois por dia a partir de amanhã', () => {
  const base = { projetoId: null, texto: '', energia: 1 as const, criadoEm: 0 }
  const lista = [
    { ...base, id: 'a', ordem: 1, prazo: '2026-10-28' },
    { ...base, id: 'b', ordem: 2, prazo: '2026-10-20' },
    { ...base, id: 'c', ordem: 3, prazo: '2026-10-30' },
    { ...base, id: 'feito', ordem: 4, prazo: '2026-10-01', feitoEm: 1 },
    { ...base, id: 'sem', ordem: 5 },
    { ...base, id: 'futuro', ordem: 6, prazo: '2026-11-05' },
  ]
  const v = vencidos(lista, '2026-11-01')
  assert.deepEqual(v.map((p) => p.id), ['b', 'a', 'c'])
  assert.deepEqual(sugerirNovasDatas(v, '2026-11-01'), [
    { id: 'b', prazo: '2026-11-02' },
    { id: 'a', prazo: '2026-11-02' },
    { id: 'c', prazo: '2026-11-03' },
  ])
})

test('ordemAntesDe: pedaços inseridos antes do mesmo passo ficam na ordem em que foram escritos', () => {
  const base = { projetoId: 'p', texto: '', energia: 1 as const, criadoEm: 0 }
  const passos: Passo[] = [
    { ...base, id: 'a', ordem: 1 },
    { ...base, id: 'grande', ordem: 2 },
  ]
  const alvo = passos[1]
  const primeiro = ordemAntesDe(passos, alvo)
  passos.push({ ...base, id: 'x', ordem: primeiro })
  const segundo = ordemAntesDe(passos, alvo)
  assert.ok(1 < primeiro && primeiro < segundo && segundo < 2)
  assert.equal(ordemAntesDe([alvo], alvo), 1.5)
})

test('proximaRepeticao: dia, semana e mês (31 de janeiro cai em 28 de fevereiro)', () => {
  assert.equal(proximaRepeticao('diario', '2026-12-31'), '2027-01-01')
  assert.equal(proximaRepeticao('semanal', '2026-11-02'), '2026-11-09')
  assert.equal(proximaRepeticao('mensal', '2027-01-31'), '2027-02-28')
  assert.equal(proximaRepeticao('mensal', '2026-11-15'), '2026-12-15')
})

test('paradas: 30 dias ou mais na Caixa, contando do adiamento quando houver, da mais antiga para a mais nova', () => {
  const agora = new Date(2026, 10, 2, 12).getTime()
  const dias = (n: number) => agora - n * 86_400_000
  const capturas = [
    { id: 'nova', texto: 'a', criadoEm: dias(5) },
    { id: 'velha', texto: 'b', criadoEm: dias(45) },
    { id: 'limite', texto: 'c', criadoEm: dias(30) },
    { id: 'adiada', texto: 'd', criadoEm: dias(90), adiadaEm: dias(10) },
  ]
  assert.deepEqual(paradas(capturas, agora).map((c) => c.id), ['velha', 'limite'])
})

test('paradas também serve para ideias com outra validade (90 dias)', () => {
  const agora = new Date(2026, 10, 2, 12).getTime()
  const ideias = [
    { id: 'velha', texto: 'a', projetoId: null, criadoEm: agora - 100 * 86_400_000 },
    { id: 'nova', texto: 'b', projetoId: null, criadoEm: agora - 60 * 86_400_000 },
  ]
  assert.deepEqual(paradas(ideias, agora, 90).map((i) => i.id), ['velha'])
})

test('marcos só no primeiro passo e em totais redondos e raros', () => {
  assert.equal(marcoDePassos(1), 'O primeiro passo feito no MeUsMe.')
  assert.equal(marcoDePassos(100), '100 passos feitos desde o começo.')
  assert.equal(marcoDePassos(2), null)
  assert.equal(marcoDePassos(99), null)
})
