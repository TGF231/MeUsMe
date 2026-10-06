import { useAvisos } from './stores/config'

export const notificacoesSuportadas = () => typeof window !== 'undefined' && 'Notification' in window

export const permissaoNotificacao = (): NotificationPermission | 'indisponivel' =>
  notificacoesSuportadas() ? Notification.permission : 'indisponivel'

export async function pedirPermissao() {
  if (!notificacoesSuportadas()) return 'indisponivel' as const
  return Notification.requestPermission()
}

const ICONE = `${import.meta.env.BASE_URL}icone.svg`

/**
 * Se você está olhando para o app, o aviso aparece dentro dele.
 * Se não está, vira notificação do sistema (Windows/Android).
 */
export async function notificar(titulo: string, corpo: string, tag?: string) {
  const olhando = document.visibilityState === 'visible' && document.hasFocus()
  if (olhando || permissaoNotificacao() !== 'granted') {
    useAvisos.getState().mostrar(titulo, corpo)
    if (olhando) return
  }
  if (permissaoNotificacao() !== 'granted') return
  try {
    // No Android, notificações só funcionam pelo service worker.
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
