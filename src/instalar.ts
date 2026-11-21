import { create } from 'zustand'

/**
 * Instalar o MeUsMe como app (PWA) pelo navegador.
 *
 * Chrome, Edge e Android avisam que o site pode ser instalado com o evento beforeinstallprompt; ele é guardado aqui
 * para o botão Instalar de Ajustes disparar a pergunta do navegador quando a pessoa quiser (sem pop-up sozinho). O
 * iPhone não tem esse evento: lá o caminho é Compartilhar → Adicionar à Tela de Início, que Ajustes explica.
 */

interface EventoInstalar extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export const usePwa = create<{ evento: EventoInstalar | null; instalado: boolean }>()(() => ({ evento: null, instalado: false }))

/** Já está aberto como app instalado (janela própria, sem a barra do navegador). */
export const abertoComoApp = () =>
  window.matchMedia?.('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true

/** iPhone ou iPad no Safari, onde a instalação é manual. */
export const ehIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)

/** Chamado uma vez, cedo (main.tsx): o evento chega logo que a página carrega. */
export function ouvirInstalacao() {
  usePwa.setState({ instalado: abertoComoApp() })
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    usePwa.setState({ evento: e as EventoInstalar })
  })
  window.addEventListener('appinstalled', () => usePwa.setState({ evento: null, instalado: true }))
}

/** Abre a pergunta do navegador. true se a pessoa aceitou. */
export async function instalar() {
  const e = usePwa.getState().evento
  if (!e) return false
  await e.prompt()
  const { outcome } = await e.userChoice
  usePwa.setState({ evento: null })
  return outcome === 'accepted'
}
