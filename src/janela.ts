import { getCurrentWindow } from '@tauri-apps/api/window'
import { useEffect, useSyncExternalStore } from 'react'
import { ehDesktop } from './nativo/plataforma'

/**
 * Quando o MeUsMe vira "programa de computador": tela larga (900px, a --megui-virada do MegUI, que não entra em
 * media query), deitada e com mouse. Tablet com toque e celular deitado ficam com o layout de toque.
 *
 * Para sair, a janela precisa encolher um pouco além da entrada (860px e 9:10). No app Windows a troca liga ou
 * desliga a moldura do sistema, o que muda o tamanho da janela; sem essa folga, uma janela quase quadrada ou com
 * cerca de 900px (comum ao encaixar lado a lado) ficava trocando de layout sem parar.
 */
const ENTRA = '(min-width: 900px) and (min-aspect-ratio: 1/1) and (pointer: fine)'
const FICA = '(min-width: 860px) and (min-aspect-ratio: 9/10) and (pointer: fine)'

let emJanela: boolean | null = null

function calcular() {
  emJanela = window.matchMedia(emJanela ? FICA : ENTRA).matches
  return emJanela
}

function assinar(avisar: () => void) {
  const consultas = [window.matchMedia(ENTRA), window.matchMedia(FICA)]
  const mudou = () => {
    const antes = emJanela
    if (calcular() !== antes) avisar()
  }
  consultas.forEach((m) => m.addEventListener('change', mudou))
  return () => consultas.forEach((m) => m.removeEventListener('change', mudou))
}

const agora = () => emJanela ?? calcular()

/** true na janela de computador; também marca data-layout="janela" no <html>, que muda a densidade em index.css. */
export function useJanela() {
  const janela = useSyncExternalStore(assinar, agora)
  useEffect(() => {
    const raiz = document.documentElement
    if (janela) raiz.dataset.layout = 'janela'
    else delete raiz.dataset.layout
    // App Windows: a janela abre sem moldura (tauri.conf.json), porque a BarraTitulo do MegUI traz minimizar,
    // maximizar e fechar; no layout de toque (janela estreita ou em pé) a moldura do sistema volta.
    if (ehDesktop()) void getCurrentWindow().setDecorations(!janela).catch(() => {})
  }, [janela])
  return janela
}
