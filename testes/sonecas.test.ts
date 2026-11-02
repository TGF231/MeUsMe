import assert from 'node:assert/strict'
import { test } from 'node:test'
import { adiar, chaveOriginal, idDoLembrete } from '../src/sonecas.ts'

test('id do lembrete só em chaves de lembrete, com ou sem soneca', () => {
  assert.equal(idDoLembrete('lembrete:abc:1000'), 'abc')
  assert.equal(idDoLembrete('lembrete:abc:1000:soneca:2000'), 'abc')
  assert.equal(idDoLembrete('evento:abc:1000'), null)
  assert.equal(idDoLembrete(undefined), null)
})

test('soneca em cima de soneca não acumula sufixos e descarta as antigas', () => {
  const agora = 10 * 86_400_000
  const antiga = { chave: 'lembrete:x:1:soneca:2', quando: agora - 2 * 86_400_000, titulo: 'L', corpo: 'velha' }
  const lista = adiar([antiga], { chave: 'lembrete:abc:1000:soneca:5000', titulo: 'Lembrete', corpo: 'Ligar' }, agora)
  assert.deepEqual(lista, [{ chave: `lembrete:abc:1000:soneca:${agora + 600_000}`, quando: agora + 600_000, titulo: 'Lembrete', corpo: 'Ligar' }])
  assert.equal(chaveOriginal(lista[0].chave), 'lembrete:abc:1000')
})
