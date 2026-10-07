import { useStore } from '../store'
import { useAgenda } from '../stores/agenda'
import { useConfig } from '../stores/config'
import { useFinancas } from '../stores/financas'
import { canonico, type Locais } from './planejar'

type Registro = Record<string, unknown>

// Sintaxe de método de propósito: aceita as lojas do zustand, cujos tipos de estado são mais específicos.
interface Loja {
  getState(): object
  setState(parcial: Record<string, unknown>): void
  subscribe(ouvinte: () => void): () => void
}

interface Colecao {
  /** Nome no servidor. Nunca renomear: é a chave dos dados já sincronizados. */
  nome: string
  loja: Loja
  campo: string
  tipo: 'lista' | 'mapa' | 'valor'
  chave?: (x: Registro) => string
  /** Só os itens que passam aqui sincronizam; os outros ficam só neste aparelho. */
  incluir?: (x: Registro) => boolean
  ordenar?: (a: Registro, b: Registro) => number
}

const maisNovoPrimeiro = (a: Registro, b: Registro) => (b.criadoEm as number) - (a.criadoEm as number)

/**
 * O que sincroniza entre aparelhos. Fica de fora, de propósito:
 * - credenciais (segredo da Pluggy, token do Google, sessão do Supabase);
 * - estado da conexão com o Google (cada aparelho conecta o seu, ou recebe os eventos pela sincronização);
 * - compromissos "encerrados" na tela Agora (detalhe de cada sessão de uso).
 */
const COLECOES: Colecao[] = [
  { nome: 'nucleo.capturas', loja: useStore, campo: 'capturas', tipo: 'lista', ordenar: maisNovoPrimeiro },
  { nome: 'nucleo.projetos', loja: useStore, campo: 'projetos', tipo: 'lista' },
  { nome: 'nucleo.passos', loja: useStore, campo: 'passos', tipo: 'lista' },
  { nome: 'nucleo.ideias', loja: useStore, campo: 'ideias', tipo: 'lista', ordenar: maisNovoPrimeiro },
  { nome: 'nucleo.sessoes', loja: useStore, campo: 'sessoes', tipo: 'lista' },
  { nome: 'nucleo.checkins', loja: useStore, campo: 'checkins', tipo: 'lista', chave: (c) => c.dia as string },
  { nome: 'nucleo.focoId', loja: useStore, campo: 'focoId', tipo: 'valor' },

  { nome: 'financas.contas', loja: useFinancas, campo: 'contas', tipo: 'lista' },
  { nome: 'financas.categorias', loja: useFinancas, campo: 'categorias', tipo: 'lista' },
  { nome: 'financas.transacoes', loja: useFinancas, campo: 'transacoes', tipo: 'lista', ordenar: maisNovoPrimeiro },
  { nome: 'financas.fixas', loja: useFinancas, campo: 'fixas', tipo: 'lista' },

  // Inclui os eventos do Google (com id estável, o mesmo em todos os aparelhos): é assim que eles chegam
  // ao app Android, onde o Google não deixa fazer login.
  { nome: 'agenda.eventos', loja: useAgenda, campo: 'eventos', tipo: 'lista' },
  { nome: 'agenda.lembretes', loja: useAgenda, campo: 'lembretes', tipo: 'lista' },
  { nome: 'agenda.googleClientId', loja: useAgenda, campo: 'googleClientId', tipo: 'valor' },

  { nome: 'config.horaCheckIn', loja: useConfig, campo: 'horaCheckIn', tipo: 'valor' },
  { nome: 'config.horaContas', loja: useConfig, campo: 'horaContas', tipo: 'valor' },
  { nome: 'config.minutosAntesEvento', loja: useConfig, campo: 'minutosAntesEvento', tipo: 'valor' },
  { nome: 'config.avisoFocoMin', loja: useConfig, campo: 'avisoFocoMin', tipo: 'valor' },
  // A cor de destaque acompanha você em todos os aparelhos; claro/escuro fica por aparelho.
  { nome: 'config.acento', loja: useConfig, campo: 'acento', tipo: 'valor' },
  // Avisos já disparados: evita o mesmo lembrete tocar no PC e no celular.
  { nome: 'config.disparados', loja: useConfig, campo: 'disparados', tipo: 'mapa' },
]

const chaveDe = (c: Colecao, x: Registro) => (c.chave ? c.chave(x) : (x.id as string))
const campoDe = (c: Colecao) => (c.loja.getState() as Record<string, unknown>)[c.campo]

/** Fotografia dos dados locais no formato que o planejador entende. */
export function lerLocais(): Locais {
  const locais: Locais = {}
  for (const c of COLECOES) {
    const valor = campoDe(c)
    const m: Record<string, string> = {}
    if (c.tipo === 'lista') {
      for (const x of valor as Registro[]) if (!c.incluir || c.incluir(x)) m[chaveDe(c, x)] = canonico(x)
    } else if (c.tipo === 'mapa') {
      for (const [k, v] of Object.entries(valor as Registro)) m[k] = canonico({ v })
    } else {
      m._ = canonico({ v: valor ?? null })
    }
    locais[c.nome] = m
  }
  return locais
}

let aplicando = false
export const aplicandoRemotas = () => aplicando

/** Aplica nas lojas do app o que chegou do servidor (JSON canônico, ou null = apagar). */
export function aplicarRemotas(mudancas: Record<string, Record<string, string | null>>) {
  const porLoja = new Map<Loja, Record<string, unknown>>()
  for (const c of COLECOES) {
    const m = mudancas[c.nome]
    if (!m || Object.keys(m).length === 0) continue
    let novo: unknown
    if (c.tipo === 'lista') {
      const atual = campoDe(c) as Registro[]
      const vistos = new Set<string>()
      const lista: Registro[] = []
      for (const x of atual) {
        const k = chaveDe(c, x)
        if (c.incluir && !c.incluir(x)) {
          lista.push(x)
          continue
        }
        vistos.add(k)
        if (!(k in m)) lista.push(x)
        else if (m[k] !== null) lista.push(JSON.parse(m[k]!))
      }
      for (const [k, json] of Object.entries(m)) if (!vistos.has(k) && json !== null) lista.push(JSON.parse(json))
      novo = c.ordenar ? lista.sort(c.ordenar) : lista
    } else if (c.tipo === 'mapa') {
      const mapa = { ...(campoDe(c) as Registro) }
      for (const [k, json] of Object.entries(m)) {
        if (json === null) delete mapa[k]
        else mapa[k] = (JSON.parse(json) as { v: unknown }).v
      }
      novo = mapa
    } else {
      const json = m._
      if (json === null || json === undefined) continue
      novo = (JSON.parse(json) as { v: unknown }).v
    }
    porLoja.set(c.loja, { ...(porLoja.get(c.loja) ?? {}), [c.campo]: novo })
  }
  aplicando = true
  try {
    for (const [loja, parcial] of porLoja) loja.setState(parcial)
  } finally {
    aplicando = false
  }
}

/** Avisa quando qualquer dado sincronizável muda neste aparelho (não quando a mudança veio do servidor). */
export function aoMudarLocalmente(ouvinte: () => void) {
  const lojas = [...new Set(COLECOES.map((c) => c.loja))]
  const cancelar = lojas.map((l) =>
    l.subscribe(() => {
      if (!aplicando) ouvinte()
    }),
  )
  return () => cancelar.forEach((f) => f())
}
