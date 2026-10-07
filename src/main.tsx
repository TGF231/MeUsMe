import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import App from './App.tsx'
import { JanelaCaptura } from './components/JanelaCaptura'
import { ehDesktop, ehNativo } from './nativo/plataforma'
import { useStore } from './store'
import { useAgenda } from './stores/agenda'
import { useConfig } from './stores/config'
import { useFinancas } from './stores/financas'

// No navegador, o service worker deixa o app funcionar offline e ser instalado.
// Dentro dos apps Android e Windows ele é desnecessário e poderia servir uma versão velha depois de uma atualização.
if (!ehNativo() && !ehDesktop()) registerSW({ immediate: true })

// App Windows escondido na bandeja: sem isto, o WebView2 desacelera muito os timers (avisos e sincronização).
// Um Web Lock que nunca é liberado evita a desaceleração mais forte (sugestão da própria documentação do Tauri).
if (ehDesktop()) void navigator.locks?.request('meusme-manter-acordado', () => new Promise(() => {}))

// Outra janela (a captura rápida do Windows, ou outra aba) gravou dados: recarrega daqui também.
const lojas = { meusme: useStore, 'meusme-financas': useFinancas, 'meusme-agenda': useAgenda, 'meusme-config': useConfig }
window.addEventListener('storage', (e) => {
  if (e.key && e.key in lojas) void lojas[e.key as keyof typeof lojas].persist.rehydrate()
})

const captura = location.hash === '#captura'
if (captura) document.documentElement.classList.add('modo-captura')

createRoot(document.getElementById('root')!).render(<StrictMode>{captura ? <JanelaCaptura /> : <App />}</StrictMode>)
