import { useState } from 'react'
import { apagarComDesfazer } from '../desfazer'
import { useFinancas } from '../stores/financas'
import { lerValor, reais } from '../util'
import { Campo } from '../tema/megui-react.mjs'

/**
 * Metas de economia (V25 em docs/CONCORRENTES.md): a linha de chegada dos projetos, em dinheiro. O guardado é
 * anotado à mão (não mexe no saldo nem no "livre por dia"); chegar ao alvo é comemorado, sem cobrança no caminho.
 */
export function Metas() {
  const f = useFinancas()
  const [titulo, setTitulo] = useState('')
  const [alvo, setAlvo] = useState('')
  const [valores, setValores] = useState<Record<string, string>>({})

  return (
    <div className="cartao">
      <h2 className="titulo">Metas</h2>
      <p className="motivo">Para juntar dinheiro para algo. Anote quanto guardou; o saldo das contas não muda.</p>
      {f.metas.map((m) => {
        const fracao = Math.min(1, m.guardado / m.alvo)
        return (
          <div key={m.id} className="item">
            <div className="linha entre">
              <b>{m.titulo}</b>
              <button className="discreto" onClick={() => apagarComDesfazer(useFinancas, 'metas', m.id, m.titulo, () => f.removerMeta(m.id))} aria-label={`Apagar a meta ${m.titulo}`}>
                ×
              </button>
            </div>
            <div className="progresso" role="img" aria-label={`${reais(m.guardado)} de ${reais(m.alvo)}`}>
              <div className="barra">
                <div className="cheia" style={{ width: `${Math.round(fracao * 100)}%` }} />
              </div>
              <span className="motivo">
                {reais(m.guardado)} de {reais(m.alvo)} · {m.concluidaEm ? 'chegou lá!' : `faltam ${reais(m.alvo - m.guardado)}`}
              </span>
            </div>
            {!m.concluidaEm && (
              <form
                className="linha"
                onSubmit={(e) => {
                  e.preventDefault()
                  const v = lerValor(valores[m.id] ?? '')
                  if (!v) return
                  f.guardarNaMeta(m.id, v)
                  setValores({ ...valores, [m.id]: '' })
                }}
              >
                <Campo mono
                  className="mini"
                  inputMode="decimal"
                  placeholder="R$ guardado"
                  aria-label={`Quanto guardou para ${m.titulo} (negativo para tirar)`}
                  value={valores[m.id] ?? ''}
                  onChange={(e) => setValores({ ...valores, [m.id]: e.target.value })}
                />
                <button type="submit">Guardar</button>
              </form>
            )}
          </div>
        )
      })}
      <form
        className="linha"
        onSubmit={(e) => {
          e.preventDefault()
          const v = lerValor(alvo)
          if (!titulo.trim() || !v || v <= 0) return
          f.criarMeta(titulo.trim(), v)
          setTitulo('')
          setAlvo('')
        }}
      >
        <input aria-label="Nova meta" value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Nova meta (ex.: viagem)" />
        <Campo mono className="mini" inputMode="decimal" aria-label="Valor da meta" value={alvo} onChange={(e) => setAlvo(e.target.value)} placeholder="R$ alvo" />
        <button type="submit">Criar</button>
      </form>
    </div>
  )
}
