import { useState } from 'react'
import { somarDias } from '../calculos'
import { HUMORES } from '../rotulos'
import { hoje, useStore } from '../store'
import type { CheckIn, Energia } from '../types'
import { inicioDoDia } from '../util'
import { SeletorEnergia } from './SeletorEnergia'
import { BotaoInterruptor } from '../tema/megui-react.mjs'

/**
 * Encerrar o dia (V15 em docs/CONCORRENTES.md), junto do check-in: o que foi feito hoje e, se algum passo com prazo
 * hoje ficou, um toque passa para amanhã. Sem contar atraso e sem vermelho.
 */
function EncerrarODia() {
  const passos = useStore((s) => s.passos)
  const atualizar = useStore((s) => s.atualizarPasso)
  const desde = inicioDoDia()
  const feitos = passos.filter((p) => p.feitoEm && p.feitoEm >= desde)
  const ficaram = passos.filter((p) => !p.feitoEm && p.prazo === hoje())
  if (!feitos.length && !ficaram.length) return null
  const amanha = somarDias(hoje(), 1)

  return (
    <div className="form">
      <p className="rotulo">{feitos.length ? `Hoje: ${feitos.length} passo${feitos.length === 1 ? '' : 's'} feito${feitos.length === 1 ? '' : 's'}` : 'Hoje'}</p>
      {feitos.length > 0 && (
        <ul className="lista-simples">
          {feitos.slice(0, 5).map((p) => (
            <li key={p.id}>{p.texto}</li>
          ))}
        </ul>
      )}
      {ficaram.length > 0 && (
        <div className="linha entre">
          <span className="motivo">
            {ficaram.length === 1 ? 'Um passo com prazo hoje ficou' : `${ficaram.length} passos com prazo hoje ficaram`}: {ficaram.map((p) => p.texto).join(', ')}.
          </span>
          <button type="button" onClick={() => ficaram.forEach((p) => atualizar(p.id, { prazo: amanha }))}>
            Passar para amanhã
          </button>
        </div>
      )}
    </div>
  )
}

export function CheckInForm({ onPronto }: { onPronto?: () => void }) {
  const existente = useStore((s) => s.checkins.find((c) => c.dia === hoje()))
  const salvar = useStore((s) => s.salvarCheckIn)
  const [humor, setHumor] = useState<CheckIn['humor']>(existente?.humor ?? 3)
  const [energia, setEnergia] = useState<Energia>(existente?.energia ?? 2)
  const [frase, setFrase] = useState(existente?.frase ?? '')

  return (
    <>
      <EncerrarODia />
      <form
        className="form"
        onSubmit={(e) => {
          e.preventDefault()
          salvar({ dia: hoje(), humor, energia, frase: frase.trim() })
          onPronto?.()
        }}
      >
        <label className="rotulo">Como você está?</label>
        <div className="segmentado" role="group" aria-label="Como você está">
          {([1, 2, 3, 4, 5] as CheckIn['humor'][]).map((h) => (
            <BotaoInterruptor key={h} ligado={humor === h} onClick={() => setHumor(h)}>
              {HUMORES[h]}
            </BotaoInterruptor>
          ))}
        </div>
        <label className="rotulo">Energia</label>
        <SeletorEnergia valor={energia} onChange={setEnergia} />
        <label className="rotulo">Uma frase sobre agora (opcional)</label>
        <input value={frase} onChange={(e) => setFrase(e.target.value)} placeholder="O que está na sua cabeça?" aria-label="Uma frase sobre agora" />
        <button type="submit" className="primario">
          {existente ? 'Atualizar' : 'Salvar check-in'}
        </button>
      </form>
    </>
  )
}
