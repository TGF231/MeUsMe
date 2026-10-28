import { SpeechRecognition } from '@capacitor-community/speech-recognition'
import { ehDesktop, ehNativo } from './plataforma'

/**
 * Ditado. No Android usa o reconhecimento de voz do sistema (diálogo do Google; em alguns aparelhos
 * o áudio é processado no servidor dele). No navegador usa a Web Speech API, quando existe.
 * O WebView2 do Windows não tem reconhecimento de voz: lá o caminho é o Win+H do próprio sistema.
 */
export type ComoDitar = 'nativo' | 'navegador' | 'windows' | null

// A Web Speech API não está nos tipos do TypeScript; só o que é usado aqui.
interface Reconhecedor {
  lang: string
  interimResults: boolean
  maxAlternatives: number
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null
  onerror: ((e: { error: string }) => void) | null
  onend: (() => void) | null
  start(): void
}
type ConstrutorReconhecedor = new () => Reconhecedor

const reconhecedorDoNavegador = () => {
  const w = window as unknown as Record<string, ConstrutorReconhecedor | undefined>
  return w.SpeechRecognition ?? w.webkitSpeechRecognition
}

export function comoDitar(): ComoDitar {
  if (ehNativo()) return 'nativo'
  if (ehDesktop()) return 'windows'
  return reconhecedorDoNavegador() ? 'navegador' : null
}

/** Erro com texto pronto para mostrar. */
export class ErroDeVoz extends Error {}

/** Ouve uma frase e devolve o texto, ou null se nada foi entendido. */
export async function ditar(): Promise<string | null> {
  if (ehNativo()) {
    if (!(await SpeechRecognition.available()).available)
      throw new ErroDeVoz('Este aparelho não tem reconhecimento de voz. O microfone do teclado também funciona.')
    let { speechRecognition } = await SpeechRecognition.checkPermissions()
    if (speechRecognition !== 'granted') ({ speechRecognition } = await SpeechRecognition.requestPermissions())
    if (speechRecognition !== 'granted')
      throw new ErroDeVoz('Sem permissão para o microfone. Dá para liberar em Configurações → Apps → MeUsMe → Permissões.')
    const { matches } = await SpeechRecognition.start({ language: 'pt-BR', maxResults: 1, popup: true, partialResults: false, prompt: 'Fale o passo' })
    return matches?.[0]?.trim() || null
  }

  const Construtor = reconhecedorDoNavegador()
  if (!Construtor) throw new ErroDeVoz('Este navegador não tem reconhecimento de voz.')
  return new Promise((resolve, reject) => {
    const r = new Construtor()
    let texto: string | null = null
    r.lang = 'pt-BR'
    r.interimResults = false
    r.maxAlternatives = 1
    r.onresult = (e) => (texto = e.results[0]?.[0]?.transcript.trim() || null)
    r.onerror = (e) =>
      e.error === 'no-speech' || e.error === 'aborted'
        ? resolve(null)
        : reject(new ErroDeVoz(e.error === 'not-allowed' ? 'Sem permissão para o microfone neste navegador.' : 'O ditado falhou. Tente de novo.'))
    r.onend = () => resolve(texto)
    r.start()
  })
}
