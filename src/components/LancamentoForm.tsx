import { useState } from 'react'
import { sugerirCategoria, useFinancas } from '../stores/financas'
import { hoje, lerValor, reais } from '../util'

interface Props {
  inicial?: { valor?: number; descricao?: string; tipo?: 'gasto' | 'receita' }
  onPronto?: () => void
  onCancelar?: () => void
}

export function LancamentoForm({ inicial, onPronto, onCancelar }: Props) {
  const f = useFinancas()
  const [tipo, setTipo] = useState<'gasto' | 'receita'>(inicial?.tipo ?? 'gasto')
  const [valorTexto, setValorTexto] = useState(inicial?.valor ? (inicial.valor / 100).toFixed(2).replace('.', ',') : '')
  const [descricao, setDescricao] = useState(inicial?.descricao ?? '')
  const [categoriaEscolhida, setCategoriaEscolhida] = useState<string | null>(null)
  const [contaId, setContaId] = useState(f.contas[0]?.id ?? '')
  const [data, setData] = useState(hoje())

  const valor = lerValor(valorTexto)
  const categorias = f.categorias.filter((c) => c.tipo === tipo)
  const sugerida = descricao ? sugerirCategoria(descricao, f.transacoes, f.categorias) : null
  const categoriaId = categoriaEscolhida ?? (categorias.some((c) => c.id === sugerida) ? sugerida : null)

  if (f.contas.length === 0) return <p className="dica">Crie uma conta em Finanças → Ajustes antes de lançar.</p>

  return (
    <form
      className="form"
      onSubmit={(e) => {
        e.preventDefault()
        if (!valor || !contaId) return
        f.lancar({
          contaId,
          categoriaId,
          valor: tipo === 'gasto' ? -Math.abs(valor) : Math.abs(valor),
          descricao: descricao.trim() || (categorias.find((c) => c.id === categoriaId)?.nome ?? 'Sem descrição'),
          data,
        })
        setValorTexto('')
        setDescricao('')
        setCategoriaEscolhida(null)
        onPronto?.()
      }}
    >
      <div className="segmentado">
        <button type="button" className={tipo === 'gasto' ? 'ativo' : ''} onClick={() => setTipo('gasto')}>
          Gastei
        </button>
        <button type="button" className={tipo === 'receita' ? 'ativo' : ''} onClick={() => setTipo('receita')}>
          Recebi
        </button>
      </div>
      <input
        className="valor-grande"
        inputMode="decimal"
        autoFocus={!inicial?.valor}
        value={valorTexto}
        onChange={(e) => setValorTexto(e.target.value)}
        placeholder="R$ 0,00"
        aria-label="Valor"
      />
      <input value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Com o quê? (opcional)" aria-label="Descrição" />
      <div className="chips">
        {categorias.map((c) => (
          <button
            key={c.id}
            type="button"
            className={categoriaId === c.id ? 'ativo' : ''}
            onClick={() => setCategoriaEscolhida(categoriaId === c.id ? null : c.id)}
          >
            {c.nome}
          </button>
        ))}
      </div>
      <div className="linha">
        {f.contas.length > 1 && (
          <select value={contaId} onChange={(e) => setContaId(e.target.value)} aria-label="Conta" className="flex">
            {f.contas.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
        )}
        <input type="date" value={data} onChange={(e) => setData(e.target.value)} aria-label="Data" className="flex" />
      </div>
      <div className="linha">
        <button type="submit" className="primario" disabled={!valor}>
          {valor ? `Registrar ${reais(Math.abs(valor))}` : 'Registrar'}
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
