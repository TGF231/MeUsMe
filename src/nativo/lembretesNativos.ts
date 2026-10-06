import { LocalNotifications } from '@capacitor/local-notifications'
import { avisosEntre } from '../agendador'
import { useStore } from '../store'
import { useAgenda } from '../stores/agenda'
import { useConfig } from '../stores/config'
import { useFinancas } from '../stores/financas'
import { hash } from '../sync/planejar'
import { ehNativo } from './plataforma'

const SEMANA = 7 * 86_400_000
// O Android limita alarmes por app; 60 cobrem uma semana com folga.
const LIMITE = 60

/** Id numérico estável para cada aviso (o Android exige inteiro de 32 bits). */
const idDe = (chave: string) => (Number.parseInt(hash(chave).slice(0, 8), 36) % 2_000_000_000) + 1

/** Refaz a agenda de notificações do sistema com os avisos da próxima semana. */
export async function reagendarNotificacoes() {
  if (!ehNativo()) return
  if ((await LocalNotifications.checkPermissions()).display !== 'granted') return
  const agora = Date.now()
  const disparados = useConfig.getState().disparados
  const proximos = avisosEntre(agora, agora + SEMANA)
    .filter((a) => a.quando > agora + 5_000 && !disparados[a.chave])
    .sort((a, b) => a.quando - b.quando)
    .slice(0, LIMITE)

  const pendentes = await LocalNotifications.getPending()
  if (pendentes.notifications.length) await LocalNotifications.cancel({ notifications: pendentes.notifications.map((n) => ({ id: n.id })) })
  if (!proximos.length) return
  await LocalNotifications.schedule({
    notifications: proximos.map((a) => ({
      id: idDe(a.chave),
      title: a.titulo,
      body: a.corpo,
      schedule: { at: new Date(a.quando), allowWhileIdle: true },
      extra: { chave: a.chave },
    })),
  })
}

let espera: ReturnType<typeof setTimeout> | undefined

/** Reagenda (com uma pequena espera) sempre que algo que gera aviso mudar. */
export function manterNotificacoesAgendadas() {
  if (!ehNativo()) return () => {}
  const logo = () => {
    clearTimeout(espera)
    espera = setTimeout(() => void reagendarNotificacoes().catch(() => {}), 1500)
  }
  const cancelar = [useStore, useAgenda, useConfig, useFinancas].map((l) => l.subscribe(logo))
  logo()
  return () => {
    clearTimeout(espera)
    cancelar.forEach((f) => f())
  }
}
