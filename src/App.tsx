import { App as AppNativo } from '@capacitor/app'
import { useEffect, useRef, useState } from 'react'
import { useAgendador } from './agendador'
import { Icone } from './components/Icone'
import { Captura, processarCapturas } from './nativo/captura'
import { manterNotificacoesAgendadas } from './nativo/lembretesNativos'
import { ehAndroid, ehNativo } from './nativo/plataforma'
import { Agenda } from './screens/Agenda'
import { Agora } from './screens/Agora'
import { Ajustes } from './screens/Ajustes'
import { Caixa } from './screens/Caixa'
import { Financas } from './screens/Financas'
import { Historico } from './screens/Historico'
import { Projetos } from './screens/Projetos'
import { useStore } from './store'
import { useAvisos } from './stores/config'
import { useSincronizacao } from './sync/motor'

type Aba = 'agora' | 'agenda' | 'caixa' | 'financas' | 'projetos' | 'historico' | 'ajustes'

const ABAS: { id: Exclude<Aba, 'ajustes'>; nome: string }[] = [
  { id: 'agora', nome: 'Agora' },
  { id: 'agenda', nome: 'Agenda' },
  { id: 'caixa', nome: 'Caixa' },
  { id: 'financas', nome: 'Finanças' },
  { id: 'projetos', nome: 'Projetos' },
  { id: 'historico', nome: 'Histórico' },
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
  useSincronizacao()

  // Ctrl+Espaço abre a captura rápida.
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

  // Android: agenda notificações, processa capturas e trata o botão voltar.
  useEffect(() => manterNotificacoesAgendadas(), [])
  useEffect(() => {
    if (!ehAndroid()) return
    void processarCapturas()
    const ouvintes = [
      Captura.addListener('captura', () => void processarCapturas()),
      AppNativo.addListener('resume', () => void processarCapturas()),
    ]
    return () => ouvintes.forEach((o) => void o.then((h) => h.remove()))
  }, [])
  const estado = useRef({ aba, capturando })
  useEffect(() => {
    estado.current = { aba, capturando }
  })
  useEffect(() => {
    if (!ehNativo()) return
    const ouvinte = AppNativo.addListener('backButton', () => {
      const { aba, capturando } = estado.current
      if (capturando) setCapturando(false)
      else if (aba !== 'agora') setAba('agora')
      else void AppNativo.minimizeApp()
    })
    return () => void ouvinte.then((h) => h.remove())
  }, [])

  const nomeDaAba = aba === 'ajustes' ? 'Ajustes' : ABAS.find((a) => a.id === aba)!.nome

  // Layout da navegação (abas, trilho ou barra lateral) definido em index.css.
  return (
    <div className="app">
      <nav className="abas" aria-label="Seções">
        <p className="marca">MeUsMe</p>
        <button className="primario nav-capturar" onClick={() => setCapturando(true)} title="Captura rápida (Ctrl+Espaço)">
          <span aria-hidden="true">+</span> Capturar <kbd>Ctrl+Espaço</kbd>
        </button>
        {ABAS.map((a) => (
          <button key={a.id} className={aba === a.id ? 'ativo' : ''} onClick={() => setAba(a.id)} aria-current={aba === a.id ? 'page' : undefined}>
            <Icone nome={a.id} />
            <span>{a.nome}</span>
            {a.id === 'caixa' && naCaixa > 0 && <span className="contador">{naCaixa}</span>}
          </button>
        ))}
        <button
          className={`nav-ajustes ${aba === 'ajustes' ? 'ativo' : ''}`}
          onClick={() => setAba('ajustes')}
          aria-current={aba === 'ajustes' ? 'page' : undefined}
        >
          <Icone nome="ajustes" />
          <span>Ajustes</span>
        </button>
      </nav>

      <div className="conteudo">
        <header className="topo">
          <h1>
            <span className="so-estreito">{aba === 'ajustes' ? 'Ajustes' : 'MeUsMe'}</span>
            <span className="so-lateral">{nomeDaAba}</span>
          </h1>
          <button
            className={`discreto icone-botao so-estreito ${aba === 'ajustes' ? 'ativo' : ''}`}
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
          {aba === 'historico' && <Historico />}
          {aba === 'ajustes' && <Ajustes />}
        </main>
      </div>

      <Avisos />

      <button className="fab" aria-label="Captura rápida (Ctrl+Espaço)" title="Captura rápida (Ctrl+Espaço)" onClick={() => setCapturando(true)}>
        +
      </button>

      {capturando && <CapturaRapida onFechar={() => setCapturando(false)} />}
    </div>
  )
}
