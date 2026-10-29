import { App as AppNativo } from '@capacitor/app'
import { useEffect, useRef, useState } from 'react'
import { useAgendador } from './agendador'
import { Icone } from './components/Icone'
import { Introducao } from './components/Introducao'
import { usoDoArmazenamento } from './erros'
import { organizar } from './motor/executar'
import { EXEMPLOS_DE_CAMPO } from './motor/tutorial'
import { useNavegacao, type Aba } from './navegacao'
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
import { useAvisos, useConfig } from './stores/config'
import { useSincronizacao } from './sync/motor'
import { BotaoVoz } from './components/BotaoVoz'

const ABAS: { id: Exclude<Aba, 'ajustes'>; nome: string }[] = [
  { id: 'agora', nome: 'Agora' },
  { id: 'agenda', nome: 'Agenda' },
  { id: 'caixa', nome: 'Caixa' },
  { id: 'financas', nome: 'Finanças' },
  { id: 'projetos', nome: 'Projetos' },
  { id: 'historico', nome: 'Histórico' },
]

/** O corpo do aviso com o trecho que disparou a regra em negrito. */
function ComDestaque({ texto, destaque }: Readonly<{ texto: string; destaque?: string }>) {
  const i = destaque ? texto.indexOf(destaque) : -1
  if (!destaque || i < 0) return <>{texto}</>
  return (
    <>
      {texto.slice(0, i)}
      <b>{destaque}</b>
      {texto.slice(i + destaque.length)}
    </>
  )
}

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
            <ComDestaque texto={a.corpo} destaque={a.destaque} />
            {a.acao && (
              <>
                <br />
                <button
                  className="mini-botao"
                  onClick={() => {
                    a.acao!.fazer()
                    fechar(a.id)
                  }}
                >
                  {a.acao.rotulo}
                </button>
              </>
            )}
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
  const [texto, setTexto] = useState('')
  const [exemplo] = useState(() => EXEMPLOS_DE_CAMPO[Math.floor(Math.random() * EXEMPLOS_DE_CAMPO.length)])
  const ref = useRef<HTMLInputElement>(null)
  useEffect(() => ref.current?.focus(), [])

  return (
    <div className="fundo" role="dialog" aria-modal="true" aria-label="Captura rápida" onClick={onFechar}>
      <form
        className="modal"
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault()
          void organizar(texto)
          onFechar()
        }}
      >
        <label className="rotulo">O que está na sua cabeça?</label>
        <div className="linha">
          <input
            ref={ref}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={(e) => e.key === 'Escape' && onFechar()}
            placeholder={`Ex.: ${exemplo}`}
            aria-label="O que está na sua cabeça?"
          />
          {/* Falou, guardou: o ditado passa pelo motor na hora, junto do que já estava escrito. */}
          <BotaoVoz
            onTexto={(falado) => {
              void organizar([texto.trim(), falado].filter(Boolean).join(' '))
              onFechar()
            }}
          />
        </div>
        <button type="submit" className="primario">
          Guardar na caixa
        </button>
      </form>
    </div>
  )
}

export default function App() {
  const aba = useNavegacao((n) => n.aba)
  const setAba = useNavegacao((n) => n.ir)
  const introducaoVista = useConfig((c) => c.introducaoVista)
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

  // Armazenamento quase cheio: gravações começariam a falhar sem aviso.
  useEffect(() => {
    if (usoDoArmazenamento() > 0.8)
      useAvisos.getState().mostrar('Espaço quase cheio', 'Exporte um backup em Ajustes. Veja o uso em Ajustes → Sobre o MeUsMe.')
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
      else if (aba !== 'agora') useNavegacao.getState().ir('agora')
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
          {!introducaoVista ? <Introducao /> : aba === 'agora' && <Agora />}
          {introducaoVista && (
            <>
              {aba === 'agenda' && <Agenda />}
              {aba === 'caixa' && <Caixa />}
              {aba === 'financas' && <Financas />}
              {aba === 'projetos' && <Projetos />}
              {aba === 'historico' && <Historico />}
              {aba === 'ajustes' && <Ajustes />}
            </>
          )}
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
