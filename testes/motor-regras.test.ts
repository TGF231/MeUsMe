import assert from 'node:assert/strict'
import { test } from 'node:test'
import { lerData, lerHora, limparTitulo, resolverQuando } from '../src/motor/extratores.ts'
import { decidir } from '../src/motor/interpretar.ts'
import { aplicarRegras } from '../src/motor/regras.ts'
import { TUTORIAL } from '../src/motor/tutorial.ts'

// Quarta-feira, 28/10/2026, 10:00, no fuso de quem roda o teste.
const AGORA = new Date(2026, 9, 28, 10, 0)
const em = (dia: number, h: number, m = 0, mes = 9) => new Date(2026, mes, dia, h, m).getTime()

const horas: [string, [number, number] | null][] = [
  ['dentista 13:00', [13, 0]],
  ['dentista às 13:00', [13, 0]],
  ['reunião 15h', [15, 0]],
  ['reunião 15h30', [15, 30]],
  ['reunião 15 horas', [15, 0]],
  ['academia 6h', [6, 0]],
  ['às 3 da tarde', [15, 0]],
  ['as 3 da tarde', [15, 0]],
  ['às 9 da manhã', [9, 0]],
  ['às 8 da noite', [20, 0]],
  ['dentista às 3', [15, 0]],
  ['dentista às 10', [10, 0]],
  ['almoço ao meio-dia', [12, 0]],
  ['meia-noite', [0, 0]],
  // Não são hora
  ['estudar 2h', null],
  ['comprar as 3 camisas', null],
  ['comprar 2 pães', null],
  ['R$ 13,00 lanche', null],
  ['15/11', null],
]

for (const [texto, esperado] of horas) {
  test(`hora: ${texto}`, () => {
    const h = lerHora(texto)
    assert.deepEqual(h && [h.h, h.m], esperado)
  })
}

const datas: [string, number | null][] = [
  ['hoje', em(28, 0)],
  ['amanhã', em(29, 0)],
  ['amanha', em(29, 0)],
  ['depois de amanhã', em(30, 0)],
  ['sexta', em(30, 0)],
  ['na segunda-feira', em(2, 0, 0, 10)],
  ['quarta', em(28, 0)],
  ['sábado', em(31, 0)],
  ['semana que vem', em(2, 0, 0, 10)],
  ['dia 30', em(30, 0)],
  ['dia 5', em(5, 0, 0, 10)],
  ['15/11', em(15, 0, 0, 10)],
  ['10/01', new Date(2027, 0, 10).getTime()],
  ['31/02', null],
  ['ver a planilha', null],
]

for (const [texto, esperado] of datas) {
  test(`data: ${texto}`, () => assert.equal(lerData(texto, AGORA)?.dia.getTime() ?? null, esperado))
}

test('quando: só hora que já passou vai para amanhã', () => {
  assert.equal(resolverQuando(null, lerHora('8:00'), AGORA), em(29, 8))
  assert.equal(resolverQuando(null, lerHora('13:00'), AGORA), em(28, 13))
})

test('quando: dia da semana de hoje com hora passada vai para a próxima semana', () => {
  assert.equal(resolverQuando(lerData('quarta', AGORA), lerHora('8h'), AGORA), em(4, 8, 0, 10))
  assert.equal(resolverQuando(lerData('quarta', AGORA), lerHora('15h'), AGORA), em(28, 15))
})

test('quando: data sem hora fica na hora padrão; hoje com ela passada, na próxima hora cheia', () => {
  assert.equal(resolverQuando(lerData('sexta', AGORA), null, AGORA), em(30, 9))
  assert.equal(resolverQuando(lerData('hoje', AGORA), null, AGORA), em(28, 11))
  assert.equal(resolverQuando(null, null, AGORA), null)
})

test('título: tira os trechos usados e os conectores soltos', () => {
  const t = 'reunião amanhã às 15h com João'
  assert.equal(limparTitulo(t, [lerData(t, AGORA), lerHora(t)]), 'Reunião com João')
  const u = 'dentista no dia 30 às 13:00'
  assert.equal(limparTitulo(u, [lerData(u, AGORA), lerHora(u)]), 'Dentista')
})

