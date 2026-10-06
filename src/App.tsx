import { useEffect, useRef, useState } from 'react'
import { Agora } from './screens/Agora'
import { Caixa } from './screens/Caixa'
import { Diario } from './screens/Diario'
import { Projetos } from './screens/Projetos'
import { useStore } from './store'

type Aba = 'agora' | 'caixa' | 'projetos' | 'diario'

const ABAS: { id: Aba; nome: string }[] = [
  { id: 'agora', nome: 'Agora' },
  { id: 'caixa', nome: 'Caixa' },
  { id: 'projetos', nome: 'Projetos' },
  { id: 'diario', nome: 'Diário' },
]

function CapturaRapida({ onFechar }: { onFechar: () => void }) {
  const capturar = useStore((s) => s.capturar)
  const [texto, setTexto] = useState('')
  const ref = useRef<HTMLInputElement>(null)
  useEffect(() => ref.current?.focus(), [])

  return (
    <div className="fundo" onClick={onFechar}>
      <form
        className="modal"
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault()
          if (texto.trim()) capturar(texto.trim())
          onFechar()
        }}
      >
        <label className="rotulo">O que está na sua cabeça?</label>
        <input
          ref={ref}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => e.key === 'Escape' && onFechar()}
          placeholder="Escreva e aperte Enter"
        />
        <button type="submit" className="primario">
          Guardar na caixa
        </button>
      </form>
    </div>
  )
}

export default function App() {
  const [aba, setAba] = useState<Aba>('agora')
  const [capturando, setCapturando] = useState(false)
  const naCaixa = useStore((s) => s.capturas.length)

  // Atalho no PC: Ctrl+Espaço abre a captura de qualquer lugar do app.
  useEffect(() => {
    const atalho = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.code === 'Space') {
        e.preventDefault()
        setCapturando(true)
      }
    }
    window.addEventListener('keydown', atalho)
    return () => window.removeEventListener('keydown', atalho)
  }, [])

  return (
    <div className="app">
      <header className="topo">
        <h1>MeUsMe</h1>
      </header>

      <main>
        {aba === 'agora' && <Agora />}
        {aba === 'caixa' && <Caixa />}
        {aba === 'projetos' && <Projetos />}
        {aba === 'diario' && <Diario />}
      </main>

      <button className="fab" aria-label="Captura rápida (Ctrl+Espaço)" title="Captura rápida (Ctrl+Espaço)" onClick={() => setCapturando(true)}>
        +
      </button>

      <nav className="abas">
        {ABAS.map((a) => (
          <button key={a.id} className={aba === a.id ? 'ativo' : ''} onClick={() => setAba(a.id)}>
            {a.nome}
            {a.id === 'caixa' && naCaixa > 0 && <span className="contador">{naCaixa}</span>}
          </button>
        ))}
      </nav>

      {capturando && <CapturaRapida onFechar={() => setCapturando(false)} />}
    </div>
  )
}
