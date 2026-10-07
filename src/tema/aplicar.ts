import { SystemBars, SystemBarsStyle } from '@capacitor/core'
import { ehDesktop, ehNativo } from '../nativo/plataforma'
import { useConfig } from '../stores/config'
import { resolverAcento } from './cores'

const sistemaEscuro = () => window.matchMedia('(prefers-color-scheme: dark)').matches

/** O tema que está valendo agora, resolvendo o "automático". */
export function temaEfetivo() {
  const { tema } = useConfig.getState()
  return tema === 'auto' ? (sistemaEscuro() ? 'escuro' : 'claro') : tema
}

/**
 * Aplica tema e acento: o CSS já tem as duas paletas; aqui só se escolhe qual vale (atributo data-tema)
 * e se escrevem as variáveis do acento. Também ajusta o que fica fora da página:
 * a barra de status do Android e a barra de título do Windows.
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
  // Cor da barra do navegador e da tela de abertura do PWA: o fundo do tema.
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', getComputedStyle(raiz).getPropertyValue('--fundo').trim())
  if (ehNativo()) void SystemBars.setStyle({ style: escuro ? SystemBarsStyle.Dark : SystemBarsStyle.Light }).catch(() => {})
  if (ehDesktop())
    void import('@tauri-apps/api/window').then(({ getCurrentWindow }) =>
      getCurrentWindow()
        .setTheme(tema === 'auto' ? null : escuro ? 'dark' : 'light')
        .catch(() => {}),
    )
}

/** Mantém o tema em dia: ao mudar nos Ajustes, ao chegar pela sincronização e quando o sistema troca claro/escuro. */
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
