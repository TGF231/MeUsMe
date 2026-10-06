import { useEffect } from 'react'
import { notificar } from './notificacoes'
import { useStore } from './store'
import { useAgenda } from './stores/agenda'
import { useConfig } from './stores/config'
import { diaDeVencimento, fixaPagaNoMes, useFinancas } from './stores/financas'
import { duracao, hoje, hora, juntarDataHora, mesISO, reais } from './util'

const MIN = 60_000

/** Confere tudo que pode precisar de aviso. Só roda enquanto o app está aberto (inclusive em segundo plano). */
export function verificarAvisos(agora = Date.now()) {
  const cfg = useConfig.getState()
  const agenda = useAgenda.getState()
  const nucleo = useStore.getState()
  const fin = useFinancas.getState()

  const disparar = (chave: string, titulo: string, corpo: string) => {
    if (useConfig.getState().disparados[chave]) return
    cfg.marcarDisparado(chave)
    void notificar(titulo, corpo, chave)
  }

  // Compromissos: alguns minutos antes, nunca depois que já começou há muito tempo.
  for (const e of agenda.eventos) {
    if (e.diaInteiro) continue
    const aviso = e.inicio - cfg.minutosAntesEvento * MIN
    if (agora >= aviso && agora < e.inicio + 5 * MIN) {
      const falta = Math.round((e.inicio - agora) / MIN)
      disparar(`evento:${e.id}:${e.inicio}`, e.titulo, falta > 0 ? `Começa em ${duracao(falta)}, às ${hora(e.inicio)}.` : `Começou às ${hora(e.inicio)}.`)
    }
  }

  // Lembretes: os repetidos já avançam para a próxima vez assim que avisam.
  for (const l of agenda.lembretes) {
    if (l.concluido || l.quando > agora || agora - l.quando > 12 * 60 * MIN) continue
    disparar(`lembrete:${l.id}:${l.quando}`, 'Lembrete', l.texto)
  }

  // Contas fixas: na véspera e no dia, no horário configurado.
  if (cfg.horaContas) {
    const horario = juntarDataHora(hoje(), cfg.horaContas)
    if (agora >= horario) {
      const mes = mesISO()
      const diaHoje = new Date(agora).getDate()
      for (const f of fin.fixas) {
        if (f.tipo !== 'gasto' || fixaPagaNoMes(f, fin.transacoes, mes)) continue
        const venc = diaDeVencimento(f, mes)
        if (venc === diaHoje) disparar(`conta:${f.id}:${mes}:dia`, `Vence hoje: ${f.nome}`, `${reais(f.valor)}. Marque como paga no app quando pagar.`)
        else if (venc === diaHoje + 1) disparar(`conta:${f.id}:${mes}:vespera`, `Vence amanhã: ${f.nome}`, reais(f.valor))
      }
    }
  }

  // Check-in do dia, se ainda não foi feito.
  if (cfg.horaCheckIn && agora >= juntarDataHora(hoje(), cfg.horaCheckIn) && !nucleo.checkins.some((c) => c.dia === hoje())) {
    disparar(`checkin:${hoje()}`, 'Check-in de 30 segundos', 'Como foi seu dia? Humor, energia e uma frase.')
  }

  // Foco: pergunta se quer pausar e protege contra hiperfoco.
  const sessao = nucleo.sessoes.find((x) => !x.fim)
  if (sessao) {
    const passo = nucleo.passos.find((p) => p.id === sessao.passoId)
    const decorrido = agora - sessao.inicio
    if (cfg.avisoFocoMin > 0 && decorrido >= cfg.avisoFocoMin * MIN)
      disparar(`foco:${sessao.id}:pausa`, `${duracao(cfg.avisoFocoMin)} em foco`, `"${passo?.texto ?? 'Passo atual'}". Continua ou faz uma pausa curta?`)
    if (decorrido >= 90 * MIN)
      disparar(`foco:${sessao.id}:hiperfoco`, '1h30 no mesmo passo', 'Levante, beba água e confira se ainda é isso que importa agora.')
  }
}

/** Avança lembretes repetidos que já avisaram, para a próxima ocorrência aparecer na lista. */
function avancarRepetidos(agora = Date.now()) {
  const agenda = useAgenda.getState()
  for (const l of agenda.lembretes) {
    if (l.repetir !== 'nunca' && !l.concluido && agora - l.quando > 60 * MIN) agenda.avancarLembrete(l.id)
  }
}

export function useAgendador() {
  useEffect(() => {
    const rodar = () => {
      verificarAvisos()
      avancarRepetidos()
    }
    rodar()
    const t = setInterval(rodar, 20_000)
    document.addEventListener('visibilitychange', rodar)
    return () => {
      clearInterval(t)
      document.removeEventListener('visibilitychange', rodar)
    }
  }, [])
}
