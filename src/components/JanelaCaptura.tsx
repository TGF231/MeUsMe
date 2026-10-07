import { listen } from '@tauri-apps/api/event'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { useEffect, useRef, useState } from 'react'
import { useStore } from '../store'

/**
 * Janela pequena do app Windows, aberta pelo atalho global de qualquer programa.
 * Escreve, Enter, some. Sem sair do que você estava fazendo.
 */
export function JanelaCaptura() {
  const capturar = useStore((s) => s.capturar)
  const [texto, setTexto] = useState('')
  const [guardado, setGuardado] = useState(false)
  const campo = useRef<HTMLInputElement>(null)
  const janela = getCurrentWindow()

  useEffect(() => {
    const abrir = listen('abrir-captura', () => {
      setTexto('')
      setGuardado(false)
      setTimeout(() => campo.current?.focus(), 30)
    })
    campo.current?.focus()
    return () => void abrir.then((parar) => parar())
  }, [])

  const fechar = () => void janela.hide()

  return (
    <form
      className="janela-captura"
      onSubmit={(e) => {
        e.preventDefault()
        if (!texto.trim()) return fechar()
        capturar(texto.trim())
        setGuardado(true)
        setTexto('')
        setTimeout(fechar, 450)
      }}
    >
      <input
        ref={campo}
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        onKeyDown={(e) => e.key === 'Escape' && fechar()}
        placeholder={guardado ? 'Guardado na Caixa ✓' : 'O que está na sua cabeça? (Enter guarda, Esc fecha)'}
        aria-label="Captura rápida"
      />
    </form>
  )
}
