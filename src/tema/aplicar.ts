import { SystemBars, SystemBarsStyle } from '@capacitor/core'
// Estático: o módulo já vai no pacote principal (JanelaCaptura), então import() não economizaria nada.
import { getCurrentWindow } from '@tauri-apps/api/window'
import { ehDesktop, ehNativo } from '../nativo/plataforma'
import { useConfig } from '../stores/config'
import { ASSINATURA, resolverAcento } from './cores'

const sistemaEscuro = () => window.matchMedia('(prefers-color-scheme: dark)').matches

/** Tema efetivo, resolvendo 'auto' pelo sistema. */
export function temaEfetivo() {
  const { tema } = useConfig.getState()
  return tema === 'auto' ? (sistemaEscuro() ? 'escuro' : 'claro') : tema
}

/**
 * Aplica o tema (atributo data-tema) e as variáveis do acento.
 * Também ajusta a barra de status (Android) e a barra de título (Windows).
 */
export function aplicarTema() {
  const { tema, acento } = useConfig.getState()
  const raiz = document.documentElement
  if (tema === 'auto') delete raiz.dataset.tema
  else raiz.dataset.tema = tema

  const escuro = temaEfetivo() === 'escuro'
  // A assinatura é o próprio megui.css; outro acento sobrescreve só as variáveis do acento, para o tema em uso.
  const a = resolverAcento(acento)
  const v = a === ASSINATURA ? null : escuro ? a.escuro : a.claro
  const variaveis = { accent: v?.acento, 'accent-hover': v?.hover, 'accent-linha': v?.linha, 'accent-soft': v?.suave, 'on-accent': v?.texto }
  for (const [nome, valor] of Object.entries(variaveis)) {
    if (valor) raiz.style.setProperty(`--megui-${nome}`, valor)
    else raiz.style.removeProperty(`--megui-${nome}`)
  }

  // theme-color acompanha o fundo do tema.
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', getComputedStyle(raiz).getPropertyValue('--fundo').trim())
  if (ehNativo()) void SystemBars.setStyle({ style: escuro ? SystemBarsStyle.Dark : SystemBarsStyle.Light }).catch(() => {})
  if (ehDesktop())
    void getCurrentWindow()
      .setTheme(tema === 'auto' ? null : escuro ? 'dark' : 'light')
      .catch(() => {})
}

/** Reaplica o tema ao mudar a configuração ou o esquema de cores do sistema. */
export function manterTema() {
  aplicarTema()
  let anterior = useConfig.getState()
  const pararConfig = useConfig.subscribe((s) => {
    if (s.tema !== anterior.tema || s.acento !== anterior.acento) aplicarTema()
    anterior = s
  })
  const sistema = window.matchMedia('(prefers-color-scheme: dark)')
  const aoMudarSistema = () => useConfig.getState().tema === 'auto' && aplicarTema()
  sistema.addEventListener('change', aoMudarSistema)
  return () => {
    pararConfig()
    sistema.removeEventListener('change', aoMudarSistema)
  }
}
