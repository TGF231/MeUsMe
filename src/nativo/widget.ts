import { App as AppNativo } from '@capacitor/app'
import { useStore } from '../store'
import { useAgenda } from '../stores/agenda'
import { textoDoWidget } from '../widget'
import { Captura } from './captura'
import { ehAndroid } from './plataforma'

/**
 * Mantém o widget "Próximo passo" (V01) em dia: manda o texto ao Android quando a fila ou a agenda mudam, e de
 * novo ao sair do app, porque o horário pode ter mudado a sugestão. Só envia quando o texto muda.
 */
export function manterWidget() {
  if (!ehAndroid()) return () => {}
  let ultimo = ''
  let espera: ReturnType<typeof setTimeout> | undefined
  const enviar = () => {
    clearTimeout(espera)
    const t = textoDoWidget(useStore.getState(), useAgenda.getState().eventos, Date.now())
    if (`${t.rotulo}\n${t.passo}` === ultimo) return
    ultimo = `${t.rotulo}\n${t.passo}`
    Captura.widget(t).catch(() => (ultimo = ''))
  }
  const logo = () => {
    clearTimeout(espera)
    espera = setTimeout(enviar, 1000)
  }
  const cancelar = [useStore, useAgenda].map((l) => l.subscribe(logo))
  const ouvinte = AppNativo.addListener('pause', enviar)
  enviar()
  return () => {
    clearTimeout(espera)
    cancelar.forEach((f) => f())
    void ouvinte.then((o) => o.remove())
  }
}
