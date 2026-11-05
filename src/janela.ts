import { useEffect, useSyncExternalStore } from 'react'

/**
 * Quando o MeUsMe vira "programa de computador": tela larga (900px, a --megui-virada do MegUI, que não entra em
 * media query), deitada e com mouse. Tablet com toque e celular deitado ficam com o layout de toque.
 */
const CONSULTA = '(min-width: 900px) and (min-aspect-ratio: 1/1) and (pointer: fine)'

const consulta = () => window.matchMedia(CONSULTA)

function assinar(avisar: () => void) {
  const m = consulta()
  m.addEventListener('change', avisar)
  return () => m.removeEventListener('change', avisar)
}

/** true na janela de computador; também marca data-layout="janela" no <html>, que muda a densidade em index.css. */
export function useJanela() {
  const janela = useSyncExternalStore(assinar, () => consulta().matches)
  useEffect(() => {
    const raiz = document.documentElement
    if (janela) raiz.dataset.layout = 'janela'
    else delete raiz.dataset.layout
  }, [janela])
  return janela
}
