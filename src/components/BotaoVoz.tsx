import { useEffect, useRef, useState } from 'react'
import { ErroDeVoz, comoDitar, ditar } from '../nativo/voz'

/**
 * Botão de microfone ao lado de um campo: o que for falado vai para `onTexto`. Com `iniciar`, começa a ouvir ao
 * aparecer (atalho "Capturar por voz" do Android, A1); no navegador o ditado pede um toque, então só o botão aparece.
 */
export function BotaoVoz({ onTexto, iniciar = false }: { onTexto: (texto: string) => void; iniciar?: boolean }) {
  const [ouvindo, setOuvindo] = useState(false)
  const [aviso, setAviso] = useState<string | null>(null)
  const como = comoDitar()
  const jaIniciou = useRef(false)

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

  useEffect(() => {
    if (!iniciar || jaIniciou.current || como !== 'nativo') return
    jaIniciou.current = true
    void ouvir()
  })

  if (!como) return null

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
