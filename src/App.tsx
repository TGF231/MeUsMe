import { App as AppNativo } from '@capacitor/app'
import { useEffect, useRef, useState } from 'react'
import { proximoTamanho } from './acessibilidade'
import { useAgendador } from './agendador'
import { useJanelaModal } from './hooks'
import { Icone } from './components/Icone'
import { Introducao } from './components/Introducao'
import { usoDoArmazenamento } from './erros'
import { organizar } from './motor/executar'
import { EXEMPLOS_DE_CAMPO } from './motor/tutorial'
import { useNavegacao, type Aba } from './navegacao'
import { Captura, processarCapturas } from './nativo/captura'
import { manterNotificacoesAgendadas } from './nativo/lembretesNativos'
import { ehAndroid, ehDesktop, ehNativo } from './nativo/plataforma'
import { Agenda } from './screens/Agenda'
import { Agora } from './screens/Agora'
import { Ajustes } from './screens/Ajustes'
import { Caixa } from './screens/Caixa'
import { Financas } from './screens/Financas'
import { Historico } from './screens/Historico'
import { Projetos } from './screens/Projetos'
import { useStore } from './store'
import { AVISO_MS, useAvisos, useConfig } from './stores/config'
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

type Aviso = ReturnType<typeof useAvisos.getState>['avisos'][number]

/**
 * Um aviso sai sozinho depois de AVISO_MS, menos enquanto está em uso (mouse em cima ou foco dentro, para dar tempo
 * de ler e alcançar o Desfazer) ou com "Avisos ficam até eu fechar" ligado em Ajustes → Acessibilidade.
 */
function UmAviso({ aviso: a, fechar }: Readonly<{ aviso: Aviso; fechar: (id: number) => void }>) {
  const ficam = useConfig((c) => c.avisosFicam)
  const [emUso, setEmUso] = useState({ mouse: false, foco: false })
  const contando = !ficam && !emUso.mouse && !emUso.foco
  useEffect(() => {
    if (!contando) return
    const t = setTimeout(() => fechar(a.id), AVISO_MS)
    return () => clearTimeout(t)
  }, [contando, a.id, fechar])

  return (
    <div
      className="aviso"
      onPointerEnter={() => setEmUso((u) => ({ ...u, mouse: true }))}
      onPointerLeave={() => setEmUso((u) => ({ ...u, mouse: false }))}
      onFocus={() => setEmUso((u) => ({ ...u, foco: true }))}
      onBlur={(e) => !e.currentTarget.contains(e.relatedTarget) && setEmUso((u) => ({ ...u, foco: false }))}
    >
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
  )
}

function Avisos() {
  const { avisos, fechar } = useAvisos()
  if (avisos.length === 0) return null
  return (
    <div className="avisos" role="status" aria-live="polite">
      {avisos.map((a) => (
        <UmAviso key={a.id} aviso={a} fechar={fechar} />
      ))}
    </div>
  )
}

/** Ctrl+Z fora de um campo de texto: a ação do aviso mais recente (o Desfazer do motor), sem caçar o botão. */
function desfazerUltimoAviso(e: KeyboardEvent) {
  const alvo = e.target instanceof Element ? e.target : null
  if (!e.ctrlKey || e.key.toLowerCase() !== 'z' || alvo?.closest('input, textarea, select, [contenteditable]')) return
  const { avisos, fechar } = useAvisos.getState()
  const ultimo = avisos.findLast((a) => a.acao?.rotulo === 'Desfazer')
  if (!ultimo) return
  e.preventDefault()
  ultimo.acao!.fazer()
  fechar(ultimo.id)
}

