import { useState } from 'react'
import { hoje, useStore } from '../store'
import type { CheckIn, Energia } from '../types'
import { SeletorEnergia } from './SeletorEnergia'

export const HUMORES: Record<CheckIn['humor'], string> = {
  1: 'Péssimo',
  2: 'Ruim',
  3: 'Ok',
  4: 'Bem',
  5: 'Ótimo',
}

export function CheckInForm({ onPronto }: { onPronto?: () => void }) {
  const existente = useStore((s) => s.checkins.find((c) => c.dia === hoje()))
  const salvar = useStore((s) => s.salvarCheckIn)
  const [humor, setHumor] = useState<CheckIn['humor']>(existente?.humor ?? 3)
  const [energia, setEnergia] = useState<Energia>(existente?.energia ?? 2)
  const [frase, setFrase] = useState(existente?.frase ?? '')

  return (
    <form
      className="form"
      onSubmit={(e) => {
        e.preventDefault()
        salvar({ dia: hoje(), humor, energia, frase: frase.trim() })
        onPronto?.()
      }}
    >
      <label className="rotulo">Como você está?</label>
      <div className="segmentado">
        {([1, 2, 3, 4, 5] as CheckIn['humor'][]).map((h) => (
          <button key={h} type="button" className={humor === h ? 'ativo' : ''} onClick={() => setHumor(h)}>
            {HUMORES[h]}
          </button>
        ))}
      </div>
      <label className="rotulo">Energia</label>
      <SeletorEnergia valor={energia} onChange={setEnergia} />
      <label className="rotulo">Uma frase sobre agora (opcional)</label>
      <input value={frase} onChange={(e) => setFrase(e.target.value)} placeholder="O que está na sua cabeça?" />
      <button type="submit" className="primario">
        {existente ? 'Atualizar' : 'Salvar check-in'}
      </button>
    </form>
  )
}
