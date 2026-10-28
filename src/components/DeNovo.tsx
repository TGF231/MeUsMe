import { useState } from 'react'
import { useStore } from '../store'
import type { Passo } from '../types'

/** Cria de novo um passo já feito, sem digitar. */
export function DeNovo({ passo }: { passo: Passo }) {
  const repetir = useStore((s) => s.repetirPasso)
  const [feito, setFeito] = useState(false)
  return (
    <button className="mini-botao" disabled={feito} onClick={() => (repetir(passo.id), setFeito(true))} aria-label={`Fazer de novo: ${passo.texto}`}>
      {feito ? '✓ Na fila' : 'De novo'}
    </button>
  )
}
