import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Categoria, Conta, ContaFixa, Desejo, RegraCategoria, Transacao } from '../types'
import { diasNoMes, hoje, mesISO, novoId } from '../util.ts'

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
  ...categorias('transferencia', [['transferencia', 'Transferência / fatura']]),
]

export const TRANSFERENCIA = 'cat-transferencia'

interface Estado {
  contas: Conta[]
  categorias: Categoria[]
  transacoes: Transacao[]
  fixas: ContaFixa[]
  desejos: Desejo[]
  regras: RegraCategoria[]

  salvarConta: (c: Omit<Conta, 'id'> & { id?: string }) => void
  removerConta: (id: string) => void
  salvarCategoria: (c: Omit<Categoria, 'id'> & { id?: string }) => void
  removerCategoria: (id: string) => void
  lancar: (t: Omit<Transacao, 'id' | 'criadoEm'>) => string
  atualizarTransacao: (id: string, mudancas: Partial<Transacao>) => void
  removerTransacao: (id: string) => void
  /**
   * Remove provisórios (origem: notificação) que correspondem a lançamentos oficiais:
   * mesmo valor e até 3 dias de diferença. Preserva a categoria escolhida no provisório.
   */
  reconciliar: (oficiais: Omit<Transacao, 'id' | 'criadoEm'>[]) => Omit<Transacao, 'id' | 'criadoEm'>[]
  /** Retorna a quantidade de linhas novas. */
  importar: (linhas: Omit<Transacao, 'id' | 'criadoEm'>[]) => number
  salvarFixa: (f: Omit<ContaFixa, 'id'> & { id?: string }) => void
  removerFixa: (id: string) => void
  pagarFixa: (id: string) => void
  adiarCompra: (texto: string, valor: number | undefined, horas: number) => void
  decidirCompra: (id: string, decisao: Desejo['decisao']) => void
  removerDesejo: (id: string) => void
  /** Cria a regra e aplica nos lançamentos sem categoria que já batem com ela; devolve quantos mudaram. */
  criarRegra: (contem: string, categoriaId: string) => number
  removerRegra: (id: string) => void
}

export const useFinancas = create<Estado>()(
  persist(
    (set, get) => ({
      contas: [{ id: 'conta-principal', nome: 'Conta principal', saldoInicial: 0 }],
      categorias: CATEGORIAS_INICIAIS,
      transacoes: [],
      fixas: [],
      desejos: [],
      regras: [],

      salvarConta: (c) =>
        set((s) =>
          s.contas.some((x) => x.id === c.id)
            ? { contas: s.contas.map((x) => (x.id === c.id ? { ...x, ...c, id: x.id } : x)) }
            : { contas: [...s.contas, { ...c, id: c.id ?? novoId() }] },
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

      lancar: (t) => {
        const id = novoId()
        set((s) => ({ transacoes: [{ ...t, id, criadoEm: Date.now() }, ...s.transacoes] }))
        return id
      },
      atualizarTransacao: (id, m) =>
        set((s) => ({ transacoes: s.transacoes.map((t) => (t.id === id ? { ...t, ...m, id } : t)) })),
      removerTransacao: (id) => set((s) => ({ transacoes: s.transacoes.filter((t) => t.id !== id) })),

      reconciliar: (oficiais) => {
        const provisorias = get().transacoes.filter((t) => t.provisoria)
        if (!provisorias.length) return oficiais
        const usadas = new Set<string>()
        const ajustados = oficiais.map((o) => {
          const dia = new Date(`${o.data}T12:00:00`).getTime()
          const par = provisorias.find(
            (p) => !usadas.has(p.id) && p.valor === o.valor && Math.abs(new Date(`${p.data}T12:00:00`).getTime() - dia) <= 3 * 86_400_000,
          )
          if (!par) return o
          usadas.add(par.id)
          return { ...o, categoriaId: par.categoriaId ?? o.categoriaId }
        })
        if (usadas.size) set((s) => ({ transacoes: s.transacoes.filter((t) => !usadas.has(t.id)) }))
        return ajustados
      },

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

      adiarCompra: (texto, valor, horas) =>
        set((s) => ({
          desejos: [{ id: novoId(), texto, valor, criadoEm: Date.now(), decidirEm: Date.now() + horas * 3_600_000 }, ...s.desejos],
        })),
      decidirCompra: (id, decisao) =>
        set((s) => ({ desejos: s.desejos.map((d) => (d.id === id ? { ...d, decisao, decididoEm: Date.now() } : d)) })),
      removerDesejo: (id) => set((s) => ({ desejos: s.desejos.filter((d) => d.id !== id) })),

      criarRegra: (contem, categoriaId) => {
        const regra = { id: novoId(), contem: normalizarTexto(contem), categoriaId, criadoEm: Date.now() }
        const bate = (t: Transacao) => !t.categoriaId && normalizarTexto(t.descricao).includes(regra.contem)
        const aplicadas = get().transacoes.filter(bate).length
        set((s) => ({
          regras: [regra, ...s.regras.filter((r) => r.contem !== regra.contem)],
          transacoes: s.transacoes.map((t) => (bate(t) ? { ...t, categoriaId } : t)),
        }))
        return aplicadas
      },
      removerRegra: (id) => set((s) => ({ regras: s.regras.filter((r) => r.id !== id) })),
    }),
    {
      name: 'meusme-financas',
      version: 2,
      // v2: adiciona a categoria de transferência.
      migrate: (salvo, versao) => {
        const s = salvo as Estado
        if (versao < 2 && !s.categorias.some((c) => c.id === TRANSFERENCIA))
          s.categorias = [...s.categorias, CATEGORIAS_INICIAIS.find((c) => c.id === TRANSFERENCIA)!]
        return s
      },
    },
  ),
)

// Cálculos

export const saldoDaConta = (conta: Conta, transacoes: Transacao[]) =>
  transacoes.reduce((s, t) => (t.contaId === conta.id ? s + t.valor : s), conta.saldoInicial)

export const fixaPagaNoMes = (f: ContaFixa, transacoes: Transacao[], mes = mesISO()) =>
  transacoes.some((t) => t.fixaId === f.id && t.data.startsWith(mes))

/** Dia de vencimento limitado ao último dia do mês. */
export const diaDeVencimento = (f: ContaFixa, mes = mesISO()) => Math.min(f.dia, diasNoMes(mes))

/** Saldo projetado para o fim do mês e valor disponível por dia, descontadas as contas fixas pendentes. */
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
    if (t.categoriaId === TRANSFERENCIA) continue
    if (t.valor < 0) {
      gastos += -t.valor
      porCategoria.set(t.categoriaId, (porCategoria.get(t.categoriaId) ?? 0) - t.valor)
    } else receitas += t.valor
  }
  return { doMes, gastos, receitas, porCategoria }
}

