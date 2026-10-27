import { useEffect, useState } from 'react'

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
