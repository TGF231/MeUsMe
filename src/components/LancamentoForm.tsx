import { useState } from 'react'
import { dividirEmParcelas } from '../compra'
import { sugerirCategoria, useFinancas } from '../stores/financas'
import { hoje, lerValor, reais } from '../util'

interface Props {
  inicial?: { valor?: number; descricao?: string; tipo?: 'gasto' | 'receita' }
  /** Recebe o tipo escolhido, para o motor aprender gasto × entrada. */
  onPronto?: (tipo: 'gasto' | 'receita') => void
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
  const [parcelas, setParcelas] = useState(1)

  const valor = lerValor(valorTexto)
  const categorias = f.categorias.filter((c) => c.tipo === tipo)
  const sugerida = descricao ? sugerirCategoria(descricao, f.transacoes, f.categorias) : null
  const categoriaId = categoriaEscolhida ?? (categorias.some((c) => c.id === sugerida) ? sugerida : null)

  if (f.contas.length === 0) return <p className="dica">Crie uma conta em Finanças → Contas e categorias antes de lançar.</p>

  return (
    <form
      className="form"
      onSubmit={(e) => {
        e.preventDefault()
        if (!valor || !contaId) return
        const texto = descricao.trim() || (categorias.find((c) => c.id === categoriaId)?.nome ?? 'Sem descrição')
        const total = tipo === 'gasto' ? -Math.abs(valor) : Math.abs(valor)
        // Parcelado (V24): uma parcela por mês, cada uma no mês dela, para o livre por dia de cada mês ficar certo.
        const n = tipo === 'gasto' ? parcelas : 1
        for (const p of n > 1 ? dividirEmParcelas(total, n, data) : [{ valor: total, data, sufixo: '' }])
          f.lancar({ contaId, categoriaId, valor: p.valor, descricao: texto + p.sufixo, data: p.data })
        setParcelas(1)
        setValorTexto('')
        setDescricao('')
        setCategoriaEscolhida(null)
        onPronto?.(tipo)
      }}
    >
      <div className="segmentado" role="group" aria-label="Tipo">
        <button type="button" className={tipo === 'gasto' ? 'ativo' : ''} aria-pressed={tipo === 'gasto'} onClick={() => setTipo('gasto')}>
          Gastei
        </button>
        <button type="button" className={tipo === 'receita' ? 'ativo' : ''} aria-pressed={tipo === 'receita'} onClick={() => setTipo('receita')}>
          Recebi
        </button>
      </div>
      <input
        required
        className="valor-grande"
        inputMode="decimal"
        autoFocus={!inicial?.valor}
        value={valorTexto}
        onChange={(e) => setValorTexto(e.target.value)}
        placeholder="R$ 0,00"
        aria-label="Valor"
      />
      <input value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Com o quê? (opcional)" aria-label="Descrição" />
      <div className="chips" role="group" aria-label="Categoria">
        {categorias.map((c) => (
          <button
            key={c.id}
            type="button"
            className={categoriaId === c.id ? 'ativo' : ''} aria-pressed={categoriaId === c.id}
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
        {tipo === 'gasto' && (
          <select value={parcelas} onChange={(e) => setParcelas(Number(e.target.value))} aria-label="Parcelas" className="flex">
            {Array.from({ length: 24 }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                {n === 1 ? 'À vista' : `${n}x de ${reais(Math.trunc((valor || 0) / n))}`}
              </option>
            ))}
          </select>
        )}
      </div>
      <div className="linha">
        <button type="submit" className="primario" disabled={!valor}>
          {valor ? `Registrar ${reais(Math.abs(valor))}${tipo === 'gasto' && parcelas > 1 ? ` em ${parcelas}x` : ''}` : 'Registrar'}
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