// [texto, classe, título, quando ou valor, falta]
const regras: [string, string | null, string?, number?, string?][] = [
  ['dentista 13:00', 'compromisso', 'Dentista', em(28, 13)],
  ['reunião amanhã 15h', 'compromisso', 'Reunião', em(29, 15)],
  ['lembrar de pagar a luz sexta', 'lembrete', 'Pagar a luz', em(30, 9)],
  ['me lembra de ligar pro João amanhã às 14h', 'lembrete', 'Ligar pro João', em(29, 14)],
  ['lembrar de comprar pão', 'lembrete', 'Comprar pão', undefined, 'quando'],
  ['-R$ 35 almoço', 'despesa', 'almoço', -3500],
  ['+R$ 1000 tv', 'receita', 'tv', 100000],
  ['R$ 1000 tv', 'despesa', 'tv', -100000, 'direcao'],
  // Precedência: lembrar > dinheiro > hora.
  ['lembrar de pagar R$ 50 sexta 10h', 'lembrete', 'Pagar R$ 50', em(30, 10)],
  ['-R$ 35 almoço 13h', 'despesa', 'almoço 13h', -3500],
  ['ver aquele negócio do carro', null],
  ['estudar 2h', null],
]

for (const [texto, classe, titulo, numero, falta] of regras) {
  test(`regras: ${texto}`, () => {
    const r = aplicarRegras(texto, AGORA)
    if (classe === null) return assert.equal(r, null)
    assert.ok(r)
    assert.equal(r.classe, classe)
    assert.equal(r.titulo, titulo)
    if (numero !== undefined) assert.equal(r.classe === 'despesa' || r.classe === 'receita' ? r.valor : r.quando, numero)
    assert.equal(r.falta, falta)
  })
}

test('decisão: falta algo ou automático desligado vai para a Caixa com sugestão', () => {
  assert.deepEqual(decidir('lembrar de comprar pão', AGORA), { caixa: true, sugestao: 'lembrete' })
  assert.deepEqual(decidir('R$ 1000 tv', AGORA), { caixa: true, sugestao: 'despesa' })
  assert.deepEqual(decidir('dentista 13:00', AGORA, { automatico: false }), { caixa: true, sugestao: 'compromisso' })
  assert.deepEqual(decidir('ver aquele negócio do carro', AGORA), { caixa: true })
  assert.ok('criar' in decidir('dentista 13:00', AGORA))
})

// O tutorial promete; o motor cumpre.
for (const tela of TUTORIAL)
  for (const e of tela.exemplos)
    test(`tutorial: ${e.texto}`, () => {
      const d = decidir(e.texto, AGORA)
      if (e.espera === null) return assert.deepEqual(d, { caixa: true })
      assert.ok('criar' in d, `"${e.texto}" deveria ser criado sozinho`)
      for (const [campo, valor] of Object.entries(e.espera)) assert.equal(d.criar[campo as keyof typeof d.criar], valor, campo)
    })

