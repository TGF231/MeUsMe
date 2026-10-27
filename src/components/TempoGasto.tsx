import { useState } from 'react'
import { minutosDoPasso, useStore } from '../store'
import type { Passo } from '../types'
import { duracao } from '../util'

const OPCOES = [5, 15, 30, 45, 60, 90, 120]

/** Tempo gasto no passo; sem registro de cronômetro, oferece seleção rápida. */
export function TempoGasto({ passo, perguntar = false }: { passo: Passo; perguntar?: boolean }) {
  const sessoes = useStore((s) => s.sessoes)
  const atualizar = useStore((s) => s.atualizarPasso)
  const [aberto, setAberto] = useState(perguntar)
  const minutos = minutosDoPasso(passo, sessoes)
  const cronometrado = sessoes.some((x) => x.passoId === passo.id)

  if (minutos >= 1 && !aberto)
    return (
      <button className="tempo" onClick={() => setAberto(true)} title="Ajustar o tempo">
        {duracao(minutos)}
      </button>
    )

  if (!aberto)
    return (
      <button className="tempo vazio" onClick={() => setAberto(true)} title="Ajustar o tempo">
        {cronometrado ? 'menos de 1 min' : '+ tempo'}
      </button>
    )

  return (
    <div className="pergunta-tempo">
      <span className="rotulo">{cronometrado ? 'Somar tempo feito fora do cronômetro:' : 'Quanto tempo levou, mais ou menos?'}</span>
      <div className="chips">
        {OPCOES.map((m) => (
          <button
            key={m}
            className={passo.minutosManuais === m ? 'ativo' : ''}
            onClick={() => {
              atualizar(passo.id, { minutosManuais: m })
              setAberto(false)
            }}
          >
            {duracao(m)}
          </button>
        ))}
        <button className="discreto" onClick={() => setAberto(false)}>
          {passo.minutosManuais ? 'Manter' : 'Não sei'}
        </button>
      </div>
    </div>
  )
}
