import type { Passo, Projeto } from './types'

/**
 * Indicadores de "Como está indo" (docs/PESQUISA-TDAH.md, "Como medir se está funcionando"): servem para a pessoa ver
 * se o jeito de trabalhar está ajudando, comparando as próprias semanas. Calculados no aparelho, sem meta, placar ou
 * sequência para quebrar (a pesquisa desaconselha gamificação: risco de culpa).
 */

const DIA = 86_400_000
/** Projeto sem nenhum passo feito há este tempo, e ainda aberto, conta como parado. */
export const DIAS_PARADO = 30

/** Passos feitos em cada uma das últimas `semanas` janelas de 7 dias, da mais antiga para a atual. */
export function passosPorSemana(passos: Pick<Passo, 'feitoEm'>[], agora: number, semanas = 6): number[] {
  const contagem = new Array<number>(semanas).fill(0)
  for (const p of passos) {
    if (!p.feitoEm || p.feitoEm > agora) continue
    const atras = Math.floor((agora - p.feitoEm) / (7 * DIA))
    if (atras < semanas) contagem[semanas - 1 - atras]++
  }
  return contagem
}

export interface SituacaoProjetos {
  /** Chegaram à linha de chegada. */
  concluidos: number
  /** Encerrados antes, com o que já deram (não é abandono). */
  encerrados: number
  /** Abertos, com passo feito nos últimos 30 dias (ou criados há menos disso). */
  andando: number
  /** Abertos e sem nada feito há 30 dias ou mais. */
  parados: number
}

export function situacaoDosProjetos(projetos: Projeto[], passos: Pick<Passo, 'projetoId' | 'feitoEm'>[], agora: number): SituacaoProjetos {
  const ultimo = new Map<string, number>()
  for (const p of passos) {
    if (!p.projetoId || !p.feitoEm) continue
    ultimo.set(p.projetoId, Math.max(ultimo.get(p.projetoId) ?? 0, p.feitoEm))
  }
  const s: SituacaoProjetos = { concluidos: 0, encerrados: 0, andando: 0, parados: 0 }
  for (const pr of projetos) {
    if (pr.concluidoEm && pr.aprendizado) s.encerrados++
    else if (pr.concluidoEm) s.concluidos++
    else if (agora - Math.max(ultimo.get(pr.id) ?? 0, pr.criadoEm) >= DIAS_PARADO * DIA) s.parados++
    else s.andando++
  }
  return s
}