// Variações aceitas, mas não ensinadas no tutorial.
// [texto, classe, título, quando, extra]
const variacoes: [string, string | null, string?, number?, Record<string, unknown>?][] = [
  ['reunião 15hrs', 'compromisso', 'Reunião', em(28, 15)],
  ['reunião das 14h às 16h', 'compromisso', 'Reunião', em(28, 14), { fim: em(28, 16) }],
  ['reunião 15h-17h', 'compromisso', 'Reunião', em(28, 15), { fim: em(28, 17) }],
  ['aula 15h às 17', 'compromisso', 'Aula', em(28, 15), { fim: em(28, 17) }],
  ['plantão 22h às 6h', 'compromisso', 'Plantão', em(28, 22), { fim: em(29, 6) }],
  ['churrasco fim de semana 13h', 'compromisso', 'Churrasco', em(31, 13)],
  ['consulta daqui a 3 dias 10h', 'compromisso', 'Consulta', em(31, 10)],
  ['dentista em 2 semanas 9h', 'compromisso', 'Dentista', em(11, 9, 0, 10)],
  ['reunião próxima semana 15h', 'compromisso', 'Reunião', em(2, 15, 0, 10)],
  ['lembrar de ligar pra mãe amanhã de manhã', 'lembrete', 'Ligar pra mãe', em(29, 9)],
  ['lembrar de tirar o lixo hoje à noite', 'lembrete', 'Tirar o lixo', em(28, 19)],
  ['lembrar de pagar o aluguel todo dia 5', 'lembrete', 'Pagar o aluguel', em(5, 9, 0, 10), { repetir: 'mensal' }],
  ['lembrar de tomar o remédio todo dia 8h', 'lembrete', 'Tomar o remédio', em(29, 8), { repetir: 'diario' }],
  // Repetição sem "lembrar" também vira lembrete: compromissos ainda não se repetem.
  ['academia toda segunda 7h', 'lembrete', 'Academia', em(2, 7, 0, 10), { repetir: 'semanal', motivo: 'toda segunda' }],
  ['regar as plantas todas as sextas', 'lembrete', 'Regar as plantas', em(30, 9), { repetir: 'semanal' }],
  ['tomar água todo dia', 'lembrete', 'Tomar água', em(29, 9), { repetir: 'diario' }],
  // "ontem" num lançamento
  ['-35 almoço ontem', 'despesa', 'almoço', undefined, { valor: -3500, data: '2026-10-27' }],
  ['+200 freela anteontem', 'receita', 'freela', undefined, { valor: 20000, data: '2026-10-26' }],
  // Dinheiro vem antes da repetição.
  ['-50 academia todo mês', 'despesa', 'academia todo mês', undefined, { valor: -5000 }],
  // Não são variação
  ['todo mundo no churrasco', null],
  ['viagem fim de semana', null],
]

for (const [texto, classe, titulo, quando, extra] of variacoes) {
  test(`variação: ${texto}`, () => {
    const r = aplicarRegras(texto, AGORA)
    if (classe === null) return assert.equal(r, null)
    assert.ok(r)
    assert.equal(r.classe, classe)
    assert.equal(r.titulo, titulo)
    if (quando !== undefined) assert.equal(r.quando, quando, 'quando')
    for (const [campo, valor] of Object.entries(extra ?? {})) assert.equal(r[campo as keyof typeof r], valor, campo)
  })
}

const PROJETOS = [
  { id: 'p1', titulo: 'Site' },
  { id: 'p2', titulo: 'Mudança de apê' },
]

test('projeto: "site: arrumar o rodapé" vira passo do projeto Site', () => {
  for (const texto of ['site: arrumar o rodapé', 'Site - arrumar o rodapé', 'SITE:arrumar o rodapé']) {
    const d = decidir(texto, AGORA, { projetos: PROJETOS })
    assert.ok('criar' in d, texto)
    assert.equal(d.criar.classe, 'passo')
    assert.equal(d.criar.titulo, 'Arrumar o rodapé')
    assert.deepEqual(d.criar.projeto, { id: 'p1', titulo: 'Site' })
  }
  const d = decidir('mudanca de ape: encaixotar livros', AGORA, { projetos: PROJETOS })
  assert.ok('criar' in d && d.criar.projeto?.id === 'p2', 'sem acento e maiúscula contam igual')
})

test('projeto: as regras vêm antes, e nome que não é de projeto não conta', () => {
  const reuniao = decidir('site: reunião com o cliente 15h', AGORA, { projetos: PROJETOS })
  assert.ok('criar' in reuniao && reuniao.criar.classe === 'compromisso')
  const gasto = decidir('site: -200 hospedagem', AGORA, { projetos: PROJETOS })
  assert.ok('criar' in gasto && gasto.criar.classe === 'despesa')
  assert.deepEqual(decidir('blog: post novo', AGORA, { projetos: PROJETOS }), { caixa: true })
  assert.deepEqual(decidir('site:', AGORA, { projetos: PROJETOS }), { caixa: true })
  assert.deepEqual(decidir('site: arrumar o rodapé', AGORA, { projetos: PROJETOS, automatico: false }), { caixa: true, sugestao: 'passo' })
})

