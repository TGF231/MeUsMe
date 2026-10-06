import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Categoria, Conta, ContaFixa, Transacao } from '../types'
import { diasNoMes, hoje, mesISO, novoId } from '../util'

const categorias = (tipo: Categoria['tipo'], lista: [string, string][]): Categoria[] =>
  lista.map(([id, nome]) => ({ id: `cat-${id}`, nome, tipo }))

const CATEGORIAS_INICIAIS: Categoria[] = [
  ...categorias('gasto', [
    ['alimentacao', 'Alimentação'],
    ['mercado', 'Mercado'],
    ['transporte', 'Transporte'],
    ['moradia', 'Moradia'],
    ['contas', 'Contas da casa'],
    ['saude', 'Saúde'],
    ['lazer', 'Lazer'],
    ['compras', 'Compras'],
    ['educacao', 'Educação'],
    ['assinaturas', 'Assinaturas'],
    ['outros-gastos', 'Outros'],
  ]),
  ...categorias('receita', [
    ['salario', 'Salário'],
    ['extra', 'Renda extra'],
    ['outras-receitas', 'Outras receitas'],
  ]),
]

interface Estado {
  contas: Conta[]
  categorias: Categoria[]
  transacoes: Transacao[]
  fixas: ContaFixa[]

  salvarConta: (c: Omit<Conta, 'id'> & { id?: string }) => void
  removerConta: (id: string) => void
  salvarCategoria: (c: Omit<Categoria, 'id'> & { id?: string }) => void
  removerCategoria: (id: string) => void
  lancar: (t: Omit<Transacao, 'id' | 'criadoEm'>) => void
  atualizarTransacao: (id: string, mudancas: Partial<Transacao>) => void
  removerTransacao: (id: string) => void
  /** Devolve quantas linhas eram novas. */
  importar: (linhas: Omit<Transacao, 'id' | 'criadoEm'>[]) => number
  salvarFixa: (f: Omit<ContaFixa, 'id'> & { id?: string }) => void
  removerFixa: (id: string) => void
  pagarFixa: (id: string) => void
}

export const useFinancas = create<Estado>()(
  persist(
    (set, get) => ({
      contas: [{ id: 'conta-principal', nome: 'Conta principal', saldoInicial: 0 }],
      categorias: CATEGORIAS_INICIAIS,
      transacoes: [],
      fixas: [],

      salvarConta: (c) =>
        set((s) =>
          c.id
            ? { contas: s.contas.map((x) => (x.id === c.id ? { ...x, ...c, id: x.id } : x)) }
            : { contas: [...s.contas, { ...c, id: novoId() }] },
        ),
      removerConta: (id) =>
        set((s) => ({
          contas: s.contas.filter((c) => c.id !== id),
          transacoes: s.transacoes.filter((t) => t.contaId !== id),
          fixas: s.fixas.filter((f) => f.contaId !== id),
        })),

      salvarCategoria: (c) =>
        set((s) =>
          c.id
            ? { categorias: s.categorias.map((x) => (x.id === c.id ? { ...x, ...c, id: x.id } : x)) }
            : { categorias: [...s.categorias, { ...c, id: novoId() }] },
        ),
      removerCategoria: (id) =>
        set((s) => ({
          categorias: s.categorias.filter((c) => c.id !== id),
          transacoes: s.transacoes.map((t) => (t.categoriaId === id ? { ...t, categoriaId: null } : t)),
        })),

      lancar: (t) => set((s) => ({ transacoes: [{ ...t, id: novoId(), criadoEm: Date.now() }, ...s.transacoes] })),
      atualizarTransacao: (id, m) =>
        set((s) => ({ transacoes: s.transacoes.map((t) => (t.id === id ? { ...t, ...m, id } : t)) })),
      removerTransacao: (id) => set((s) => ({ transacoes: s.transacoes.filter((t) => t.id !== id) })),

      importar: (linhas) => {
        const existentes = new Set(get().transacoes.map((t) => t.chaveImport).filter(Boolean))
        const novas = linhas
          .filter((l) => !l.chaveImport || !existentes.has(l.chaveImport))
          .map((l) => ({ ...l, id: novoId(), criadoEm: Date.now() }))
        set((s) => ({ transacoes: [...novas, ...s.transacoes] }))
        return novas.length
      },

      salvarFixa: (f) =>
        set((s) =>
          f.id
            ? { fixas: s.fixas.map((x) => (x.id === f.id ? { ...x, ...f, id: x.id } : x)) }
            : { fixas: [...s.fixas, { ...f, id: novoId() }] },
        ),
      removerFixa: (id) => set((s) => ({ fixas: s.fixas.filter((f) => f.id !== id) })),
      pagarFixa: (id) => {
        const f = get().fixas.find((x) => x.id === id)
        if (!f) return
        get().lancar({
          contaId: f.contaId,
          categoriaId: f.categoriaId,
          valor: f.tipo === 'gasto' ? -f.valor : f.valor,
          descricao: f.nome,
          data: hoje(),
          fixaId: f.id,
        })
      },
    }),
    { name: 'meusme-financas', version: 1 },
  ),
)

