import { useState } from 'react'
import type { Energia } from '../types'
import { SeletorEnergia } from './SeletorEnergia'

// Verbos que indicam intenção vaga em vez de ação concreta.
const VAGOS = /\b(pensar|ver|resolver|organizar|decidir|melhorar|estudar|planejar|cuidar|arrumar|tentar|trabalhar|focar|entender)\b/i

interface Props {
  inicial?: string
  pergunta?: string
  rotuloBotao?: string
  energiaInicial?: Energia
  onSalvar: (texto: string, energia: Energia) => void
  onCancelar?: () => void
}

export function PassoForm({
  inicial = '',
  pergunta = 'Qual é a próxima ação física e concreta?',
  rotuloBotao = 'Adicionar passo',
  energiaInicial = 2,
  onSalvar,
  onCancelar,
}: Props) {
  const [texto, setTexto] = useState(inicial)
  const [energia, setEnergia] = useState<Energia>(energiaInicial)
  const vago = VAGOS.test(texto)

  return (
    <form
      className="form"
      onSubmit={(e) => {
        e.preventDefault()
        if (!texto.trim()) return
        onSalvar(texto.trim(), energia)
        setTexto('')
      }}
    >
      <label className="rotulo">{pergunta}</label>
      <input
        autoFocus
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        placeholder="Comece com um verbo: abrir, escrever, enviar, ligar…"
      />
      {vago && (
        <p className="dica">
          Isso ainda soa como ideia. O que exatamente suas mãos fariam nos primeiros 2 minutos?
        </p>
      )}
      <label className="rotulo">Quanta energia isso pede?</label>
      <SeletorEnergia valor={energia} onChange={setEnergia} />
      <div className="linha">
        <button type="submit" className="primario">
          {rotuloBotao}
        </button>
        {onCancelar && (
          <button type="button" onClick={onCancelar}>
            Cancelar
          </button>
        )}
      </div>
    </form>
  )
}
