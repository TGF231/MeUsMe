import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import App from './App.tsx'
import { ehNativo } from './nativo/plataforma'

// No navegador, o service worker deixa o app funcionar offline e ser instalado.
// Dentro do app Android ele é desnecessário e poderia servir uma versão velha depois de uma atualização.
if (!ehNativo()) registerSW({ immediate: true })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