test('compromisso sem hora: o formulário abre com título limpo e o dia', async () => {
  const { prepararCompromisso } = await import('../src/motor/regras.ts')
  assert.deepEqual(prepararCompromisso('consulta dermato dia 12', AGORA), { titulo: 'Consulta dermato', data: new Date(2026, 10, 12) })
  assert.deepEqual(prepararCompromisso('jantar com a Bia sexta', AGORA), { titulo: 'Jantar com a Bia', data: new Date(2026, 9, 30) })
  assert.deepEqual(prepararCompromisso('consulta no oftalmo', AGORA), { titulo: 'Consulta no oftalmo' })
})

test('"não esquecer de" vale como "lembrar de"', () => {
  const r = aplicarRegras('não esquecer de pagar a luz sexta', AGORA)
  assert.ok(r && r.classe === 'lembrete' && r.titulo === 'Pagar a luz' && r.quando === em(30, 9))
  const s = aplicarRegras('nao esquece o guarda chuva', AGORA)
  assert.ok(s && s.classe === 'lembrete' && s.titulo === 'Guarda chuva' && s.falta === 'quando')
  // "lembrei" (passado) e "lembrança" não são lembrete.
  assert.equal(aplicarRegras('lembrei de comprar pão', AGORA), null)
  assert.equal(aplicarRegras('comprar lembrança da viagem', AGORA), null)
})

test('"lembra" só é pedido no começo; no meio, descreve', () => {
  assert.equal(aplicarRegras('bot que lembra de beber água', AGORA), null)
  assert.equal(aplicarRegras('ela lembra de tudo', AGORA), null)
  for (const t of ['lembra de passar protetor', 'me lembra de alongar', 'Lembre de pagar a luz', 'preciso lembrar de pagar a luz', 'lembrete: renovar a cnh'])
    assert.equal(aplicarRegras(t, AGORA)?.classe, 'lembrete', t)
})

// O ditado do Google devolve maiúscula no começo, ponto final e "sexta-feira" por extenso.
const ditadas: [string, string, string, number?][] = [
  ['Lembrar de pagar a luz na sexta-feira.', 'lembrete', 'Pagar a luz', em(30, 9)],
  ['Dentista amanhã às 15h.', 'compromisso', 'Dentista', em(29, 15)],
  ['Reunião com o João às 3 da tarde.', 'compromisso', 'Reunião com o João', em(28, 15)],
  ['Jantar às 8 da noite.', 'compromisso', 'Jantar', em(28, 20)],
  ['Me lembra de ligar para a minha mãe amanhã de manhã.', 'lembrete', 'Ligar para a minha mãe', em(29, 9)],
  ['Academia toda segunda às 7h.', 'lembrete', 'Academia', em(2, 7, 0, 10)],
  ['Menos 35 reais almoço.', 'despesa', 'almoço'],
  ['Comprei um tênis por R$ 250.', 'despesa', 'tênis'],
  ['Paguei 120 reais de luz ontem.', 'despesa', 'luz'],
]

for (const [texto, classe, titulo, quando] of ditadas) {
  test(`ditado: ${texto}`, () => {
    const r = aplicarRegras(texto, AGORA)
    assert.ok(r)
    assert.equal(r.classe, classe)
    assert.equal(r.titulo, titulo)
    if (quando !== undefined) assert.equal(r.quando, quando)
  })
}

test('"às 3:00", "às 3,5" e "às 3.000" não perdem a proteção', () => {
  assert.deepEqual([lerHora('às 3:00')?.h, lerHora('às 3:00')?.m], [3, 0])
  assert.equal(lerHora('dividir às 3,5'), null)
  assert.equal(lerHora('pagar às 3.000'), null)
})
