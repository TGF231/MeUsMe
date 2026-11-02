import assert from 'node:assert/strict'
import { test } from 'node:test'
import { buscar, type Fontes } from '../src/busca.ts'

const vazio: Fontes = { projetos: [], passos: [], ideias: [], capturas: [], transacoes: [], eventos: [], lembretes: [] }
const f: Fontes = {
  ...vazio,
  projetos: [{ id: 'p', titulo: 'Reforma do banheiro', chegada: 'Azulejo colocado', criadoEm: 1 }],
  passos: [
    { id: 'a', projetoId: 'p', texto: 'Ligar para o pedreiro', energia: 1, ordem: 1, criadoEm: 2 },
    { id: 'b', projetoId: null, texto: 'Pagar pedreiro', energia: 1, ordem: 1, criadoEm: 3, feitoEm: 10 },
  ],
  transacoes: [{ id: 't', contaId: 'c', categoriaId: null, valor: -5000, descricao: 'Pedreiro (diária)', data: '2026-10-30', criadoEm: 5 }],
  capturas: [{ id: 'c', texto: 'ideia: azulejo branco', criadoEm: 4 }],
}

test('sem acento e sem maiúscula, em vários tipos', () => {
  const r = buscar(f, 'PEDREIRO')
  assert.deepEqual(r.map((x) => x.tipo).sort(), ['Lançamento', 'Passo', 'Passo feito'])
})

test('todas as palavras precisam aparecer', () => {
  assert.deepEqual(buscar(f, 'azulejo branco').map((x) => x.chave), ['captura:c'])
  assert.deepEqual(buscar(f, 'reforma azulejo').map((x) => x.chave), ['projeto:p'])
})

test('passo feito leva ao Histórico; pendente leva ao projeto', () => {
  const r = buscar(f, 'pedreiro')
  assert.equal(r.find((x) => x.chave === 'passo:b')?.aba, 'historico')
  assert.equal(r.find((x) => x.chave === 'passo:a')?.projetoId, 'p')
})

test('seção desligada fica fora; termo vazio não traz nada', () => {
  assert.equal(buscar(f, 'pedreiro', ['financas']).some((x) => x.tipo === 'Lançamento'), false)
  assert.deepEqual(buscar(f, '   '), [])
})

test('quem começa com o termo vem primeiro', () => {
  assert.equal(buscar(f, 'pedreiro')[0].chave, 'lancamento:t')
})
