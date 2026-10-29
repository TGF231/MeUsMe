import { caracteristicas } from './caracteristicas.ts'
import { prever, type Rede } from './rede.ts'
import { aplicarRegras, type Classe, type Interpretacao } from './regras.ts'

export type Decisao = { criar: Interpretacao; porRede?: boolean } | { caixa: true; sugestao?: Classe }

/** A rede carregada e o que a avaliação com capturas reais liberou (scripts/motor-avaliar.ts). */
export interface MotorRede {
  rede: Rede
  /** Só a avaliação liga: até lá a rede apenas sugere na Caixa. */
  liberado: boolean
  /** Certeza mínima para criar sozinho. */
  limiar: number
}

export interface OpcoesMotor {
  /** Ajustes → Organizar capturas sozinho. Desligado, o motor só sugere. */
  automatico?: boolean
  horaLembrete?: number
  rede?: MotorRede | null
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

/**
 * Decide o destino de uma captura: criar o item na hora ou guardar na Caixa.
 * Regras primeiro, sempre: o que o tutorial ensina não depende da rede. A rede decide só o que
 * as regras deixam em aberto (valor sem sinal; frase sem hora, "lembrar" nem valor) e só cria
 * sozinha depois de liberada pela avaliação com capturas reais.
 */
export function decidir(texto: string, agora: Date, { automatico = true, horaLembrete = 9, rede }: OpcoesMotor = {}): Decisao {
  const r = aplicarRegras(texto, agora, horaLembrete)
  const podeCriarPelaRede = (certeza: number) => !!rede && automatico && rede.liberado && certeza >= rede.limiar

  if (r?.falta === 'direcao' && rede) {
    // "R$ 1000 tv": a regra achou o valor, a rede escolhe entre saída e entrada.
    const { classe, certeza } = palpite(rede.rede, texto, ['despesa', 'receita'])
    const valor = Math.abs(r.valor!) * (classe === 'receita' ? 1 : -1)
    if (podeCriarPelaRede(certeza)) return { criar: { ...r, classe, valor, falta: undefined }, porRede: true }
    return { caixa: true, sugestao: classe }
  }
  if (r) {
    if (!automatico || r.falta) return { caixa: true, sugestao: r.classe }
    return { criar: r }
  }

  if (!rede) return { caixa: true }
  const { classe, certeza } = palpite(rede.rede, texto)
  // Pela rede, só tarefa solta é criada sozinha: compromisso e lembrete precisam de hora ou data,
  // dinheiro precisa de valor, e ideia ou compra mal classificadas somem da tela Agora.
  if (classe === 'passo' && podeCriarPelaRede(certeza)) {
    const t = texto.trim()
    return { criar: { classe, titulo: t.charAt(0).toUpperCase() + t.slice(1), motivo: '' }, porRede: true }
  }
  return certeza >= SUGERE_A_PARTIR ? { caixa: true, sugestao: classe } : { caixa: true }
}
