import { useEffect } from 'react'
import { ehNativo } from './nativo/plataforma'
import { notificar } from './notificacoes'
import { useStore } from './store'
import { useAgenda } from './stores/agenda'
import { useConfig } from './stores/config'
import { diaDeVencimento, fixaPagaNoMes, useFinancas } from './stores/financas'
import { idDoLembrete } from './sonecas'
import type { Lembrete } from './types'
import { inicioDaSemana } from './calculos'
import { dataISO, duracao, hora, inicioDoDia, juntarDataHora, mesISO, reais } from './util'

const MIN = 60_000
const DIA = 86_400_000

export interface Aviso {
  chave: string
  titulo: string
  corpo: string
  quando: number
  /** Após este instante o aviso é descartado. */
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
 * Avisos com horário entre `de` e `ate`.
 * Web: verificarAvisos() consulta periodicamente. Android: lembretesNativos agenda no sistema.
 */
export function avisosEntre(de: number, ate: number): Aviso[] {
  const cfg = useConfig.getState()
  const agenda = useAgenda.getState()
  const nucleo = useStore.getState()
  const fin = useFinancas.getState()
  const avisos: Aviso[] = []

  // Compromissos
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

  // Lembretes (inclui recorrências)
  for (const l of agenda.lembretes) {
    if (l.concluido) continue
    // A nota vai junto na notificação: é o contexto que faz o lembrete servir na hora.
    const corpo = l.nota ? `${l.texto}\n${l.nota}` : l.texto
    for (const quando of ocorrencias(l, de - 12 * 60 * MIN, ate))
      avisos.push({ chave: `lembrete:${l.id}:${quando}`, titulo: 'Lembrete', corpo, quando, valeAte: quando + 12 * 60 * MIN })
  }
  // Sonecas ("Daqui a 10 min" na notificação), enquanto o lembrete não foi concluído.
  for (const s of cfg.sonecas) {
    const id = idDoLembrete(s.chave)
    if (agenda.lembretes.some((l) => l.id === id && !l.concluido)) avisos.push({ ...s, valeAte: s.quando + 12 * 60 * MIN })
  }

  // Contas fixas (véspera e dia) e check-in, dia a dia
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

  // Revisão semanal: no dia escolhido, às 10h, se a desta semana ainda não foi feita.
  if (cfg.diaRevisao >= 0)
    for (let dia = inicioDoDia(de); dia < ate; dia += DIA) {
      if (new Date(dia).getDay() !== cfg.diaRevisao || cfg.revisaoFeitaEm >= inicioDaSemana(dia, cfg.diaRevisao)) continue
      avisos.push({
        chave: `revisao:${dataISO(dia)}`,
        titulo: 'Revisão da semana',
        corpo: '5 minutos: esvaziar a Caixa, escolher o foco e olhar os próximos dias.',
        quando: juntarDataHora(dataISO(dia), '10:00'),
        valeAte: dia + DIA,
      })
    }

  // Lista de espera: pergunta de novo quando o prazo da compra passa.
  for (const d of fin.desejos) {
    if (d.decisao) continue
    avisos.push({
      chave: `desejo:${d.id}`,
      titulo: 'Ainda quer comprar?',
      corpo: `${d.texto}${d.valor ? ` (${reais(d.valor)})` : ''}. A espera acabou; decida em Finanças → Antes de comprar.`,
      quando: d.decidirEm,
      valeAte: d.decidirEm + 3 * DIA,
    })
  }

  // Sessão de foco: aviso de pausa e limite de 90 min
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

/** Dispara avisos vencidos (só na web; no Android o sistema dispara). */
export function verificarAvisos(agora = Date.now()) {
  if (ehNativo()) return
  const cfg = useConfig.getState()
  for (const a of avisosEntre(agora - 12 * 60 * MIN, agora + 1)) {
    if (a.quando > agora || agora >= a.valeAte || useConfig.getState().disparados[a.chave]) continue
    cfg.marcarDisparado(a.chave)
    void notificar(a.titulo, a.corpo, a.chave)
  }
}

/** Avança lembretes recorrentes já disparados para a próxima ocorrência. */
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
