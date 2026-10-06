import { useEffect } from 'react'
import { ehNativo } from './nativo/plataforma'
import { notificar } from './notificacoes'
import { useStore } from './store'
import { useAgenda } from './stores/agenda'
import { useConfig } from './stores/config'
import { diaDeVencimento, fixaPagaNoMes, useFinancas } from './stores/financas'
import type { Lembrete } from './types'
import { dataISO, duracao, hora, inicioDoDia, juntarDataHora, mesISO, reais } from './util'

const MIN = 60_000
const DIA = 86_400_000

export interface Aviso {
  chave: string
  titulo: string
  corpo: string
  quando: number
  /** Depois disso o aviso perdeu o sentido e não dispara mais. */
  valeAte: number
}

function ocorrencias(l: Lembrete, de: number, ate: number) {
  const lista: number[] = []
  const d = new Date(l.quando)
  for (let i = 0; i < 400 && d.getTime() < ate; i++) {
    if (d.getTime() >= de) lista.push(d.getTime())
    if (l.repetir === 'diario') d.setDate(d.getDate() + 1)
    else if (l.repetir === 'semanal') d.setDate(d.getDate() + 7)
    else if (l.repetir === 'mensal') d.setMonth(d.getMonth() + 1)
    else break
  }
  return lista
}

/**
 * Todos os avisos que caem entre `de` e `ate`.
 * Na web, o app confere a cada 20 s quais já venceram; no Android, eles são agendados no sistema
 * com antecedência, para tocar mesmo com o app fechado.
 */
export function avisosEntre(de: number, ate: number): Aviso[] {
  const cfg = useConfig.getState()
  const agenda = useAgenda.getState()
  const nucleo = useStore.getState()
  const fin = useFinancas.getState()
  const avisos: Aviso[] = []

  // Compromissos: alguns minutos antes.
  for (const e of agenda.eventos) {
    if (e.diaInteiro) continue
    const quando = e.inicio - cfg.minutosAntesEvento * MIN
    if (quando >= ate || e.inicio + 5 * MIN <= de) continue
    avisos.push({
      chave: `evento:${e.id}:${e.inicio}`,
      titulo: e.titulo,
      corpo: cfg.minutosAntesEvento > 0 ? `Começa em ${duracao(cfg.minutosAntesEvento)}, às ${hora(e.inicio)}.` : `Começa agora, às ${hora(e.inicio)}.`,
      quando,
      valeAte: e.inicio + 5 * MIN,
    })
  }

  // Lembretes, incluindo as próximas repetições.
  for (const l of agenda.lembretes) {
    if (l.concluido) continue
    for (const quando of ocorrencias(l, de - 12 * 60 * MIN, ate))
      avisos.push({ chave: `lembrete:${l.id}:${quando}`, titulo: 'Lembrete', corpo: l.texto, quando, valeAte: quando + 12 * 60 * MIN })
  }

  // Um dia de cada vez: contas fixas (véspera e dia) e check-in.
  for (let dia = inicioDoDia(de); dia < ate; dia += DIA) {
    const iso = dataISO(dia)
    const fimDoDia = dia + DIA
    if (cfg.horaContas) {
      const quando = juntarDataHora(iso, cfg.horaContas)
      const mes = mesISO(dia)
      const diaDoMes = new Date(dia).getDate()
      for (const f of fin.fixas) {
        if (f.tipo !== 'gasto' || fixaPagaNoMes(f, fin.transacoes, mes)) continue
        const venc = diaDeVencimento(f, mes)
        if (venc === diaDoMes)
          avisos.push({ chave: `conta:${f.id}:${mes}:dia`, titulo: `Vence hoje: ${f.nome}`, corpo: `${reais(f.valor)}. Marque como paga no app quando pagar.`, quando, valeAte: fimDoDia })
        else if (venc === diaDoMes + 1)
          avisos.push({ chave: `conta:${f.id}:${mes}:vespera`, titulo: `Vence amanhã: ${f.nome}`, corpo: reais(f.valor), quando, valeAte: fimDoDia })
      }
    }
    if (cfg.horaCheckIn && !nucleo.checkins.some((c) => c.dia === iso))
      avisos.push({
        chave: `checkin:${iso}`,
        titulo: 'Check-in de 30 segundos',
        corpo: 'Como foi seu dia? Humor, energia e uma frase.',
        quando: juntarDataHora(iso, cfg.horaCheckIn),
        valeAte: fimDoDia,
      })
  }

  // Foco: pergunta se quer pausar e protege contra hiperfoco.
  const sessao = nucleo.sessoes.find((x) => !x.fim)
  if (sessao) {
    const passo = nucleo.passos.find((p) => p.id === sessao.passoId)
    const semFim = Number.MAX_SAFE_INTEGER
    if (cfg.avisoFocoMin > 0)
      avisos.push({
        chave: `foco:${sessao.id}:pausa`,
        titulo: `${duracao(cfg.avisoFocoMin)} em foco`,
        corpo: `"${passo?.texto ?? 'Passo atual'}". Continua ou faz uma pausa curta?`,
        quando: sessao.inicio + cfg.avisoFocoMin * MIN,
        valeAte: semFim,
      })
    avisos.push({
      chave: `foco:${sessao.id}:hiperfoco`,
      titulo: '1h30 no mesmo passo',
      corpo: 'Levante, beba água e confira se ainda é isso que importa agora.',
      quando: sessao.inicio + 90 * MIN,
      valeAte: semFim,
    })
  }

  return avisos.filter((a) => a.quando < ate && a.valeAte > de)
}

/** Na web: dispara o que já venceu. No Android, quem dispara é o sistema (ver nativo/lembretesNativos). */
export function verificarAvisos(agora = Date.now()) {
  if (ehNativo()) return
  const cfg = useConfig.getState()
  for (const a of avisosEntre(agora - 12 * 60 * MIN, agora + 1)) {
    if (a.quando > agora || agora >= a.valeAte || useConfig.getState().disparados[a.chave]) continue
    cfg.marcarDisparado(a.chave)
    void notificar(a.titulo, a.corpo, a.chave)
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
