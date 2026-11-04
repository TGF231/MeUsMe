import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './tema/megui.css'
import './index.css'
import App from './App.tsx'
import { JanelaCaptura } from './components/JanelaCaptura'
import { LimiteDeErro } from './components/LimiteDeErro'
import { capturarErrosGlobais } from './erros'
import { ehDesktop, ehNativo } from './nativo/plataforma'
import { useStore } from './store'
import { useAgenda } from './stores/agenda'
import { useConfig } from './stores/config'
import { useFinancas } from './stores/financas'
import { manterTema } from './tema/aplicar'

capturarErrosGlobais()

// Service worker só na web: nos apps nativos poderia servir assets antigos após atualização.
if (!ehNativo() && !ehDesktop()) registerSW({ immediate: true })

// WebView2 reduz timers de janelas ocultas (bandeja); um Web Lock pendente evita o throttling intenso.
if (ehDesktop()) void navigator.locks?.request('meusme-manter-acordado', () => new Promise(() => {}))

// Reidrata quando outra janela ou aba grava no localStorage (ex.: janela de captura no Windows).
const lojas = { meusme: useStore, 'meusme-financas': useFinancas, 'meusme-agenda': useAgenda, 'meusme-config': useConfig }
window.addEventListener('storage', (e) => {
  if (e.key && e.key in lojas) void lojas[e.key as keyof typeof lojas].persist.rehydrate()
})

// Antes do primeiro render, para evitar flash de tema.
manterTema()

const captura = location.hash === '#captura'
if (captura) document.documentElement.classList.add('modo-captura')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LimiteDeErro>{captura ? <JanelaCaptura /> : <App />}</LimiteDeErro>
  </StrictMode>,
)
