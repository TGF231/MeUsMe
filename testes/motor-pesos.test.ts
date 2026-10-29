import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { hashDosDados } from '../scripts/motor-treinar.ts'
import { decidir, type MotorRede } from '../src/motor/interpretar.ts'
import { ler, type PesosGravados } from '../src/motor/rede.ts'
import { TUTORIAL } from '../src/motor/tutorial.ts'

const pesos = JSON.parse(readFileSync('src/motor/pesos.json', 'utf8')) as PesosGravados
const rede = ler(pesos)
const sugerindo: MotorRede = { rede, liberado: false, limiar: 1 }
const liberada: MotorRede = { rede, liberado: true, limiar: 0.5 }
const AGORA = new Date(2026, 9, 28, 10, 0)

test('pesos atualizados: mudou dado, característica ou rede, retreine (npm run motor:treinar)', () => {
  assert.equal(pesos.hashDados, hashDosDados())
})

test('regras vencem a rede: os exemplos das regras com marca valem igual com e sem ela', () => {
  for (const tela of TUTORIAL)
    for (const e of tela.exemplos.filter((e) => e.espera))
      assert.deepEqual(decidir(e.texto, AGORA, { rede: liberada }), decidir(e.texto, AGORA), e.texto)
})

test('a rede sugere na Caixa o que as regras deixam em aberto', () => {
  const sugestao = (t: string) => {
    const d = decidir(t, AGORA, { rede: sugerindo })
    return 'caixa' in d ? d.sugestao : `criou ${d.criar.classe}`
  }
  assert.equal(sugestao('ligar para o banco'), 'passo')
  assert.equal(sugestao('quero um kindle novo'), 'compra')
  assert.equal(sugestao('ideia: newsletter sobre plantas'), 'ideia')
  assert.equal(sugestao('consulta no ortopedista'), 'compromisso')
  // Valor sem sinal: a rede escolhe a direção.
  assert.equal(sugestao('R$ 35 almoço'), 'despesa')
  assert.equal(sugestao('R$ 2.000 freela'), 'receita')
  // "salário" já é palavra de direção: a regra decide e cria, sem a rede.
  assert.equal(sugestao('R$ 2.000 salário'), 'criou receita')
})

test('liberada, a rede só cria tarefa solta e direção de valor; nunca ideia nem compra', () => {
  const tarefa = decidir('ligar para o banco', AGORA, { rede: liberada })
  assert.ok('criar' in tarefa && tarefa.porRede && tarefa.criar.classe === 'passo')
  assert.equal(tarefa.criar.titulo, 'Ligar para o banco')

  const valor = decidir('R$ 35 almoço', AGORA, { rede: liberada })
  assert.ok('criar' in valor && valor.criar.classe === 'despesa' && valor.criar.valor === -3500)

  for (const t of ['quero um kindle novo', 'ideia: newsletter sobre plantas']) assert.ok('caixa' in decidir(t, AGORA, { rede: liberada }), t)
})

test('interruptor desligado: nem regra nem rede criam', () => {
  for (const t of ['dentista 13:00', 'ligar para o banco', 'R$ 35 almoço'])
    assert.ok('caixa' in decidir(t, AGORA, { automatico: false, rede: liberada }), t)
})
