import { useState } from 'react'
import { buscar } from '../busca'
import { useJanelaModal } from '../hooks'
import { useNavegacao } from '../navegacao'
import { useStore } from '../store'
import { useAgenda } from '../stores/agenda'
import { useConfig } from '../stores/config'
import { useFinancas } from '../stores/financas'

/** Busca em tudo (Ctrl+K ou a lupa do topo): escolher um resultado leva à seção dele. */
export function Busca({ onFechar }: { onFechar: () => void }) {
  const [termo, setTermo] = useState('')
  const janela = useJanelaModal()
  const s = useStore()
  const transacoes = useFinancas((f) => f.transacoes)
  const { eventos, lembretes } = useAgenda()
  const desligados = useConfig((c) => c.modulosDesligados)
  const ir = useNavegacao((n) => n.ir)
  const resultados = buscar({ ...s, transacoes, eventos, lembretes }, termo, desligados)

  const abrir = (i: number) => {
    const r = resultados[i]
    if (!r) return
    ir(r.aba, r.projetoId)
    onFechar()
  }

  return (
    <dialog
      ref={janela}
      className="fundo"
      aria-label="Buscar"
      onCancel={(e) => {
        e.preventDefault()
        onFechar()
      }}
    >
      <div className="modal">
        <form
          className="form"
          role="search"
          onSubmit={(e) => {
            e.preventDefault()
            abrir(0)
          }}
        >
          <label className="rotulo" htmlFor="buscar-tudo">
            Buscar em tudo
          </label>
          <input id="buscar-tudo" type="search" autoFocus value={termo} onChange={(e) => setTermo(e.target.value)} placeholder="passo, projeto, gasto, compromisso…" />
        </form>
        {termo.trim() && (
          <>
            <p className="motivo" role="status">
              {resultados.length === 0 ? 'Nada encontrado.' : `${resultados.length} resultado${resultados.length === 1 ? '' : 's'}. Enter abre o primeiro.`}
            </p>
            <ul className="resultados-busca">
              {resultados.map((r, i) => (
                <li key={r.chave}>
                  <button type="button" className="discreto" onClick={() => abrir(i)}>
                    <span className="motivo">{r.tipo}</span> {r.texto}
                    {r.detalhe && <span className="motivo"> · {r.detalhe}</span>}
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
      <button type="button" className="fundo-fechar" aria-label="Fechar a busca" onClick={onFechar} />
    </dialog>
  )
}
