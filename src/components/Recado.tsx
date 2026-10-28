import { useEffect, useRef, useState } from 'react'
import { guardarAudio, lerAudio } from '../audios'
import { useStore } from '../store'
import { novoId } from '../util'

// Recado é para tirar da cabeça, não para ditar um texto longo.
const LIMITE_S = 120

const podeGravar = () => typeof MediaRecorder !== 'undefined' && !!navigator.mediaDevices?.getUserMedia

const relogio = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`

/** Grava um recado de voz direto na Caixa: um toque começa, outro termina. */
export function GravarRecado() {
  const capturarAudio = useStore((s) => s.capturarAudio)
  const [gravando, setGravando] = useState<{ parar: () => void; inicio: number } | null>(null)
  const [passados, setPassados] = useState(0)
  const [aviso, setAviso] = useState<string | null>(null)

  useEffect(() => {
    if (!gravando) return
    const t = setInterval(() => {
      const s = (Date.now() - gravando.inicio) / 1000
      setPassados(s)
      if (s >= LIMITE_S) gravando.parar()
    }, 250)
    return () => clearInterval(t)
  }, [gravando])

  if (!podeGravar()) return null

  const comecar = async () => {
    setAviso(null)
    let fluxo: MediaStream
    try {
      fluxo = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch (e) {
      setAviso(
        e instanceof DOMException && e.name === 'NotAllowedError'
          ? 'Sem permissão para o microfone. No Android, libere em Configurações → Apps → MeUsMe → Permissões.'
          : 'Não deu para usar o microfone.',
      )
      return
    }
    const gravador = new MediaRecorder(fluxo)
    const pedacos: Blob[] = []
    const inicio = Date.now()
    gravador.ondataavailable = (e) => e.data.size && pedacos.push(e.data)
    gravador.onstop = async () => {
      fluxo.getTracks().forEach((t) => t.stop())
      setGravando(null)
      setPassados(0)
      const segundos = Math.round((Date.now() - inicio) / 1000)
      if (segundos < 1 || pedacos.length === 0) return
      const id = novoId()
      try {
        await guardarAudio(id, new Blob(pedacos, { type: gravador.mimeType }))
        capturarAudio(id, segundos)
      } catch {
        setAviso('Não deu para guardar o áudio neste navegador (janela anônima?).')
      }
    }
    gravador.start()
    setGravando({ parar: () => gravador.state !== 'inactive' && gravador.stop(), inicio })
  }

  return (
    <div className="linha">
      {gravando ? (
        <button type="button" className="primario" onClick={gravando.parar}>
          ■ Parar e guardar · {relogio(passados)}
        </button>
      ) : (
        <button type="button" onClick={comecar}>
          🎙 Gravar um recado
        </button>
      )}
      {aviso && (
        <p className="motivo aviso-voz" role="status">
          {aviso}
        </p>
      )}
    </div>
  )
}

/** Toca o recado guardado neste aparelho. */
export function OuvirRecado({ id, segundos }: { id: string; segundos: number }) {
  const [url, setUrl] = useState<string | null>(null)
  const [faltando, setFaltando] = useState(false)
  const atual = useRef<string | null>(null)

  useEffect(() => {
    let vivo = true
    lerAudio(id)
      .then((audio) => {
        if (!vivo) return
        if (!audio) return setFaltando(true)
        atual.current = URL.createObjectURL(audio)
        setUrl(atual.current)
      })
      .catch(() => vivo && setFaltando(true))
    return () => {
      vivo = false
      if (atual.current) URL.revokeObjectURL(atual.current)
    }
  }, [id])

  if (faltando) return <p className="motivo">O áudio deste recado não está neste aparelho.</p>
  return url ? <audio className="recado" controls src={url} aria-label={`Recado de voz de ${relogio(segundos)}`} /> : null
}