// ── Cálculos ──

export const saldoDaConta = (conta: Conta, transacoes: Transacao[]) =>
  transacoes.reduce((s, t) => (t.contaId === conta.id ? s + t.valor : s), conta.saldoInicial)

export const fixaPagaNoMes = (f: ContaFixa, transacoes: Transacao[], mes = mesISO()) =>
  transacoes.some((t) => t.fixaId === f.id && t.data.startsWith(mes))

/** Dia de vencimento real naquele mês (dia 31 vira 30 em meses curtos). */
export const diaDeVencimento = (f: ContaFixa, mes = mesISO()) => Math.min(f.dia, diasNoMes(mes))

/**
 * O número que importa para quem não quer planilha: quanto dá para gastar por dia
 * até o fim do mês sem atrasar nenhuma conta fixa.
 */
export function previsaoDoMes(contas: Conta[], transacoes: Transacao[], fixas: ContaFixa[]) {
  const mes = mesISO()
  const saldo = contas.reduce((s, c) => s + saldoDaConta(c, transacoes), 0)
  const pendentes = fixas.filter((f) => !fixaPagaNoMes(f, transacoes, mes))
  const aPagar = pendentes.filter((f) => f.tipo === 'gasto').reduce((s, f) => s + f.valor, 0)
  const aReceber = pendentes.filter((f) => f.tipo === 'receita').reduce((s, f) => s + f.valor, 0)
  const livre = saldo - aPagar + aReceber
  const diasRestantes = diasNoMes(mes) - new Date().getDate() + 1
  return { saldo, aPagar, aReceber, livre, diasRestantes, porDia: Math.floor(livre / diasRestantes) }
}

export function resumoDoMes(transacoes: Transacao[], mes: string) {
  const doMes = transacoes.filter((t) => t.data.startsWith(mes))
  const porCategoria = new Map<string | null, number>()
  let gastos = 0
  let receitas = 0
  for (const t of doMes) {
    if (t.valor < 0) {
      gastos += -t.valor
      porCategoria.set(t.categoriaId, (porCategoria.get(t.categoriaId) ?? 0) - t.valor)
    } else receitas += t.valor
  }
  return { doMes, gastos, receitas, porCategoria }
}

const PALAVRAS: [RegExp, string][] = [
  [/uber|99 ?(app|pop|taxi)|taxi|combust|posto|shell|ipiranga|estaciona|metr[oô]|onibus|bilhete/i, 'cat-transporte'],
  [/ifood|rappi|restaurante|lanch|padaria|pizza|burger|cafe|bar /i, 'cat-alimentacao'],
  [/mercado|supermerc|atacad|assai|carrefour|hortifruti|feira/i, 'cat-mercado'],
  [/netflix|spotify|prime|disney|hbo|max|youtube|apple\.com|google ?one|icloud|chatgpt|claude/i, 'cat-assinaturas'],
  [/farm[aá]cia|drogaria|droga|raia|pacheco|m[eé]dic|cl[ií]nica|hospital|odonto|dentista|psic/i, 'cat-saude'],
  [/aluguel|condom[ií]nio|iptu/i, 'cat-moradia'],
  [/luz|energia|enel|cemig|light|copel|[aá]gua|sabesp|internet|vivo|claro|tim|oi /i, 'cat-contas'],
  [/curso|udemy|alura|livraria|faculdade|escola/i, 'cat-educacao'],
  [/cinema|show|ingresso|steam|playstation|xbox|nintendo/i, 'cat-lazer'],
  [/amazon|mercado ?livre|shopee|magalu|aliexpress|shein|renner|riachuelo/i, 'cat-compras'],
  [/sal[aá]rio|folha|pagamento recebido/i, 'cat-salario'],
]

const normalizar = (s: string) => s.toLowerCase().replace(/\d+/g, '').replace(/\s+/g, ' ').trim()

/** Primeiro aprende com o que você já categorizou; depois tenta por palavras conhecidas. */
export function sugerirCategoria(descricao: string, transacoes: Transacao[], categorias: Categoria[]) {
  const alvo = normalizar(descricao)
  const anterior = transacoes.find((t) => t.categoriaId && normalizar(t.descricao) === alvo)
  if (anterior) return anterior.categoriaId
  const achada = PALAVRAS.find(([re]) => re.test(descricao))?.[1]
  return achada && categorias.some((c) => c.id === achada) ? achada : null
}
