import { SystemBars, SystemBarsStyle } from '@capacitor/core'
import { ehDesktop, ehNativo } from '../nativo/plataforma'
import { useConfig } from '../stores/config'
import { resolverAcento } from './cores'

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

  const a = resolverAcento(acento)
  for (const [modo, v] of [['claro', a.claro], ['escuro', a.escuro]] as const) {
    raiz.style.setProperty(`--acento-${modo}`, v.acento)
    raiz.style.setProperty(`--acento-hover-${modo}`, v.hover)
    raiz.style.setProperty(`--acento-leve-${modo}`, v.suave)
    raiz.style.setProperty(`--acento-texto-${modo}`, v.texto)
  }

  const escuro = temaEfetivo() === 'escuro'
  // theme-color acompanha o fundo do tema.
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', getComputedStyle(raiz).getPropertyValue('--fundo').trim())
  if (ehNativo()) void SystemBars.setStyle({ style: escuro ? SystemBarsStyle.Dark : SystemBarsStyle.Light }).catch(() => {})
  if (ehDesktop())
    void import('@tauri-apps/api/window').then(({ getCurrentWindow }) =>
      getCurrentWindow()
        .setTheme(tema === 'auto' ? null : escuro ? 'dark' : 'light')
        .catch(() => {}),
    )
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
