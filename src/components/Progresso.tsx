import type { Passo } from '../types'
import { progresso } from '../calculos'

/**
 * Barra até a linha de chegada. Conta o que já foi feito desde o começo: ver a distância encurtar
 * sustenta o esforço perto do fim (efeito do gradiente de meta).
 */
export function BarraProgresso({ passos, projetoId }: { passos: Passo[]; projetoId: string }) {
  const { feitos, total, fracao } = progresso(passos, projetoId)
  if (total === 0) return null
  const faltam = total - feitos
  return (
    <div className="progresso" role="img" aria-label={`${feitos} de ${total} passos feitos`}>
      <div className="barra">
        <div className="cheia" style={{ width: `${Math.round(fracao * 100)}%` }} />
      </div>
      <span className="motivo">
        {feitos} de {total} passos · {faltam === 0 ? 'todos feitos' : faltam === 1 ? 'falta 1' : `faltam ${faltam}`}
      </span>
    </div>
  )
}
