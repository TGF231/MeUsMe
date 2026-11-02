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
    // import() só para evitar ciclo (lembretesNativos → agendador → notificacoes); o aviso de build sobre isso é esperado.
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

/**
 * Canal dos avisos no Android. O canal padrão do plugin tem importância média: toca som e fica só na barra de status,
 * e quem não ouve perde o aviso. Este aparece por cima da tela e vibra; sem `sound`, o Android usa o som padrão.
 * O Android não deixa mudar a importância de um canal já criado, por isso um id próprio em vez do padrão.
 */
export const CANAL = 'avisos'
let canalCriado: Promise<void> | null = null
export const garantirCanal = () =>
  (canalCriado ??= LocalNotifications.createChannel({
    id: CANAL,
    name: 'Lembretes e compromissos',
    description: 'Aparecem por cima da tela e vibram, para não depender do som.',
    importance: 4,
    visibility: 1,
    vibration: true,
    lights: true,
  }).catch(() => {
    canalCriado = null
  }))

/**
 * Teste com o app fechado (D23): um aviso agendado para daqui a 1 minuto. Se ele não chegar, algo no aparelho
 * (permissão, alarme exato ou economia de bateria) está segurando os lembretes.
 */
export async function testarComAppFechado() {
  if (!ehNativo()) return
  await garantirCanal()
  await LocalNotifications.schedule({
    notifications: [
      {
        id: 1_999_999_999,
        channelId: CANAL,
        title: 'Teste do MeUsMe',
        body: 'Chegou com o app fechado: os lembretes estão funcionando.',
        schedule: { at: new Date(Date.now() + 60_000), allowWhileIdle: true },
      },
    ],
  })
}

/** Com o app em foco, mostra aviso interno; caso contrário, notificação do sistema. */
export async function notificar(titulo: string, corpo: string, tag?: string) {
  const olhando = document.visibilityState === 'visible' && document.hasFocus()
  if (ehNativo()) {
    if (olhando) return useAvisos.getState().mostrar(titulo, corpo)
    await garantirCanal()
    await LocalNotifications.schedule({ notifications: [{ id: Date.now() % 2_000_000_000, channelId: CANAL, title: titulo, body: corpo, extra: { chave: tag } }] })
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
