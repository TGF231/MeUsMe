import { LocalNotifications } from '@capacitor/local-notifications'
import { ehNativo } from './nativo/plataforma'
import { useAvisos } from './stores/config'

export type Permissao = NotificationPermission | 'indisponivel'

export const notificacoesSuportadas = () => ehNativo() || (typeof window !== 'undefined' && 'Notification' in window)

const doNativo = (p: string): Permissao => (p === 'granted' ? 'granted' : p === 'denied' ? 'denied' : 'default')

/** Situação atual da permissão (no Android, a do sistema; no navegador, a do site). */
export async function lerPermissao(): Promise<Permissao> {
  if (ehNativo()) return doNativo((await LocalNotifications.checkPermissions()).display)
  return notificacoesSuportadas() ? Notification.permission : 'indisponivel'
}

export async function pedirPermissao(): Promise<Permissao> {
  if (ehNativo()) {
    const r = doNativo((await LocalNotifications.requestPermissions()).display)
    if (r === 'granted') void import('./nativo/lembretesNativos').then((m) => m.reagendarNotificacoes())
    return r
  }
  if (!notificacoesSuportadas()) return 'indisponivel'
  return Notification.requestPermission()
}

/**
 * Android 12+: sem "alarmes e lembretes" liberado, o sistema pode atrasar avisos em alguns minutos.
 * Devolve null fora do Android.
 */
export async function horarioExatoLiberado(): Promise<boolean | null> {
  if (!ehNativo()) return null
  return (await LocalNotifications.checkExactNotificationSetting()).exact_alarm === 'granted'
}

export const abrirAjusteDeHorarioExato = () => LocalNotifications.changeExactNotificationSetting()

const ICONE = `${import.meta.env.BASE_URL}icone.svg`

/**
 * Se você está olhando para o app, o aviso aparece dentro dele.
 * Se não está, vira notificação do sistema (Windows/Android).
 */
export async function notificar(titulo: string, corpo: string, tag?: string) {
  const olhando = document.visibilityState === 'visible' && document.hasFocus()
  if (ehNativo()) {
    if (olhando) return useAvisos.getState().mostrar(titulo, corpo)
    await LocalNotifications.schedule({ notifications: [{ id: Date.now() % 2_000_000_000, title: titulo, body: corpo, extra: { chave: tag } }] })
    return
  }
  const permissao = notificacoesSuportadas() ? Notification.permission : 'indisponivel'
  if (olhando || permissao !== 'granted') {
    useAvisos.getState().mostrar(titulo, corpo)
    if (olhando) return
  }
  if (permissao !== 'granted') return
  try {
    // No Chrome do Android, notificações só funcionam pelo service worker.
    const reg = await navigator.serviceWorker?.getRegistration()
    if (reg) {
      await reg.showNotification(titulo, { body: corpo, tag, icon: ICONE, badge: ICONE })
      return
    }
    new Notification(titulo, { body: corpo, tag, icon: ICONE })
  } catch {
    useAvisos.getState().mostrar(titulo, corpo)
  }
}