function CapturaRapida({ onFechar }: { onFechar: () => void }) {
  const [texto, setTexto] = useState('')
  const [exemplo] = useState(() => EXEMPLOS_DE_CAMPO[Math.floor(Math.random() * EXEMPLOS_DE_CAMPO.length)])
  const janela = useJanelaModal()

  return (
    <dialog
      ref={janela}
      className="fundo"
      aria-label="Captura rápida"
      onCancel={(e) => {
        e.preventDefault()
        onFechar()
      }}
    >
      <div className="modal">
        <form
          className="form"
          onSubmit={(e) => {
            e.preventDefault()
            void organizar(texto)
            onFechar()
          }}
        >
          <label className="rotulo" htmlFor="captura-rapida">
            O que está na sua cabeça?
          </label>
          <div className="linha">
            {/* O aria-label repete o rótulo: sem ele, a WebView do Android entrega ao TalkBack só o exemplo como dica. */}
            <input
              id="captura-rapida"
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
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
      {/* Tocar fora fecha: um botão de verdade cobrindo o fundo, como no tutorial (ComoEscrever). */}
      <button type="button" className="fundo-fechar" aria-label="Fechar a captura rápida" onClick={onFechar} />
    </dialog>
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

  // Ctrl+Espaço abre a captura rápida; Ctrl+Z desfaz o que o motor acabou de criar.
  useEffect(() => {
    const atalho = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.code === 'Space') {
        e.preventDefault()
        setCapturando(true)
      } else if (ehDesktop() && e.ctrlKey && ['Equal', 'NumpadAdd', 'Minus', 'NumpadSubtract', 'Digit0', 'Numpad0'].includes(e.code)) {
        // App Windows: o zoom do WebView vem desligado, então Ctrl + / Ctrl − / Ctrl 0 mudam o tamanho do texto do app.
        e.preventDefault()
        const { tamanhoTexto, ajustar } = useConfig.getState()
        const mais = e.code === 'Equal' || e.code === 'NumpadAdd'
        ajustar({ tamanhoTexto: e.code.endsWith('0') ? 1 : proximoTamanho(tamanhoTexto, mais ? 1 : -1) })
      } else if (e.altKey && !e.ctrlKey && /^Digit[1-7]$/.test(e.code)) {
        // Alt+1 a Alt+7: as seções na ordem da navegação, sem passar por todas com Tab.
        e.preventDefault()
        const n = Number(e.code.slice(-1))
        useNavegacao.getState().ir(n <= ABAS.length ? ABAS[n - 1].id : 'ajustes')
      } else desfazerUltimoAviso(e)
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
  // Atalhos de teclado só fazem sentido (e só são anunciados) fora do celular.
  const teclado = !ehAndroid()

  // Ao trocar de seção, o título da janela diz onde se está e o foco vai para o título da seção: o leitor de tela
  // lê o lugar novo (sem isso o foco fica no botão da aba e nada é anunciado) e o Tab segue a partir dali.
  const titulo = useRef<HTMLHeadingElement>(null)
  const primeiraVez = useRef(true)
  useEffect(() => {
    document.title = aba === 'agora' ? 'MeUsMe' : `${nomeDaAba} · MeUsMe`
    if (primeiraVez.current) primeiraVez.current = false
    else titulo.current?.focus({ preventScroll: true })
  }, [aba, nomeDaAba])

  // Layout da navegação (abas, trilho ou barra lateral) definido em index.css.
  return (
    <div className="app">
      <nav className="abas" aria-label="Seções">
        <a className="so-leitor pular" href="#conteudo">
          Pular para o conteúdo
        </a>
        <p className="marca">MeUsMe</p>
        <button className="primario nav-capturar" onClick={() => setCapturando(true)} title="Captura rápida (Ctrl+Espaço)">
          <span aria-hidden="true">+</span> Capturar <kbd>Ctrl+Espaço</kbd>
        </button>
        {ABAS.map((a, i) => (
          <button
            key={a.id}
            className={aba === a.id ? 'ativo' : ''}
            onClick={() => setAba(a.id)}
            aria-current={aba === a.id ? 'page' : undefined}
            title={teclado ? `${a.nome} (Alt+${i + 1})` : undefined}
            aria-keyshortcuts={teclado ? `Alt+${i + 1}` : undefined}
          >
            <Icone nome={a.id} />
            <span>{a.nome}</span>
            {a.id === 'caixa' && naCaixa > 0 && <span className="contador">{naCaixa}</span>}
          </button>
        ))}
        <button
          className={`nav-ajustes ${aba === 'ajustes' ? 'ativo' : ''}`}
          onClick={() => setAba('ajustes')}
          aria-current={aba === 'ajustes' ? 'page' : undefined}
          title={teclado ? `Ajustes (Alt+${ABAS.length + 1})` : undefined}
          aria-keyshortcuts={teclado ? `Alt+${ABAS.length + 1}` : undefined}
        >
          <Icone nome="ajustes" />
          <span>Ajustes</span>
        </button>
      </nav>

      <div className="conteudo">
        <header className="topo">
          <h1 ref={titulo} tabIndex={-1}>
            <span className="so-estreito">
              {aba === 'ajustes' ? 'Ajustes' : 'MeUsMe'}
              {/* No celular o título mostra a marca; quem não vê a aba acesa ouve qual é. */}
              {aba !== 'ajustes' && <span className="so-leitor"> · {nomeDaAba}</span>}
            </span>
            <span className="so-lateral">{nomeDaAba}</span>
          </h1>
          <button
            className={`discreto icone-botao so-estreito ${aba === 'ajustes' ? 'ativo' : ''}`}
            onClick={() => setAba(aba === 'ajustes' ? 'agora' : 'ajustes')}
            aria-label="Ajustes"
            aria-current={aba === 'ajustes' ? 'page' : undefined}
            title="Ajustes"
          >
            <Icone nome="ajustes" />
          </button>
        </header>

        <main id="conteudo" tabIndex={-1}>
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

      {/* No celular não há Ctrl+Espaço: o leitor de tela não precisa anunciar um atalho que não existe ali. */}
      <button className="fab" aria-label={ehAndroid() ? 'Captura rápida' : 'Captura rápida (Ctrl+Espaço)'} title="Captura rápida (Ctrl+Espaço)" onClick={() => setCapturando(true)}>
        +
      </button>

      {capturando && <CapturaRapida onFechar={() => setCapturando(false)} />}
    </div>
  )
}
