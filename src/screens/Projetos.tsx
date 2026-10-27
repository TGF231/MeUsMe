import { useState } from 'react'
import { PassoForm } from '../components/PassoForm'
import { BarraProgresso } from '../components/Progresso'
import { PontosEditaveis } from '../components/SeletorEnergia'
import { TempoGasto } from '../components/TempoGasto'
import { useNavegacao } from '../navegacao'
import { minutosDoPasso, pendentes, useStore } from '../store'
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

function Detalhe({ id, onVoltar }: { id: string; onVoltar: () => void }) {
  const s = useStore()
  const [verTodos, setVerTodos] = useState(false)
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
            <h2 className="titulo">{projeto.titulo}</h2>
            <p className="chegada">
              Linha de chegada: <i>{projeto.chegada}</i>
            </p>
            <BarraProgresso passos={s.passos} projetoId={id} />
            {tempoTotal >= 1 && <p className="motivo">Tempo investido até agora: {duracao(tempoTotal)}</p>}
            {!projeto.concluidoEm && (
              <div className="linha">
                <button
                  className={s.focoId === id ? 'ativo' : ''}
                  onClick={() => s.definirFoco(s.focoId === id ? null : id)}
                >
                  {s.focoId === id ? '★ Em foco' : '☆ Colocar em foco'}
                </button>
                <button onClick={() => s.concluirProjeto(id)}>Concluir projeto</button>
              </div>
            )}
          </div>

          {proximo ? (
            <div className="cartao foco">
              <p className="rotulo">Próximo passo</p>
              <p className="passo">{proximo.texto}</p>
              <p className="motivo">
                <PontosEditaveis energia={proximo.energia} onChange={(e) => s.atualizarPasso(proximo.id, { energia: e })} />
              </p>
            </div>
          ) : (
            !projeto.concluidoEm && <p className="vazio-texto">Nenhum passo na fila. Qual é o próximo movimento?</p>
          )}

          {depois.length > 0 && (
            <div className="cartao">
              {verTodos ? (
                <>
                  {depois.map((p) => (
                    <div key={p.id} className="linha entre item">
                      <span>
                        <PontosEditaveis energia={p.energia} onChange={(e) => s.atualizarPasso(p.id, { energia: e })} /> {p.texto}
                      </span>
                      <button className="discreto" onClick={() => s.removerPasso(p.id)}>
                        Remover
                      </button>
                    </div>
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
