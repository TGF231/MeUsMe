import { useEffect, useRef, useState } from 'react'

/**
 * Janela modal de verdade (<dialog> aberto com showModal): o foco fica preso dentro, o resto da página fica
 * inerte para teclado e leitor de tela e, ao fechar, o foco volta para onde estava. Esc chega como `onCancel`.
 */
export function useJanelaModal() {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const antes = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const janela = ref.current
    if (janela && !janela.open) janela.showModal()
    return () => {
      janela?.close()
      if (antes?.isConnected) antes.focus()
    }
  }, [])
  return ref
}

/**
 * Instante atual, atualizado a cada `intervaloMs`. Componentes não leem Date.now() durante o render:
 * o React pode renderizar de novo a qualquer momento, e o valor tem que vir do estado.
 */
export function useAgora(intervaloMs = 30_000) {
  const [agora, setAgora] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setAgora(Date.now()), intervaloMs)
    return () => clearInterval(t)
  }, [intervaloMs])
  return agora
}
