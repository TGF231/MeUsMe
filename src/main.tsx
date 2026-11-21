import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './tema/megui.css'
import './tema/megui-componentes.css'
import './index.css'
import './tema/acabamento.css'
import App from './App.tsx'
import { JanelaCaptura } from './components/JanelaCaptura'
import { LimiteDeErro } from './components/LimiteDeErro'
import { capturarErrosGlobais } from './erros'
import { ouvirInstalacao } from './instalar'
import { ehDesktop, ehNativo } from './nativo/plataforma'
import { useStore } from './store'
import { useAgenda } from './stores/agenda'
import { useAvisos, useConfig } from './stores/config'
import { useFinancas } from './stores/financas'
import { manterTema } from './tema/aplicar'

capturarErrosGlobais()

// Service worker só na web: nos apps nativos poderia servir assets antigos após atualização.
// Web (PWA): versão nova fica esperando e o app avisa, com Atualizar; ignorado o aviso, ela entra na próxima vez que o
// app abrir do zero. Com o app aberto por muito tempo, procura versão nova a cada hora.
if (!ehNativo() && !ehDesktop()) {
  ouvirInstalacao()
  const atualizar = registerSW({
    immediate: true,
    onNeedRefresh() {
      useAvisos.getState().mostrar('Versão nova pronta', 'Atualize quando quiser: nada do que está neste aparelho se perde.', {
        acao: { rotulo: 'Atualizar', fazer: () => void atualizar(true) },
      })
    },
    // Sem aviso de 'pronto para usar offline': não pede ação e, no topo, cobria a introdução no celular. O cartão
    // Instalar o app, em Ajustes, já diz que o app funciona sem internet.
    onRegisteredSW(_url, registro) {
      if (registro) setInterval(() => void registro.update().catch(() => {}), 60 * 60 * 1000)
    },
  })
}

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
