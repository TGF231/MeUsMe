import { useState } from 'react'
import { useAgenda } from '../stores/agenda'
import type { Lembrete } from '../types'
import { hoje, horaInput, juntarDataHora } from '../util'

const REPETIR: Record<Lembrete['repetir'], string> = {
  nunca: 'Uma vez',
  diario: 'Todo dia',
  semanal: 'Toda semana',
  mensal: 'Todo mês',
}

interface Props {
  inicial?: string
  onPronto?: () => void
  onCancelar?: () => void
}

export function LembreteForm({ inicial = '', onPronto, onCancelar }: Props) {
  const criar = useAgenda((s) => s.criarLembrete)
  const [texto, setTexto] = useState(inicial)
  const [data, setData] = useState(hoje())
  const [horaTexto, setHoraTexto] = useState(() => horaInput(Math.ceil((Date.now() + 3_600_000) / 1_800_000) * 1_800_000))
  const [repetir, setRepetir] = useState<Lembrete['repetir']>('nunca')

  return (
    <form
      className="form"
      onSubmit={(e) => {
        e.preventDefault()
        if (!texto.trim()) return
        criar({ texto: texto.trim(), quando: juntarDataHora(data, horaTexto), repetir })
        setTexto('')
        onPronto?.()
      }}
    >
      <input autoFocus={!inicial} value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Me lembre de…" aria-label="Lembrete" />
      <div className="linha">
        <input type="date" value={data} onChange={(e) => setData(e.target.value)} aria-label="Dia" className="flex" />
        <input type="time" value={horaTexto} onChange={(e) => setHoraTexto(e.target.value)} aria-label="Hora" className="flex" />
      </div>
      <div className="chips" role="group" aria-label="Repetir">
        {(Object.keys(REPETIR) as Lembrete['repetir'][]).map((r) => (
          <button key={r} type="button" className={repetir === r ? 'ativo' : ''} aria-pressed={repetir === r} onClick={() => setRepetir(r)}>
            {REPETIR[r]}
          </button>
        ))}
      </div>
      <div className="linha">
        <button type="submit" className="primario">
          Criar lembrete
        </button>
        {onCancelar && (
          <button type="button" onClick={onCancelar}>
            Cancelar
          </button>
        )}
      </div>
    </form>
  )
}
