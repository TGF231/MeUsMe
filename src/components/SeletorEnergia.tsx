import { NOMES_ENERGIA } from '../rotulos'
import type { Energia } from '../types'

export function SeletorEnergia({ valor, onChange }: { valor: Energia; onChange: (e: Energia) => void }) {
  return (
    <div className="segmentado" role="radiogroup" aria-label="Energia">
      {([1, 2, 3] as Energia[]).map((e) => (
        <button
          key={e}
          type="button"
          role="radio"
          aria-checked={valor === e}
          className={valor === e ? 'ativo' : ''}
          onClick={() => onChange(e)}
        >
          <span aria-hidden="true">
            {'●'.repeat(e)}
            {'○'.repeat(3 - e)}
          </span>{' '}
          {NOMES_ENERGIA[e]}
        </button>
      ))}
    </div>
  )
}

/** Alterna a energia a cada clique (baixa, média, alta). */
export function PontosEditaveis({ energia, onChange }: { energia: Energia; onChange: (e: Energia) => void }) {
  return (
    <button
      type="button"
      className="pontos editavel"
      title={`Energia ${NOMES_ENERGIA[energia].toLowerCase()}. Toque para mudar.`}
      aria-label={`Energia ${NOMES_ENERGIA[energia].toLowerCase()}. Toque para mudar.`}
      onClick={(e) => {
        e.stopPropagation()
        onChange(((energia % 3) + 1) as Energia)
      }}
    >
      <span aria-hidden="true">
        {'●'.repeat(energia)}
        {'○'.repeat(3 - energia)}
      </span>
    </button>
  )
}

export function Pontos({ energia }: { energia: Energia }) {
  return (
    <span className="pontos" role="img" title={`Energia ${NOMES_ENERGIA[energia].toLowerCase()}`} aria-label={`Energia ${NOMES_ENERGIA[energia].toLowerCase()}`}>
      <span aria-hidden="true">
        {'●'.repeat(energia)}
        {'○'.repeat(3 - energia)}
      </span>
    </span>
  )
}
