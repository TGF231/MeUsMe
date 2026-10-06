import type { Energia } from '../types'

export const NOMES_ENERGIA: Record<Energia, string> = { 1: 'Baixa', 2: 'Média', 3: 'Alta' }

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

export function Pontos({ energia }: { energia: Energia }) {
  return (
    <span className="pontos" title={`Energia ${NOMES_ENERGIA[energia].toLowerCase()}`}>
      {'●'.repeat(energia)}
      {'○'.repeat(3 - energia)}
    </span>
  )
}
