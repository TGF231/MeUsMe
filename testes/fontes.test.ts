import assert from 'node:assert/strict'
import { test } from 'node:test'
import { haQuanto, saudeDasFontes } from '../src/fontes.ts'
import type { Transacao } from '../src/types.ts'

const DIA = 86_400_000
const agora = Date.UTC(2026, 10, 1, 12)
let n = 0
const t = (diasAtras: number, chaveImport?: string, contaId = 'nu'): Transacao => ({
  id: String(n++),
  contaId,
  categoriaId: null,
  valor: -1000,
  descricao: 'x',
  data: '2026-11-01',
  criadoEm: agora - diasAtras * DIA,
  chaveImport,
})
const contas = [{ id: 'nu', nome: 'Nubank', saldoInicial: 0 }]

test('lançamento manual não vira fonte; notificação, Pluggy e CSV viram', () => {
  const f = saudeDasFontes([t(0), t(1, 'notificacao:com.nu.production:1:2'), t(2, 'pluggy:abc'), t(3, '2026-10-29|x|0')], contas, agora)
  assert.deepEqual(f.map((x) => x.nome).sort(), ['Extrato importado · Nubank', 'Meu Pluggy (Open Finance)', 'Notificações do Nubank'])
})

test('aviso que chegava todo dia e sumiu há 8 dias conta como parado', () => {
  const lista = [8, 9, 10, 11, 12].map((d) => t(d, `notificacao:com.nu.production:${d}`))
  const [f] = saudeDasFontes(lista, contas, agora)
  assert.equal(f.ritmoDias, 1)
  assert.equal(f.parada, true)
  assert.equal(f.diasSemDados, 8)
})

test('uma semana sem gastar não é parada, mesmo com ritmo diário', () => {
  const lista = [5, 6, 7, 8].map((d) => t(d, `notificacao:com.picpay:${d}`))
  assert.equal(saudeDasFontes(lista, contas, agora)[0].parada, false)
})

test('fonte de ritmo semanal só para depois de três semanas', () => {
  const lista = [20, 27, 34, 41].map((d) => t(d, `notificacao:br.com.intermedium:${d}`))
  const [f] = saudeDasFontes(lista, contas, agora)
  assert.equal(f.ritmoDias, 7)
  assert.equal(f.parada, false)
  assert.equal(saudeDasFontes(lista, contas, agora + 2 * DIA)[0].parada, true)
})

test('import em lote conta como um dia só; CSV nunca é "parado"', () => {
  const lote = Array.from({ length: 40 }, () => t(60, '2026-09-01|y|0'))
  const [f] = saudeDasFontes(lote, contas, agora)
  assert.equal(f.ritmoDias, null)
  assert.equal(f.parada, false)
  assert.equal(haQuanto(f.diasSemDados), 'há 60 dias')
})

test('paradas vêm primeiro', () => {
  const lista = [t(0, 'pluggy:1'), ...[30, 31, 32].map((d) => t(d, `notificacao:com.picpay:${d}`))]
  assert.equal(saudeDasFontes(lista, contas, agora)[0].nome, 'Notificações do PicPay')
})
