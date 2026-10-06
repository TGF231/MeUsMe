import { useEffect, useRef, useState } from 'react'
import { useAgendador } from './agendador'
import { Icone } from './components/Icone'
import { Agenda } from './screens/Agenda'
import { Agora } from './screens/Agora'
import { Ajustes } from './screens/Ajustes'
import { Caixa } from './screens/Caixa'
import { Diario } from './screens/Diario'
import { Financas } from './screens/Financas'
import { Projetos } from './screens/Projetos'
import { useStore } from './store'
import { useAvisos } from './stores/config'

type Aba = 'agora' | 'agenda' | 'caixa' | 'financas' | 'projetos' | 'diario' | 'ajustes'

const ABAS: { id: Exclude<Aba, 'ajustes'>; nome: string }[] = [
  { id: 'agora', nome: 'Agora' },
  { id: 'agenda', nome: 'Agenda' },
  { id: 'caixa', nome: 'Caixa' },
  { id: 'financas', nome: 'Finanças' },
  { id: 'projetos', nome: 'Projetos' },
  { id: 'diario', nome: 'Diário' },
]

function Avisos() {
  const { avisos, fechar } = useAvisos()
  if (avisos.length === 0) return null
  return (
    <div className="avisos" role="status" aria-live="polite">
      {avisos.map((a) => (
        <div key={a.id} className="aviso">
          <span>
            <b>{a.titulo}</b>
            <br />
            {a.corpo}
          </span>
          <button className="discreto" onClick={() => fechar(a.id)} aria-label="Fechar aviso">
            ×
          </button>
        </div>
      ))}
    </div>
  )
}

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
  useAgendador()

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
        <h1>{aba === 'ajustes' ? 'Ajustes' : 'MeUsMe'}</h1>
        <button
          className={`discreto icone-botao ${aba === 'ajustes' ? 'ativo' : ''}`}
          onClick={() => setAba(aba === 'ajustes' ? 'agora' : 'ajustes')}
          aria-label="Ajustes"
          title="Ajustes"
        >
          <Icone nome="ajustes" />
        </button>
      </header>

      <main>
        {aba === 'agora' && <Agora />}
        {aba === 'agenda' && <Agenda />}
        {aba === 'caixa' && <Caixa />}
        {aba === 'financas' && <Financas />}
        {aba === 'projetos' && <Projetos />}
        {aba === 'diario' && <Diario />}
        {aba === 'ajustes' && <Ajustes />}
      </main>

      <Avisos />

      <button className="fab" aria-label="Captura rápida (Ctrl+Espaço)" title="Captura rápida (Ctrl+Espaço)" onClick={() => setCapturando(true)}>
        +
      </button>

      <nav className="abas">
        {ABAS.map((a) => (
          <button key={a.id} className={aba === a.id ? 'ativo' : ''} onClick={() => setAba(a.id)} aria-current={aba === a.id ? 'page' : undefined}>
            <Icone nome={a.id} />
            <span>{a.nome}</span>
            {a.id === 'caixa' && naCaixa > 0 && <span className="contador">{naCaixa}</span>}
          </button>
        ))}
      </nav>

      {capturando && <CapturaRapida onFechar={() => setCapturando(false)} />}
    </div>
  )
}
