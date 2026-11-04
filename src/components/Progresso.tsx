import type { Passo } from '../types'
import { progresso } from '../calculos'
import { Progresso } from '../tema/megui-react.mjs'

/**
 * Barra até a linha de chegada (Progresso do MegUI). Conta o que já foi feito desde o começo: ver a distância
 * encurtar sustenta o esforço perto do fim (efeito do gradiente de meta).
 */
export function BarraProgresso({ passos, projetoId }: { passos: Passo[]; projetoId: string }) {
  const { feitos, total, fracao } = progresso(passos, projetoId)
  if (total === 0) return null
  const faltam = total - feitos
  return (
    <Progresso
      className="progresso"
      valor={Math.round(fracao * 100)}
      rotulo={`${feitos} de ${total} passos · ${faltam === 0 ? 'todos feitos' : faltam === 1 ? 'falta 1' : `faltam ${faltam}`}`}
    />
  )
}
