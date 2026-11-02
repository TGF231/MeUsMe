import { escolherPasso } from './escolher.ts'
import type { CheckIn, Evento, Passo, Projeto } from './types'
import { dataISO, hora } from './util.ts'

export const WIDGET_VAZIO = 'Nada na fila. Capture o que estiver na cabeça.'

/**
 * Texto do widget "Próximo passo" (V01 em docs/CONCORRENTES.md), com a mesma ordem da tela Agora: horário
 * reservado agora vence; senão, a sugestão pela energia do check-in de hoje (média quando não há).
 */
export function textoDoWidget(
  d: { projetos: Projeto[]; passos: Passo[]; focoId: string | null; checkins: CheckIn[] },
  eventos: Evento[],
  agora: number,
) {
  const reserva = eventos.find((e) => e.passoId && !e.diaInteiro && e.inicio <= agora && e.fim > agora)
  const reservado = reserva && d.passos.find((p) => p.id === reserva.passoId && !p.feitoEm)
  if (reservado) return { rotulo: `Reservado até ${hora(reserva.fim)}`, passo: reservado.texto }

  const dia = dataISO(new Date(agora))
  const energia = d.checkins.find((c) => c.dia === dia)?.energia ?? 2
  const reservados = new Set(eventos.filter((e) => e.passoId && e.inicio > agora).map((e) => e.passoId!))
  const escolha = escolherPasso(d.projetos, d.passos, d.focoId, energia, new Set(), reservados, dia)
  if (!escolha) return { rotulo: 'Próximo passo', passo: WIDGET_VAZIO }
  return { rotulo: `Próximo passo · ${escolha.projeto?.titulo ?? 'Tarefa solta'}`, passo: escolha.passo.texto }
}
