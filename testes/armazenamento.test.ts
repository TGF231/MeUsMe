// Executar com npm test.
import assert from 'node:assert/strict'
import { test } from 'node:test'

// O registro de erros lê a versão do app (definida pelo Vite no build).
;(globalThis as Record<string, unknown>).__VERSAO__ = 'teste'

/** localStorage de mentira: guarda até `limite` caracteres e então recusa, como o navegador com o espaço cheio. */
function armazenamento(limite: number) {
  const dados = new Map<string, string>()
  const total = () => [...dados].reduce((n, [k, v]) => n + k.length + v.length, 0)
  return {
    getItem: (k: string) => dados.get(k) ?? null,
    setItem: (k: string, v: string) => {
      if (total() - (dados.get(k)?.length ?? 0) + k.length + v.length > limite) throw new DOMException('cheio', 'QuotaExceededError')
      dados.set(k, v)
    },
    removeItem: (k: string) => void dados.delete(k),
    key: (i: number) => [...dados.keys()][i] ?? null,
    get length() {
      return dados.size
    },
  }
}

test('espaço cheio não quebra a gravação: a falha acende o aviso uma vez e some quando volta a gravar', async () => {
  const falso = armazenamento(200)
  ;(globalThis as Record<string, unknown>).localStorage = falso
  const { armazenamentoSeguro, useGravacao } = await import('../src/armazenamento.ts')

  armazenamentoSeguro.setItem('meusme', 'x'.repeat(50))
  assert.equal(useGravacao.getState().falhou, false)

  assert.doesNotThrow(() => armazenamentoSeguro.setItem('meusme', 'x'.repeat(500)))
  assert.equal(useGravacao.getState().falhou, true)
  const quando = useGravacao.getState().quando

  // Continua cheio: não registra de novo a cada gravação.
  armazenamentoSeguro.setItem('meusme', 'x'.repeat(600))
  assert.equal(useGravacao.getState().quando, quando)

  // Espaço liberado: a próxima gravação dá certo e o aviso apaga.
  armazenamentoSeguro.setItem('meusme', 'x'.repeat(20))
  assert.equal(useGravacao.getState().falhou, false)
  assert.equal(armazenamentoSeguro.getItem('meusme'), 'x'.repeat(20))
})

test('armazenamento bloqueado (aba anônima, cota do sistema): ler devolve vazio em vez de quebrar', async () => {
  ;(globalThis as Record<string, unknown>).localStorage = {
    getItem: () => {
      throw new DOMException('bloqueado', 'SecurityError')
    },
  }
  const { armazenamentoSeguro } = await import('../src/armazenamento.ts')
  assert.equal(armazenamentoSeguro.getItem('meusme'), null)
})
