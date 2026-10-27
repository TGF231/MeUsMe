import assert from 'node:assert/strict'
import { test } from 'node:test'
import { lerBackup, montarBackup } from '../src/backup.ts'

const armazenado: Record<string, string> = {
  meusme: JSON.stringify({ state: { passos: [{ id: 'p1', texto: 'Ligar' }] }, version: 1 }),
  'meusme-financas': JSON.stringify({ state: { transacoes: [] }, version: 2 }),
}

test('exportar e restaurar devolve o mesmo conteúdo', () => {
  const arquivo = montarBackup((k) => armazenado[k] ?? null)
  assert.deepEqual(lerBackup(arquivo), armazenado)
})

test('arquivos inválidos dão erro claro, sem nada para gravar', () => {
  assert.throws(() => lerBackup('{isso não é json'), /não é um backup válido/)
  assert.throws(() => lerBackup(JSON.stringify({ app: 'Outro', dados: {} })), /não é um backup do MeUsMe/)
  assert.throws(() => lerBackup(JSON.stringify({ app: 'MeUsMe', versao: 99, dados: armazenado })), /versão mais nova/)
  assert.throws(() => lerBackup(JSON.stringify({ app: 'MeUsMe', versao: 1, dados: {} })), /vazio/)
  // Uma chave danificada invalida o arquivo todo, mesmo com as outras boas.
  assert.throws(() => lerBackup(JSON.stringify({ app: 'MeUsMe', versao: 1, dados: { ...armazenado, 'meusme-agenda': '{quebrado' } })), /danificado/)
  assert.throws(() => lerBackup(JSON.stringify({ app: 'MeUsMe', versao: 1, dados: { meusme: '{"sem":"state"}' } })), /danificado/)
})
