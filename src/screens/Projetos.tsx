import { useState } from 'react'
import { PassoForm } from '../components/PassoForm'
import { BarraProgresso } from '../components/Progresso'
import { PontosEditaveis } from '../components/SeletorEnergia'
import { TempoGasto } from '../components/TempoGasto'
import { useNavegacao } from '../navegacao'
import { minutosDoPasso, pendentes, useStore } from '../store'
import type { Passo, Projeto } from '../types'
import { duracao } from '../util'

function NovoProjeto({ onCriado }: { onCriado: (id: string) => void }) {
  const criar = useStore((s) => s.criarProjeto)
  const [titulo, setTitulo] = useState('')
  const [chegada, setChegada] = useState('')
  return (
    <form
      className="cartao form"
      onSubmit={(e) => {
        e.preventDefault()
        if (!titulo.trim() || !chegada.trim()) return
        onCriado(criar(titulo.trim(), chegada.trim()))
      }}
    >
      <label className="rotulo">Nome do projeto</label>
      <input autoFocus value={titulo} onChange={(e) => setTitulo(e.target.value)} />
      <label className="rotulo">Linha de chegada: como você vai saber que terminou?</label>
      <input
        value={chegada}
        onChange={(e) => setChegada(e.target.value)}
        placeholder="Algo que dá para ver, não um sentimento"
      />
      <p className="dica neutra">
        Defina agora, enquanto há energia. No fim do caminho, isso impede a meta de ficar se afastando.
      </p>
      <button type="submit" className="primario">
        Criar
      </button>
    </form>
  )
}

/** Passo com energia ajustável, texto editável e remoção. `destaque` é o visual do próximo passo. */
function PassoEditavel({ passo, destaque = false }: { passo: Passo; destaque?: boolean }) {
  const s = useStore()
  const [editando, setEditando] = useState(false)
  const [texto, setTexto] = useState(passo.texto)

  if (editando)
    return (
      <form
        className="linha"
        onSubmit={(e) => {
          e.preventDefault()
          if (texto.trim()) s.atualizarPasso(passo.id, { texto: texto.trim() })
          setEditando(false)
        }}
      >
        <input autoFocus className="flex" value={texto} onChange={(e) => setTexto(e.target.value)} aria-label="Texto do passo" />
        <button type="submit">Salvar</button>
        <button type="button" className="discreto" onClick={() => setEditando(false)}>
          Cancelar
        </button>
      </form>
    )

  const energia = <PontosEditaveis energia={passo.energia} onChange={(e) => s.atualizarPasso(passo.id, { energia: e })} />
  const acoes = (
    <span className="linha">
      <button className="discreto" onClick={() => (setTexto(passo.texto), setEditando(true))}>
        Editar
      </button>
      <button className="discreto" onClick={() => s.removerPasso(passo.id)}>
        Remover
      </button>
    </span>
  )

  return destaque ? (
    <>
      <p className="passo">{passo.texto}</p>
      <div className="linha entre">
        <span className="motivo">{energia}</span>
        {acoes}
      </div>
    </>
  ) : (
    <div className="linha entre item">
      <span>
        {energia} {passo.texto}
      </span>
      {acoes}
    </div>
  )
}

function EditarProjeto({ projeto, onPronto, onApagado }: { projeto: Projeto; onPronto: () => void; onApagado: () => void }) {
  const s = useStore()
  const [titulo, setTitulo] = useState(projeto.titulo)
  const [chegada, setChegada] = useState(projeto.chegada)
  return (
    <form
      className="form"
      onSubmit={(e) => {
        e.preventDefault()
        if (!titulo.trim() || !chegada.trim()) return
        s.atualizarProjeto(projeto.id, { titulo: titulo.trim(), chegada: chegada.trim() })
        onPronto()
      }}
    >
      <label className="rotulo">Nome do projeto</label>
      <input autoFocus value={titulo} onChange={(e) => setTitulo(e.target.value)} />
      <label className="rotulo">Linha de chegada</label>
      <input value={chegada} onChange={(e) => setChegada(e.target.value)} />
      <div className="linha">
        <button type="submit" className="primario">
          Salvar
        </button>
        <button type="button" onClick={onPronto}>
          Cancelar
        </button>
        <button
          type="button"
          className="discreto"
          onClick={() => {
            if (!confirm(`Apagar "${projeto.titulo}"? Os passos pendentes somem; o que já foi feito continua no Histórico.`)) return
            s.removerProjeto(projeto.id)
            onApagado()
          }}
        >
          Apagar projeto
        </button>
      </div>
    </form>
  )
}

