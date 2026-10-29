import { caracteristicas, normalizarParaRede } from './caracteristicas.ts'
import { treinar, type Rede } from './rede.ts'
import type { Classe } from './regras.ts'

/**
 * Parte 3 do motor (docs/MOTOR.md): aprender com o jeito de quem usa. Funções puras;
 * a loja que guarda os exemplos no aparelho é src/stores/motor.ts.
 */

export interface ExemploPessoal {
  texto: string
  classe: Classe
  em: number
}

/** A última camada ajustada às suas correções, e de quais pesos de fábrica ela partiu. */
export interface CamadaPessoal {
  hashDados: string
  w2: number[]
  b2: number[]
  /** Quantos exemplos havia no último retreino. */
  exemplos: number
}

export const RETREINAR_A_CADA = 20
export const MAXIMO_DE_EXEMPLOS = 500

/** Mesma chave das características: "R$ 35 almoço" e "R$ 40 almoço" valem como o mesmo texto. */
export const chaveDaMemoria = (texto: string) => normalizarParaRede(texto)

/** Acrescenta um exemplo; o mesmo texto organizado de novo substitui o anterior. */
export function acrescentar(exemplos: ExemploPessoal[], novo: ExemploPessoal): ExemploPessoal[] {
  const chave = chaveDaMemoria(novo.texto)
  return [...exemplos.filter((e) => chaveDaMemoria(e.texto) !== chave), novo].slice(-MAXIMO_DE_EXEMPLOS)
}

/** Memória exata: texto (normalizado) → como você organizou da última vez. */
export function memoriaDe(exemplos: ExemploPessoal[]): Map<string, Classe> {
  return new Map(exemplos.map((e) => [chaveDaMemoria(e.texto), e.classe]))
}

/**
 * Retreina só a última camada com os seus exemplos, partindo dos pesos de fábrica, puxada de
 * volta para eles (âncora) e misturada a uma amostra do treino original (`revisao`, gravada em
 * pesos.json). Sem a revisão, exemplos de uma classe só ("R$ 1000 tv", "R$ 800 geladeira"…
 * como venda) ensinam que todo valor é entrada. Os seus exemplos valem em dobro.
 */
export function retreinarUltimaCamada(base: Rede, exemplos: ExemploPessoal[], revisao: { texto: string; classe: string }[] = []): Pick<CamadaPessoal, 'w2' | 'b2'> {
  const rede: Rede = { ...base, w2: Float32Array.from(base.w2), b2: Float32Array.from(base.b2) }
  const paraExemplo = (e: { texto: string; classe: string }) => ({ x: caracteristicas(e.texto), y: base.classes.indexOf(e.classe) })
  const meus = exemplos.filter((e) => base.classes.includes(e.classe)).map(paraExemplo)
  const lista = [...meus, ...meus, ...revisao.filter((e) => base.classes.includes(e.classe)).map(paraExemplo)]
  if (meus.length) treinar(rede, lista, { epocas: 40, lote: 8, taxa: 0.01, l2: 0.02, dropout: 0, semente: 1, soUltimaCamada: true, ancora: { w2: base.w2, b2: base.b2 } })
  return { w2: Array.from(rede.w2), b2: Array.from(rede.b2) }
}

/** A rede de fábrica com a sua última camada, se ela partiu destes mesmos pesos. */
export function comCamadaPessoal(base: Rede, hashDados: string, pessoal: CamadaPessoal | null): Rede {
  if (!pessoal || pessoal.hashDados !== hashDados) return base
  return { ...base, w2: Float32Array.from(pessoal.w2), b2: Float32Array.from(pessoal.b2) }
}
