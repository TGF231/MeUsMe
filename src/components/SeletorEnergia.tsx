import { NOMES_ENERGIA } from '../rotulos'
import type { Energia } from '../types'

export function SeletorEnergia({ valor, onChange }: { valor: Energia; onChange: (e: Energia) => void }) {
  return (
    <div className="segmentado" role="radiogroup">
      {([1, 2, 3] as Energia[]).map((e) => (
        <button
          key={e}
          type="button"
          role="radio"
          aria-checked={valor === e}
          className={valor === e ? 'ativo' : ''}
          onClick={() => onChange(e)}
        >
          {'●'.repeat(e)}
          {'○'.repeat(3 - e)} {NOMES_ENERGIA[e]}
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
      {'●'.repeat(energia)}
      {'○'.repeat(3 - energia)}
    </button>
  )
}

export function Pontos({ energia }: { energia: Energia }) {
  return (
    <span className="pontos" title={`Energia ${NOMES_ENERGIA[energia].toLowerCase()}`}>
      {'●'.repeat(energia)}
      {'○'.repeat(3 - energia)}
    </span>
  )
}
