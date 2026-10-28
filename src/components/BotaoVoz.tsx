import { useState } from 'react'
import { ErroDeVoz, comoDitar, ditar } from '../nativo/voz'

/** Botão de microfone ao lado de um campo: o que for falado vai para `onTexto`. */
export function BotaoVoz({ onTexto }: { onTexto: (texto: string) => void }) {
  const [ouvindo, setOuvindo] = useState(false)
  const [aviso, setAviso] = useState<string | null>(null)
  const como = comoDitar()
  if (!como) return null

  const ouvir = async () => {
    if (como === 'windows') return setAviso('No Windows, clique no campo e aperte Win + H para ditar.')
    setAviso(null)
    setOuvindo(true)
    try {
      const texto = await ditar()
      if (texto) onTexto(texto)
      else setAviso('Não deu para entender. Tente de novo, mais perto do microfone.')
    } catch (e) {
      setAviso(e instanceof ErroDeVoz ? e.message : 'O ditado falhou. Tente de novo.')
    } finally {
      setOuvindo(false)
    }
  }

  return (
    <>
      <button type="button" className={`icone-botao${ouvindo ? ' ativo' : ''}`} onClick={ouvir} disabled={ouvindo} aria-label={ouvindo ? 'Ouvindo…' : 'Ditar'}>
        🎙
      </button>
      {aviso && (
        <p className="motivo aviso-voz" role="status">
          {aviso}
        </p>
      )}
    </>
  )
}
