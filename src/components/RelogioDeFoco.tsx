import { useStore } from '../store'
import type { Passo } from '../types'
import { duracao } from '../util'

const PALPITES = [5, 15, 30, 60, 90]

/**
 * Tempo visível: um anel que se fecha ao longo do bloco de foco. Mostrar o tempo passando por fora
 * compensa a dificuldade de senti-lo por dentro.
 */
export function AnelDoBloco({ decorrido, blocoMin }: { decorrido: number; blocoMin: number }) {
  const bloco = blocoMin * 60_000
  const noBloco = decorrido % bloco
  const fracao = noBloco / bloco
  const raio = 54
  const volta = 2 * Math.PI * raio
  const faltam = Math.ceil((bloco - noBloco) / 60_000)
  const blocos = Math.floor(decorrido / bloco)
  return (
    <div className="anel-bloco">
      <svg viewBox="0 0 120 120" aria-hidden="true">
        <circle className="trilho" cx="60" cy="60" r={raio} />
        <circle
          className="andado"
          cx="60"
          cy="60"
          r={raio}
          strokeDasharray={volta}
          strokeDashoffset={volta * (1 - fracao)}
          transform="rotate(-90 60 60)"
        />
      </svg>
      <p className="motivo centralizado">
        {blocos > 0 && `${blocos} bloco${blocos > 1 ? 's' : ''} de ${blocoMin} min feito${blocos > 1 ? 's' : ''} · `}
        faltam {faltam} min neste bloco
      </p>
    </div>
  )
}

/** Palpite de duração (opcional, nunca bloqueia o começo). Comparado com o real ao concluir. */
export function Palpite({ passo }: { passo: Passo }) {
  const atualizar = useStore((s) => s.atualizarPasso)
  if (passo.estimativaMin)
    return (
      <p className="motivo centralizado">
        Seu palpite: {duracao(passo.estimativaMin)}{' '}
        <button className="mini-botao" onClick={() => atualizar(passo.id, { estimativaMin: undefined })}>
          mudar
        </button>
      </p>
    )
  return (
    <div className="pergunta-tempo centralizado">
      <span className="rotulo">Palpite: quanto isso vai levar?</span>
      <div className="chips" role="group" aria-label="Palpite: quanto isso vai levar">
        {PALPITES.map((m) => (
          <button key={m} onClick={() => atualizar(passo.id, { estimativaMin: m })}>
            {duracao(m)}
          </button>
        ))}
      </div>
    </div>
  )
}
