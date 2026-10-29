import { caracteristicas } from './caracteristicas.ts'
import { chaveDaMemoria } from './pessoal.ts'
import { prever, type Rede } from './rede.ts'
import { aplicarRegras, passoDeProjeto, type Classe, type Interpretacao } from './regras.ts'

/** Quem decidiu: uma regra do tutorial, a sua correção anterior para o mesmo texto, ou a rede. */
export type Origem = 'regra' | 'memoria' | 'rede'

export type Decisao = { criar: Interpretacao; origem: Origem } | { caixa: true; sugestao?: Classe }

/** A rede carregada e o que a avaliação com capturas reais liberou (scripts/motor-avaliar.ts). */
export interface MotorRede {
  rede: Rede
  /** Só a avaliação liga: até lá a rede apenas sugere na Caixa. */
  liberado: boolean
  /** Certeza mínima para criar sozinho. */
  limiar: number
  /** Dos pesos de fábrica: a camada pessoal só vale sobre os mesmos pesos. */
  hashDados?: string
  /** Amostra do treino para o retreino no aparelho (src/motor/pessoal.ts). */
  revisao?: { texto: string; classe: string }[]
}

export interface OpcoesMotor {
  /** Ajustes → Organizar capturas sozinho. Desligado, o motor só sugere. */
  automatico?: boolean
  horaLembrete?: number
  rede?: MotorRede | null
  /** Como você organizou cada texto antes (src/motor/pessoal.ts). */
  memoria?: Map<string, Classe>
  /** Projetos abertos, para "site: arrumar o rodapé" virar passo do projeto Site. */
  projetos?: { id: string; titulo: string }[]
}

/** Abaixo disso a rede não arrisca nem sugestão: a captura fica na Caixa como veio. */
export const SUGERE_A_PARTIR = 0.5

export interface Palpite {
  classe: Classe
  certeza: number
}

/** O palpite da rede entre todas as classes, ou só entre as que se passar. */
export function palpite(rede: Rede, texto: string, entre?: Classe[]): Palpite {
  const p = prever(rede, caracteristicas(texto))
  const candidatas = (entre ?? (rede.classes as Classe[])).map((c) => ({ classe: c, p: p[rede.classes.indexOf(c)] ?? 0 }))
  const total = candidatas.reduce((s, c) => s + c.p, 0) || 1
  const melhor = candidatas.reduce((a, b) => (b.p > a.p ? b : a), candidatas[0])
  return { classe: melhor.classe, certeza: melhor.p / total }
}

const comMaiuscula = (t: string) => t.charAt(0).toUpperCase() + t.slice(1)

/**
 * Decide o destino de uma captura: criar o item na hora ou guardar na Caixa.
 *
 * 1. Regras, sempre primeiro: o que o tutorial ensina não depende de mais nada. Depois delas,
 *    o prefixo de projeto ("site: …").
 * 2. A sua correção para o mesmo texto: vale o que você fez da última vez.
 * 3. A rede, só depois de liberada pela avaliação com capturas reais.
 *
 * Memória e rede só criam tarefa solta e a direção de um valor sem sinal; o resto vira sugestão.
 */
export function decidir(texto: string, agora: Date, { automatico = true, horaLembrete = 9, rede, memoria, projetos = [] }: OpcoesMotor = {}): Decisao {
  const r = aplicarRegras(texto, agora, horaLembrete)
  const lembrado = memoria?.get(chaveDaMemoria(texto))
  const redeCria = (certeza: number) => !!rede && rede.liberado && certeza >= rede.limiar

  if (r?.falta === 'direcao') {
    // "R$ 1000 tv": a regra achou o valor; a memória ou a rede escolhem entre saída e entrada.
    const comDirecao = (classe: Classe): Interpretacao => ({ ...r, classe, valor: Math.abs(r.valor!) * (classe === 'receita' ? 1 : -1), falta: undefined })
    if (lembrado === 'despesa' || lembrado === 'receita') return automatico ? { criar: comDirecao(lembrado), origem: 'memoria' } : { caixa: true, sugestao: lembrado }
    if (!rede) return { caixa: true, sugestao: r.classe }
    const { classe, certeza } = palpite(rede.rede, texto, ['despesa', 'receita'])
    return automatico && redeCria(certeza) ? { criar: comDirecao(classe), origem: 'rede' } : { caixa: true, sugestao: classe }
  }
  if (r) {
    if (!automatico || r.falta) return { caixa: true, sugestao: r.classe }
    return { criar: r, origem: 'regra' }
  }

  // Variação: "site: arrumar o rodapé" é passo do projeto Site. Depois das regras: "site: reunião 15h" é compromisso.
  const deProjeto = passoDeProjeto(texto, projetos)
  if (deProjeto) return automatico ? { criar: deProjeto, origem: 'regra' } : { caixa: true, sugestao: 'passo' }

  const tarefa = (origem: Origem): Decisao => ({ criar: { classe: 'passo', titulo: comMaiuscula(texto.trim()), motivo: '' }, origem })
  if (lembrado) return lembrado === 'passo' && automatico ? tarefa('memoria') : { caixa: true, sugestao: lembrado }

  if (!rede) return { caixa: true }
  const { classe, certeza } = palpite(rede.rede, texto)
  // Pela rede, só tarefa solta é criada sozinha: compromisso e lembrete precisam de hora ou data,
  // dinheiro precisa de valor, e ideia ou compra mal classificadas somem da tela Agora.
  if (classe === 'passo' && automatico && redeCria(certeza)) return tarefa('rede')
  return certeza >= SUGERE_A_PARTIR ? { caixa: true, sugestao: classe } : { caixa: true }
}
