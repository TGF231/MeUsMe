import { sugerirCategoria, useFinancas } from './stores/financas'
import type { Transacao } from './types'
import { dataISO } from './util'

/**
 * Open Finance pelo Meu Pluggy (gratuito para uso pessoal, até 5 conexões do seu próprio CPF).
 * A API da Pluggy aceita chamadas direto do navegador, então não precisa de servidor.
 *
 * As credenciais ficam numa chave própria do localStorage, de propósito fora do backup:
 * o Client Secret dá acesso de leitura às suas contas e não deve parar num arquivo exportado.
 */

const API = 'https://api.pluggy.ai'
const CHAVE = 'meusme-pluggy'
const DIA = 86_400_000

export interface ConfigPluggy {
  clientId: string
  clientSecret: string
  itemIds: string[]
  ultimaSync?: number
}

export function lerConfigPluggy(): ConfigPluggy | null {
  try {
    return JSON.parse(localStorage.getItem(CHAVE) ?? 'null')
  } catch {
    return null
  }
}

export const salvarConfigPluggy = (c: ConfigPluggy) => localStorage.setItem(CHAVE, JSON.stringify(c))
export const apagarConfigPluggy = () => localStorage.removeItem(CHAVE)

let chaveApi: { valor: string; expira: number; clientId: string } | null = null

async function autenticar(c: ConfigPluggy) {
  if (chaveApi && chaveApi.clientId === c.clientId && Date.now() < chaveApi.expira) return chaveApi.valor
  const r = await fetch(`${API}/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ clientId: c.clientId, clientSecret: c.clientSecret }),
  })
  if (r.status === 401 || r.status === 400 || r.status === 403) throw new Error('A Pluggy recusou o Client ID ou o Client Secret. Confira se copiou os dois inteiros.')
  if (!r.ok) throw new Error(`A Pluggy respondeu com erro ${r.status}.`)
  const { apiKey } = (await r.json()) as { apiKey: string }
  // A chave vale 2 horas; renovamos um pouco antes.
  chaveApi = { valor: apiKey, expira: Date.now() + 110 * 60_000, clientId: c.clientId }
  return apiKey
}

async function get<T>(caminho: string, apiKey: string): Promise<T> {
  const r = await fetch(`${API}${caminho}`, { headers: { 'X-API-KEY': apiKey } })
  if (r.status === 404) throw new Error('Conexão não encontrada. Confira o Item ID copiado do Meu Pluggy.')
  if (!r.ok) throw new Error(`A Pluggy respondeu com erro ${r.status} em ${caminho.split('?')[0]}.`)
  return r.json() as Promise<T>
}

interface ItemPluggy {
  id: string
  status: string
  connector: { name: string }
}

interface ContaPluggy {
  id: string
  type: 'BANK' | 'CREDIT'
  name: string
  marketingName?: string | null
  balance: number
}

interface TransacaoPluggy {
  id: string
  providerId?: string | null
  description: string
  amount: number
  date: string
  status?: 'PENDING' | 'POSTED'
}

interface Pagina<T> {
  results: T[]
  totalPages?: number
}

export interface ResultadoSync {
  contas: number
  novas: number
  avisos: string[]
}

let emAndamento: Promise<ResultadoSync> | null = null

/**
 * Baixa contas e lançamentos de cada conexão e espelha no app:
 * - cada conta do banco vira (ou atualiza) uma conta local;
 * - lançamentos novos entram já categorizados, sem duplicar os que já existem;
 * - o saldo local é acertado para bater com o saldo que o banco informa.
 * Pedidos simultâneos (ex.: abrir Finanças enquanto já sincroniza) reaproveitam a mesma sincronização.
 */
export function sincronizarPluggy(): Promise<ResultadoSync> {
  emAndamento ??= sincronizar().finally(() => (emAndamento = null))
  return emAndamento
}

async function sincronizar(): Promise<ResultadoSync> {
  const cfg = lerConfigPluggy()
  if (!cfg) throw new Error('Open Finance ainda não configurado.')
  const apiKey = await autenticar(cfg)
  // Na primeira vez, 90 dias de histórico; depois, uma semana de folga para pegar ajustes do banco.
  const desde = dataISO(cfg.ultimaSync ? cfg.ultimaSync - 7 * DIA : Date.now() - 90 * DIA)
  const resultado: ResultadoSync = { contas: 0, novas: 0, avisos: [] }

  for (const itemId of cfg.itemIds) {
    const item = await get<ItemPluggy>(`/items/${encodeURIComponent(itemId)}`, apiKey)
    if (item.status === 'LOGIN_ERROR' || item.status === 'OUTDATED')
      resultado.avisos.push(`${item.connector.name}: a conexão precisa ser renovada no Meu Pluggy.`)
    const { results: contas } = await get<Pagina<ContaPluggy>>(`/accounts?itemId=${encodeURIComponent(itemId)}`, apiKey)

    for (const conta of contas) {
      resultado.contas++
      const credito = conta.type === 'CREDIT'
      const idLocal = `pluggy-${conta.id}`
      const fin = useFinancas.getState()
      if (!fin.contas.some((c) => c.id === idLocal)) {
        fin.salvarConta({
          id: idLocal,
          nome: `${item.connector.name} · ${conta.marketingName || conta.name}${credito && !/cart/i.test(conta.name) ? ' (cartão)' : ''}`,
          saldoInicial: 0,
          pluggyId: conta.id,
        })
      }

      const transacoes: TransacaoPluggy[] = []
      for (let pagina = 1; ; pagina++) {
        const r = await get<Pagina<TransacaoPluggy>>(
          `/transactions?accountId=${encodeURIComponent(conta.id)}&from=${desde}&pageSize=500&page=${pagina}`,
          apiKey,
        )
        transacoes.push(...r.results)
        if (!r.totalPages || pagina >= r.totalPages) break
      }

      // Pendentes podem mudar de id quando confirmadas; entram na próxima sincronização, já definitivas.
      const atual = useFinancas.getState()
      const linhas: Omit<Transacao, 'id' | 'criadoEm'>[] = transacoes
        .filter((t) => t.status !== 'PENDING')
        .map((t) => ({
          contaId: idLocal,
          // No cartão a Pluggy usa o sinal invertido: positivo é compra.
          valor: Math.round(t.amount * 100) * (credito ? -1 : 1),
          descricao: t.description,
          data: t.date.slice(0, 10),
          categoriaId: sugerirCategoria(t.description, atual.transacoes, atual.categorias),
          chaveImport: `pluggy:${t.providerId || t.id}`,
        }))
      // Só os novos de verdade; cada um substitui o provisório que veio da notificação do banco, se houver.
      const existentes = new Set(atual.transacoes.map((t) => t.chaveImport))
      resultado.novas += atual.importar(atual.reconciliar(linhas.filter((l) => !existentes.has(l.chaveImport))))

      // Acerta o saldo: saldo inicial = saldo do banco − soma dos lançamentos que o app conhece.
      const depois = useFinancas.getState()
      const soma = depois.transacoes.filter((t) => t.contaId === idLocal).reduce((s, t) => s + t.valor, 0)
      const saldoBanco = Math.round(conta.balance * 100) * (credito ? -1 : 1)
      const local = depois.contas.find((c) => c.id === idLocal)!
      depois.salvarConta({ ...local, saldoInicial: saldoBanco - soma })
    }
  }

  salvarConfigPluggy({ ...cfg, ultimaSync: Date.now() })
  return resultado
}