function Detalhe({ id, onVoltar }: { id: string; onVoltar: () => void }) {
  const s = useStore()
  const [verTodos, setVerTodos] = useState(false)
  const [editando, setEditando] = useState(false)
  const projeto = s.projetos.find((p) => p.id === id)
  if (!projeto) return null

  const fila = pendentes(s.passos, id)
  const feitos = s.passos.filter((p) => p.projetoId === id && p.feitoEm).sort((a, b) => b.feitoEm! - a.feitoEm!)
  const ideias = s.ideias.filter((i) => i.projetoId === id)
  const [proximo, ...depois] = fila
  const tempoTotal = s.passos.filter((p) => p.projetoId === id).reduce((t, p) => t + minutosDoPasso(p, s.sessoes), 0)

  return (
    <section className="tela">
      <button className="discreto" onClick={onVoltar}>
        ← Projetos
      </button>
      <div className="colunas">
        <div className="col">
          <div className="cartao">
            {editando ? (
              <EditarProjeto projeto={projeto} onPronto={() => setEditando(false)} onApagado={onVoltar} />
            ) : (
              <>
                <h2 className="titulo">{projeto.titulo}</h2>
                <p className="chegada">
                  Linha de chegada: <i>{projeto.chegada}</i>
                </p>
                <BarraProgresso passos={s.passos} projetoId={id} />
                {tempoTotal >= 1 && <p className="motivo">Tempo investido até agora: {duracao(tempoTotal)}</p>}
                <div className="linha">
                  {projeto.concluidoEm ? (
                    <button onClick={() => s.reabrirProjeto(id)}>Reabrir projeto</button>
                  ) : (
                    <>
                      <button className={s.focoId === id ? 'ativo' : ''} onClick={() => s.definirFoco(s.focoId === id ? null : id)}>
                        {s.focoId === id ? '★ Em foco' : '☆ Colocar em foco'}
                      </button>
                      <button
                        onClick={() => {
                          const resto = fila.length ? ` Ainda há ${fila.length} passo${fila.length > 1 ? 's' : ''} na fila.` : ''
                          if (confirm(`Concluir "${projeto.titulo}"?${resto}`)) s.concluirProjeto(id)
                        }}
                      >
                        Concluir projeto
                      </button>
                    </>
                  )}
                  <button className="discreto" onClick={() => setEditando(true)}>
                    Editar
                  </button>
                </div>
              </>
            )}
          </div>

          {proximo ? (
            <div className="cartao foco">
              <p className="rotulo">Próximo passo</p>
              <PassoEditavel key={proximo.id} passo={proximo} destaque />
            </div>
          ) : (
            !projeto.concluidoEm && <p className="vazio-texto">Nenhum passo na fila. Qual é o próximo movimento?</p>
          )}

          {depois.length > 0 && (
            <div className="cartao">
              {verTodos ? (
                <>
                  {depois.map((p) => (
                    <PassoEditavel key={p.id} passo={p} />
                  ))}
                  <button className="discreto" onClick={() => setVerTodos(false)}>
                    Esconder
                  </button>
                </>
              ) : (
                <button className="discreto" onClick={() => setVerTodos(true)}>
                  + {depois.length} passo{depois.length > 1 ? 's' : ''} depois deste (escondidos para você focar só no próximo)
                </button>
              )}
            </div>
          )}

          {!projeto.concluidoEm && (
            <div className="cartao">
              <PassoForm onSalvar={(t, e) => s.criarPasso(id, t, e)} />
            </div>
          )}
        </div>
        <div className="col">
          {feitos.length > 0 && (
            <>
              <h2>Já feito ({feitos.length})</h2>
              <div className="cartao">
                {feitos.map((p) => (
                  <div key={p.id} className="registro">
                    <span className="flex feito">✓ {p.texto}</span>
                    <TempoGasto passo={p} />
                  </div>
                ))}
              </div>
            </>
          )}

          {ideias.length > 0 && (
            <>
              <h2>Ideias estacionadas aqui</h2>
              {ideias.map((i) => (
                <div key={i.id} className="cartao linha entre">
                  <span>{i.texto}</span>
                  <button className="discreto" onClick={() => s.removerIdeia(i.id)}>
                    Apagar
                  </button>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </section>
  )
}

export function Projetos() {
  const s = useStore()
  // Outra tela pode pedir um projeto aberto (ex.: revisão semanal).
  const [aberto, setAberto] = useState<string | null>(() => useNavegacao.getState().projetoAberto)
  const [criando, setCriando] = useState(false)

  if (aberto) return <Detalhe id={aberto} onVoltar={() => setAberto(null)} />

  const ativos = s.projetos
    .filter((p) => !p.concluidoEm)
    .sort((a, b) => (a.id === s.focoId ? -1 : b.id === s.focoId ? 1 : 0))
  const concluidos = s.projetos.filter((p) => p.concluidoEm)
  const soltas = pendentes(s.passos, null)

  return (
    <section className="tela">
      {criando ? (
        <NovoProjeto
          onCriado={(pid) => {
            setCriando(false)
            setAberto(pid)
          }}
        />
      ) : (
        <button className="primario" onClick={() => setCriando(true)}>
          Novo projeto
        </button>
      )}

      <div className="grade-cartoes">
        {ativos.map((p) => {
          const feitos = s.passos.filter((x) => x.projetoId === p.id && x.feitoEm).length
          const proximo = pendentes(s.passos, p.id)[0]
          return (
            <button key={p.id} className="cartao clicavel" onClick={() => setAberto(p.id)}>
              <span className="projeto">
                {p.id === s.focoId && '★ '}
                {p.titulo}
              </span>
              <span className="passo pequeno">{proximo ? `→ ${proximo.texto}` : 'Sem próximo passo definido'}</span>
              {feitos + pendentes(s.passos, p.id).length > 0 ? (
                <BarraProgresso passos={s.passos} projetoId={p.id} />
              ) : (
                <span className="motivo">Nenhum passo ainda</span>
              )}
            </button>
          )
        })}
      </div>

      {soltas.length > 0 && (
        <>
          <h2>Tarefas soltas ({soltas.length})</h2>
          <p className="motivo">A tela Agora mostra uma de cada vez. Aqui dá para ver todas, corrigir ou tirar da lista.</p>
          <div className="cartao">
            {soltas.map((p) => (
              <PassoEditavel key={p.id} passo={p} />
            ))}
          </div>
        </>
      )}

      {concluidos.length > 0 && (
        <>
          <h2>Concluídos ({concluidos.length})</h2>
          <div className="grade-cartoes">
            {concluidos.map((p) => (
              <button key={p.id} className="cartao clicavel feito" onClick={() => setAberto(p.id)}>
                ✓ {p.titulo}
              </button>
            ))}
          </div>
        </>
      )}
    </section>
  )
}
