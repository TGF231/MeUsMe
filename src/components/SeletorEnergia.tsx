import { NOMES_ENERGIA } from '../rotulos'
import type { Energia } from '../types'

/** Cinco bolinhas, n cheias e maiores que as vazias: desenhadas em CSS, porque os caracteres de bolinha vêm de fontes diferentes. */
function Bolinhas({ n }: { n: Energia }) {
  return (
    <span className="bolinhas" aria-hidden="true">
      {[1, 2, 3, 4, 5].map((i) => (
        <i key={i} className={i <= n ? 'cheia' : ''} />
      ))}
    </span>
  )
}

export function SeletorEnergia({ valor, onChange }: { valor: Energia; onChange: (e: Energia) => void }) {
  return (
    <div className="segmentado energia" role="radiogroup" aria-label="Energia">
      {([1, 2, 3, 4, 5] as Energia[]).map((e) => (
        <button
          key={e}
          type="button"
          role="radio"
          aria-checked={valor === e}
          className={valor === e ? 'ativo' : ''}
          onClick={() => onChange(e)}
        >
          <Bolinhas n={e} />
          <span>{NOMES_ENERGIA[e]}</span>
        </button>
      ))}
    </div>
  )
}

/** Alterna a energia a cada clique, de baixa a alta e de volta a baixa. */
export function PontosEditaveis({ energia, onChange }: { energia: Energia; onChange: (e: Energia) => void }) {
  return (
    <button
      type="button"
      className="pontos editavel"
      title={`Energia ${NOMES_ENERGIA[energia].toLowerCase()}. Toque para mudar.`}
      aria-label={`Energia ${NOMES_ENERGIA[energia].toLowerCase()}. Toque para mudar.`}
      onClick={(e) => {
        e.stopPropagation()
        onChange(((energia % 5) + 1) as Energia)
      }}
    >
      <Bolinhas n={energia} />
    </button>
  )
}

export function Pontos({ energia }: { energia: Energia }) {
  return (
    <span className="pontos" role="img" title={`Energia ${NOMES_ENERGIA[energia].toLowerCase()}`} aria-label={`Energia ${NOMES_ENERGIA[energia].toLowerCase()}`}>
      <Bolinhas n={energia} />
    </span>
  )
}
