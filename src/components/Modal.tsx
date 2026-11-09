import type { ReactNode } from 'react'
import { useJanelaModal } from '../hooks'
import { Dialogo } from '../tema/megui-react.mjs'

/**
 * Janela por cima da tela: o Dialogo do MegUI desenha a faixa com o título e o ✕; o <dialog> nativo em volta segura o
 * foco e o Esc, e por isso o Dialogo perde o papel de diálogo. Tocar fora também fecha.
 */
export function Modal({ titulo, onFechar, children }: Readonly<{ titulo: string; onFechar: () => void; children: ReactNode }>) {
  const janela = useJanelaModal()
  return (
    <dialog
      ref={janela}
      className="fundo"
      aria-label={titulo}
      onCancel={(e) => {
        e.preventDefault()
        onFechar()
      }}
    >
      <Dialogo titulo={titulo} role="none" aria-modal={undefined} aria-label={undefined} className="modal-megui" largura="100%" aoFechar={onFechar}>
        {children}
      </Dialogo>
      <button type="button" className="fundo-fechar" tabIndex={-1} aria-hidden="true" onClick={onFechar} />
    </dialog>
  )
}
