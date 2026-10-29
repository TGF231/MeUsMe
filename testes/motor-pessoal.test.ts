import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { decidir, palpite } from '../src/motor/interpretar.ts'
import { acrescentar, comCamadaPessoal, MAXIMO_DE_EXEMPLOS, memoriaDe, retreinarUltimaCamada, type ExemploPessoal } from '../src/motor/pessoal.ts'
import { ler, type PesosGravados } from '../src/motor/rede.ts'
import type { Classe } from '../src/motor/regras.ts'

const pesos = JSON.parse(readFileSync('src/motor/pesos.json', 'utf8')) as PesosGravados
const base = ler(pesos)
const AGORA = new Date(2026, 9, 28, 10, 0)
const ex = (texto: string, classe: Classe, em = 0): ExemploPessoal => ({ texto, classe, em })

test('exemplos: o mesmo texto substitui o anterior, e o total tem limite', () => {
  let lista = acrescentar([], ex('R$ 1000 tv', 'despesa'))
  lista = acrescentar(lista, ex('R$ 1200 TV', 'receita'))
  assert.equal(lista.length, 1)
  assert.equal(lista[0].classe, 'receita')
  for (let i = 0; i < MAXIMO_DE_EXEMPLOS + 10; i++) lista = acrescentar(lista, ex(`tarefa ${'x'.repeat(i % 50)} ${i % 7} ${String.fromCharCode(97 + (i % 26))}${i}`, 'passo'))
  assert.equal(lista.length, MAXIMO_DE_EXEMPLOS)
})

test('memória: o mesmo texto vale como você organizou da última vez', () => {
  const memoria = memoriaDe([ex('comprar pão', 'passo'), ex('R$ 1000 tv', 'receita'), ex('podcast de plantas', 'ideia')])
  const tarefa = decidir('comprar pão', AGORA, { memoria })
  assert.ok('criar' in tarefa && tarefa.origem === 'memoria' && tarefa.criar.classe === 'passo')

  // Algarismos contam como iguais: R$ 1200 é "o mesmo texto" que R$ 1000.
  const venda = decidir('R$ 1200 tv', AGORA, { memoria })
  assert.ok('criar' in venda && venda.origem === 'memoria' && venda.criar.classe === 'receita' && venda.criar.valor === 120000)

  // Ideia nunca é criada sozinha, nem pela memória.
  assert.deepEqual(decidir('podcast de plantas', AGORA, { memoria }), { caixa: true, sugestao: 'ideia' })
  // Interruptor desligado: só sugere.
  assert.deepEqual(decidir('comprar pão', AGORA, { memoria, automatico: false }), { caixa: true, sugestao: 'passo' })
})

test('memória: as regras do tutorial continuam valendo antes dela', () => {
  const memoria = memoriaDe([ex('dentista 13:00', 'ideia'), ex('-35 almoço', 'receita')])
  const d1 = decidir('dentista 13:00', AGORA, { memoria })
  assert.ok('criar' in d1 && d1.origem === 'regra' && d1.criar.classe === 'compromisso')
  const d2 = decidir('-35 almoço', AGORA, { memoria })
  assert.ok('criar' in d2 && d2.origem === 'regra' && d2.criar.classe === 'despesa')
})

test('retreino da última camada: aprende que quem vende registra venda, sem esquecer o resto', () => {
  const produtos = ['tv', 'geladeira', 'notebook', 'celular', 'fogão', 'sofá', 'bicicleta', 'videogame', 'cama', 'mesa', 'tablet', 'monitor', 'ventilador', 'impressora', 'armário', 'cadeira', 'liquidificador', 'som', 'câmera', 'máquina de lavar']
  const vendas = produtos.map((p, i) => ex(`R$ ${800 + i * 50} ${p}`, 'receita'))
  const pessoal = { hashDados: pesos.hashDados, exemplos: vendas.length, ...retreinarUltimaCamada(base, vendas, pesos.revisao) }
  const minha = comCamadaPessoal(base, pesos.hashDados, pessoal)

  const antes = palpite(base, 'R$ 1500 microondas', ['despesa', 'receita'])
  const depois = palpite(minha, 'R$ 1500 microondas', ['despesa', 'receita'])
  const pReceita = (p: { classe: string; certeza: number }) => (p.classe === 'receita' ? p.certeza : 1 - p.certeza)
  assert.ok(pReceita(depois) > 0.8, `depois: ${JSON.stringify(depois)} (antes: ${JSON.stringify(antes)})`)
  assert.ok(pReceita(depois) > pReceita(antes) + 0.2, `antes ${pReceita(antes)}, depois ${pReceita(depois)}`)

  // O que não foi corrigido continua igual, inclusive gasto comum, que não é venda.
  for (const [texto, classe] of [['ligar para o banco', 'passo'], ['quero um kindle novo', 'compra'], ['ideia: newsletter sobre plantas', 'ideia']] as const)
    assert.equal(palpite(minha, texto).classe, classe, texto)
  for (const texto of ['R$ 35 almoço', 'R$ 120 uber', 'R$ 60 farmácia'])
    assert.equal(palpite(minha, texto, ['despesa', 'receita']).classe, 'despesa', texto)
})

test('camada pessoal de outros pesos de fábrica é ignorada', () => {
  const pessoal = { hashDados: 'outro', exemplos: 1, w2: Array.from(base.w2, () => 0), b2: Array.from(base.b2, () => 0) }
  assert.equal(comCamadaPessoal(base, pesos.hashDados, pessoal), base)
})
