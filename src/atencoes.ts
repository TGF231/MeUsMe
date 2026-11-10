import { capacidadeDoDia, refazerResto } from './montarDia'
import { revisaoPendente, vencidos } from './calculos'
import { hoje, useStore } from './store'
import { useAgenda } from './stores/agenda'
import { useConfig } from './stores/config'
import { diaDeVencimento, fixaPagaNoMes, useFinancas } from './stores/financas'
import { inicioDoDia } from './util'

/** Os horários sugeridos vão até as 22h: depois disso não se monta mais nada. */
export const FIM_DO_DIA_H = 22

/**
 * Quantas coisas de Planejar pedem uma decisão: lembretes e contas vencidos, passos para reagendar, horários que
 * passaram, o dia que não cabe e a revisão da semana. Aparece no menu, para ninguém precisar abrir para saber.
 */
export function useAtencoes(agora: number) {
  const passos = useStore((s) => s.passos)
  const sessoes = useStore((s) => s.sessoes)
  const agenda = useAgenda()
  const fin = useFinancas()
  const cfg = useConfig()
  const comAgenda = !cfg.modulosDesligados.includes('agenda')
  const diaHoje = new Date(agora).getDate()
  const desde = inicioDoDia(agora)
  const ate = desde + FIM_DO_DIA_H * 3_600_000
  const lembretes = comAgenda ? agenda.lembretes.filter((l) => !l.concluido && l.quando <= agora).length : 0
  const contas = cfg.modulosDesligados.includes('financas')
    ? 0
    : fin.fixas.filter((f) => f.tipo === 'gasto' && !fixaPagaNoMes(f, fin.transacoes) && diaDeVencimento(f) <= diaHoje).length
  const reagendar = vencidos(passos, hoje()).length > 0 ? 1 : 0
  const refazer = comAgenda && refazerResto(agenda.eventos, passos, agora, ate, desde).passaram > 0 ? 1 : 0
  const c = capacidadeDoDia(passos, sessoes, agenda.eventos, agora, ate)
  const naoCabe = comAgenda && !c.cabe && c.passos.length >= 2 ? 1 : 0
  const revisao = revisaoPendente(agora, cfg.diaRevisao, cfg.revisaoFeitaEm) ? 1 : 0
  return lembretes + contas + reagendar + refazer + naoCabe + revisao
}
