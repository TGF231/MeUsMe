import { LocalNotifications } from '@capacitor/local-notifications'
import * as NotificacaoDesktop from '@tauri-apps/plugin-notification'
import { ehDesktop, ehNativo } from './nativo/plataforma'
import { useAvisos } from './stores/config'

export type Permissao = NotificationPermission | 'indisponivel'

export const notificacoesSuportadas = () => ehNativo() || ehDesktop() || (typeof window !== 'undefined' && 'Notification' in window)

const doNativo = (p: string): Permissao => (p === 'granted' ? 'granted' : p === 'denied' ? 'denied' : 'default')

/** Permissão de notificação (do sistema no Android, do site no navegador). */
export async function lerPermissao(): Promise<Permissao> {
  if (ehNativo()) return doNativo((await LocalNotifications.checkPermissions()).display)
  if (ehDesktop()) return (await NotificacaoDesktop.isPermissionGranted()) ? 'granted' : 'default'
  return notificacoesSuportadas() ? Notification.permission : 'indisponivel'
}

export async function pedirPermissao(): Promise<Permissao> {
  if (ehNativo()) {
    const r = doNativo((await LocalNotifications.requestPermissions()).display)
    if (r === 'granted') void import('./nativo/lembretesNativos').then((m) => m.reagendarNotificacoes())
    return r
  }
  if (ehDesktop()) return NotificacaoDesktop.requestPermission()
  if (!notificacoesSuportadas()) return 'indisponivel'
  return Notification.requestPermission()
}

/**
 * Android 12+: sem permissão de alarme exato, o sistema pode atrasar avisos.
 * Retorna null fora do Android.
 */
export async function horarioExatoLiberado(): Promise<boolean | null> {
  if (!ehNativo()) return null
  return (await LocalNotifications.checkExactNotificationSetting()).exact_alarm === 'granted'
}

export const abrirAjusteDeHorarioExato = () => LocalNotifications.changeExactNotificationSetting()

const ICONE = `${import.meta.env.BASE_URL}icone.svg`

/** Com o app em foco, mostra aviso interno; caso contrário, notificação do sistema. */
export async function notificar(titulo: string, corpo: string, tag?: string) {
  const olhando = document.visibilityState === 'visible' && document.hasFocus()
  if (ehNativo()) {
    if (olhando) return useAvisos.getState().mostrar(titulo, corpo)
    await LocalNotifications.schedule({ notifications: [{ id: Date.now() % 2_000_000_000, title: titulo, body: corpo, extra: { chave: tag } }] })
    return
  }
  if (ehDesktop()) {
    // Windows: a janela pode estar oculta na bandeja.
    if (olhando) return useAvisos.getState().mostrar(titulo, corpo)
    if (await NotificacaoDesktop.isPermissionGranted()) NotificacaoDesktop.sendNotification({ title: titulo, body: corpo })
    else useAvisos.getState().mostrar(titulo, corpo)
    return
  }
  const permissao = notificacoesSuportadas() ? Notification.permission : 'indisponivel'
  if (olhando || permissao !== 'granted') {
    useAvisos.getState().mostrar(titulo, corpo)
    if (olhando) return
  }
  if (permissao !== 'granted') return
  try {
    // Chrome no Android só exibe notificações via service worker.
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