const PALAVRAS: [RegExp, string][] = [
  // Transferências primeiro, para não serem classificadas como gasto ou receita.
  [/pagamento (de |da )?fatura|pagto\.? fatura|fatura paga|pagamento recebido|entre contas|mesma titularidade|aplica[cç][aã]o|resgate|cdb|tesouro direto/i, TRANSFERENCIA],
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
  [/sal[aá]rio|folha de pagamento/i, 'cat-salario'],
]

const normalizar = (s: string) => s.toLowerCase().replace(/\d+/g, '').replace(/\s+/g, ' ').trim()

/** Sem acento e em minúsculas, para as regras de categoria. */
export const normalizarTexto = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()

/** Primeira palavra de uma descrição que serve de regra ("UBER *TRIP 1234" → "uber"), ou null. */
export function palavraDaRegra(descricao: string) {
  return normalizarTexto(descricao).split(/[^a-z0-9]+/).find((p) => p.length >= 3 && !/^\d+$/.test(p)) ?? null
}

/**
 * Categoria sugerida, nesta ordem: as suas regras (V28), a categoria de lançamentos anteriores com a mesma
 * descrição e, por fim, palavras-chave.
 */
export function sugerirCategoria(descricao: string, transacoes: Transacao[], categorias: Categoria[], regras: RegraCategoria[] = []) {
  const texto = normalizarTexto(descricao)
  const regra = regras.find((r) => texto.includes(r.contem) && categorias.some((c) => c.id === r.categoriaId))
  if (regra) return regra.categoriaId
  const alvo = normalizar(descricao)
  const anterior = transacoes.find((t) => t.categoriaId && normalizar(t.descricao) === alvo)
  if (anterior) return anterior.categoriaId
  const achada = PALAVRAS.find(([re]) => re.test(descricao))?.[1]
  return achada && categorias.some((c) => c.id === achada) ? achada : null
}

/** "AAAA-MM" n meses antes de `mes`. */
export function mesAntes(mes: string, n: number) {
  const [a, m] = mes.split('-').map(Number)
  const d = new Date(a, m - 1 - n, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

/**
 * Comparar meses (V26 em docs/CONCORRENTES.md): gasto por categoria do dia 1 até `ateDia` deste mês contra a média
 * do mesmo trecho nos `meses` anteriores que têm lançamentos. Só entram diferenças de pelo menos 20% e R$ 50, da
 * maior para a menor; sem meses anteriores, a lista vem vazia.
 */
export function compararComMesesAnteriores(transacoes: Transacao[], mes: string, ateDia: number, meses = 3) {
  const trecho = (m: string) => {
    const limite = `${m}-${String(ateDia).padStart(2, '0')}`
    return resumoDoMes(
      transacoes.filter((t) => t.data <= limite),
      m,
    ).porCategoria
  }
  const anteriores = Array.from({ length: meses }, (_, i) => mesAntes(mes, i + 1)).filter((m) => transacoes.some((t) => t.data.startsWith(m)))
  if (!anteriores.length) return { meses: 0, diferencas: [] }
  const atual = trecho(mes)
  const somas = new Map<string | null, number>()
  for (const m of anteriores) for (const [c, v] of trecho(m)) somas.set(c, (somas.get(c) ?? 0) + v)
  const categorias = new Set([...atual.keys(), ...somas.keys()])
  const diferencas = [...categorias]
    .map((categoriaId) => {
      const agora = atual.get(categoriaId) ?? 0
      const media = Math.round((somas.get(categoriaId) ?? 0) / anteriores.length)
      return { categoriaId, agora, media, diferenca: agora - media }
    })
    .filter((d) => Math.abs(d.diferenca) >= 5000 && Math.abs(d.diferenca) >= 0.2 * Math.max(d.media, 1))
    .sort((a, b) => Math.abs(b.diferenca) - Math.abs(a.diferenca))
  return { meses: anteriores.length, diferencas }
}
