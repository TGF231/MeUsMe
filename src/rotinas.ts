import type { Passo } from './types'

const DIA = 86_400_000
const JANELA_DIAS = 28
const PERIODO_DIAS = { diario: 1, semanal: 7, mensal: 30 }

export interface ContagemDaRotina {
  /** Id da vez pendente (ou da última feita), para a chave da lista. */
  id: string
  texto: string
  repetir: NonNullable<Passo['repetir']>
  /** Vezes feitas nas últimas 4 semanas. */
  vezes: number
  /** Vezes que caberiam no mesmo período, contando só desde que a rotina existe. */
  esperado: number
}

/**
 * Hábitos sem sequência (V19 em docs/CONCORRENTES.md): para cada passo que se repete (V08), quantas vezes foi feito
 * nas últimas 4 semanas, "3 de 4". Não há sequência que quebra nem zera: uma semana sem fazer só deixa de somar.
 * As vezes de uma rotina são a corrente de repeteDe; a ponta é a vez que nenhuma outra repete.
 */
export function contagemDasRotinas(passos: Passo[], agora = Date.now()): ContagemDaRotina[] {
  const porId = new Map(passos.map((p) => [p.id, p]))
  const repetidos = new Set(passos.map((p) => p.repeteDe).filter(Boolean))
  const inicio = agora - JANELA_DIAS * DIA
  const r: ContagemDaRotina[] = []
  for (const ponta of passos) {
    if (!ponta.repetir || repetidos.has(ponta.id)) continue
    const corrente: Passo[] = []
    for (let p: Passo | undefined = ponta; p && corrente.length < 1000; p = p.repeteDe ? porId.get(p.repeteDe) : undefined) corrente.push(p)
    const primeira = corrente[corrente.length - 1]
    const vezes = corrente.filter((p) => p.feitoEm && p.feitoEm >= inicio).length
    // A primeira vez só conta depois de feita: uma rotina recém-criada não começa devendo.
    if (corrente.length === 1 && !ponta.feitoEm) continue
    const desde = Math.max(inicio, primeira.criadoEm)
    const esperado = Math.max(1, Math.ceil((agora - desde) / (PERIODO_DIAS[ponta.repetir] * DIA)))
    const teto = Math.max(1, Math.floor(JANELA_DIAS / PERIODO_DIAS[ponta.repetir]))
    r.push({ id: ponta.id, texto: ponta.texto, repetir: ponta.repetir, vezes, esperado: Math.min(esperado, teto) })
  }
  return r.sort((a, b) => a.texto.localeCompare(b.texto, 'pt-BR'))
}
