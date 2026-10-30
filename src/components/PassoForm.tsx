import { useId, useRef, useState } from 'react'
import { sugestoesDePasso } from '../calculos'
import { useStore } from '../store'
import type { Energia } from '../types'
import { SeletorEnergia } from './SeletorEnergia'
import { BotaoVoz } from './BotaoVoz'
import { Simbolo } from './Icone'

// Verbos que indicam intenção vaga em vez de ação concreta.
const VAGOS = /\b(pensar|ver|resolver|organizar|decidir|melhorar|estudar|planejar|cuidar|arrumar|tentar|trabalhar|focar|entender)\b/i

// Começos concretos para não precisar escrever o verbo (e para não cair num vago).
const VERBOS = ['Abrir', 'Ligar para', 'Mandar mensagem para', 'Separar', 'Escrever', 'Pagar', 'Comprar']

interface Props {
  inicial?: string
  pergunta?: string
  rotuloBotao?: string
  energiaInicial?: Energia
  /** Projeto do passo, para sugerir primeiro o que já foi feito nele. */
  projetoId?: string | null
  /** Mostrar verbos e passos anteriores para tocar em vez de digitar. */
  sugerir?: boolean
  onSalvar: (texto: string, energia: Energia) => void
  onCancelar?: () => void
}

export function PassoForm({
  inicial = '',
  pergunta = 'Qual é a próxima ação física e concreta?',
  rotuloBotao = 'Adicionar passo',
  energiaInicial = 2,
  projetoId = null,
  sugerir = true,
  onSalvar,
  onCancelar,
}: Props) {
  const [texto, setTexto] = useState(inicial)
  const [energia, setEnergia] = useState<Energia>(energiaInicial)
  const passos = useStore((s) => s.passos)
  const campo = useRef<HTMLInputElement>(null)
  const idCampo = useId()
  const vago = VAGOS.test(texto)
  const sugestoes = sugerir ? sugestoesDePasso(passos, texto, projetoId) : []

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
      <label className="rotulo" htmlFor={idCampo}>
        {pergunta}
      </label>
      <div className="linha">
        <input
          id={idCampo}
          ref={campo}
          autoFocus
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Comece com um verbo: abrir, escrever, enviar, ligar…"
        />
        <BotaoVoz onTexto={setTexto} />
      </div>
      {sugerir && !texto.trim() && (
        <div className="chips" aria-label="Começar com um verbo">
          {VERBOS.map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => {
                setTexto(`${v} `)
                campo.current?.focus()
              }}
            >
              {v}…
            </button>
          ))}
        </div>
      )}
      {sugestoes.length > 0 && (
        <div className="chips" aria-label={texto.trim() ? 'Passos parecidos que você já escreveu' : 'Passos que você já fez'}>
          {sugestoes.map((s) => (
            <button
              key={s.texto}
              type="button"
              className="sugestao"
              onClick={() => {
                setTexto(s.texto)
                setEnergia(s.energia)
              }}
            >
              <Simbolo c="↺" diz="Repetir" />
              {s.texto}
            </button>
          ))}
        </div>
      )}
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
