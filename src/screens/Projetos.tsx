import { useState } from 'react'
import { DeNovo } from '../components/DeNovo'
import { NotaDoPasso } from '../components/NotaDoPasso'
import { CamposDeData, PassoForm } from '../components/PassoForm'
import { Quebrar } from '../components/Quebrar'
import { BarraProgresso } from '../components/Progresso'
import { PontosEditaveis } from '../components/SeletorEnergia'
import { TempoGasto } from '../components/TempoGasto'
import { useNavegacao } from '../navegacao'
import { apagarComDesfazer } from '../desfazer'
import { minutosDoPasso, pendentes, useStore } from '../store'
import type { Datas, Passo, Projeto } from '../types'
import { dataCurta, duracao, hoje } from '../util'
import { Simbolo } from '../components/Icone'
import { Botao, BotaoInterruptor } from '../tema/megui-react.mjs'

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
      <input required aria-label="Nome do projeto" autoFocus value={titulo} onChange={(e) => setTitulo(e.target.value)} />
      <label className="rotulo">Linha de chegada: como você vai saber que terminou?</label>
      <input required aria-label="Linha de chegada"
        value={chegada}
        onChange={(e) => setChegada(e.target.value)}
        placeholder="Algo que dá para ver, não um sentimento"
      />
      <p className="dica neutra">
        Defina agora, enquanto há energia. No fim do caminho, isso impede a meta de ficar se afastando.
      </p>
      <Botao variante="acento" type="submit">
        Criar
      </Botao>
    </form>
  )
}

/** Prazo e início do passo, em tom neutro: data passada não ganha cor de alerta (D04). */
function DatasDoPasso({ passo }: { passo: Passo }) {
  const partes = [
    passo.repetir && `↻ ${REPETE[passo.repetir]}`,
    passo.aPartirDe && passo.aPartirDe > hoje() && `a partir de ${dataCurta(passo.aPartirDe)}`,
    passo.prazo && `até ${dataCurta(passo.prazo)}`,
  ].filter(Boolean)
  return partes.length ? <span className="motivo datas-passo">{partes.join(' · ')}</span> : null
}

const REPETE = { diario: 'todo dia', semanal: 'toda semana', mensal: 'todo mês' }

/** Passo com energia ajustável, texto editável e remoção. `destaque` é o visual do próximo passo. */
export function PassoEditavel({ passo, destaque = false }: { passo: Passo; destaque?: boolean }) {
  const s = useStore()
  const [editando, setEditando] = useState(false)
  const [quebrando, setQuebrando] = useState(false)
  const [texto, setTexto] = useState(passo.texto)
  const [datas, setDatas] = useState<Datas>({ prazo: passo.prazo, aPartirDe: passo.aPartirDe, repetir: passo.repetir })
  const [nota, setNota] = useState(passo.nota ?? '')

  if (quebrando) return <Quebrar passo={passo} onPronto={() => setQuebrando(false)} />

  if (editando)
    return (
      <form
        className="linha"
        onSubmit={(e) => {
          e.preventDefault()
          if (texto.trim())
            s.atualizarPasso(passo.id, { texto: texto.trim(), prazo: datas.prazo, aPartirDe: datas.aPartirDe, repetir: datas.repetir, nota: nota.trim() || undefined })
          setEditando(false)
        }}
      >
        <div className="linha">
          <input autoFocus className="flex" value={texto} onChange={(e) => setTexto(e.target.value)} aria-label="Texto do passo" />
          <button type="submit">Salvar</button>
          <button type="button" className="discreto" onClick={() => setEditando(false)}>
            Cancelar
          </button>
        </div>
        <CamposDeData datas={datas} onChange={setDatas} />
        <textarea className="nota-passo" rows={2} value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Nota (opcional): link, endereço, o que não esquecer" aria-label="Nota do passo" />
      </form>
    )

  const energia = <PontosEditaveis energia={passo.energia} onChange={(e) => s.atualizarPasso(passo.id, { energia: e })} />
  const acoes = (
    <span className="linha">
      <button className="discreto" onClick={() => setQuebrando(true)} aria-label={`Quebrar ${passo.texto} em pedaços menores`}>
        Quebrar
      </button>
      <button
        className="discreto"
        onClick={() => (setTexto(passo.texto), setDatas({ prazo: passo.prazo, aPartirDe: passo.aPartirDe, repetir: passo.repetir }), setNota(passo.nota ?? ''), setEditando(true))}
        aria-label={`Editar ${passo.texto}`}
      >
        Editar
      </button>
      <button
        className="discreto"
        onClick={() => apagarComDesfazer(useStore, 'passos', passo.id, passo.texto, () => s.removerPasso(passo.id))}
        aria-label={`Remover ${passo.texto}`}
      >
        Remover
      </button>
    </span>
  )

  return destaque ? (
    <>
      <p className="passo">{passo.texto}</p>
      <DatasDoPasso passo={passo} />
      <NotaDoPasso nota={passo.nota} />
      <div className="linha entre">
        <span className="motivo">{energia}</span>
        {acoes}
      </div>
    </>
  ) : (
    <div className="linha entre item passo-item">
      <span>
        {energia} {passo.texto} <DatasDoPasso passo={passo} />
        <NotaDoPasso nota={passo.nota} />
      </span>
      {acoes}
    </div>
  )
}

/** Modelos salvos: um toque cria o projeto com todos os passos. */
function Modelos({ onCriado }: { onCriado: (id: string) => void }) {
  const s = useStore()
  if (s.modelos.length === 0) return null
  return (
    <div className="cartao">
      <h2 className="rotulo">Começar de um modelo</h2>
      <div className="chips" role="group" aria-label="Começar de um modelo">
        {s.modelos.map((m) => (
          <button
            key={m.id}
            onClick={() => {
              const pid = s.usarModelo(m.id)
              if (pid) onCriado(pid)
            }}
          >
            {m.titulo} · {m.passos.length} passo{m.passos.length === 1 ? '' : 's'}
          </button>
        ))}
      </div>
      <details>
        <summary>Apagar um modelo</summary>
        {s.modelos.map((m) => (
          <div key={m.id} className="linha entre item">
            <span>{m.titulo}</span>
            <button className="discreto" onClick={() => confirm(`Apagar o modelo "${m.titulo}"? Os projetos já criados com ele continuam.`) && s.removerModelo(m.id)}>
              Apagar
            </button>
          </div>
        ))}
      </details>
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
      <input required aria-label="Nome do projeto" autoFocus value={titulo} onChange={(e) => setTitulo(e.target.value)} />
      <label className="rotulo">Linha de chegada</label>
      <input required aria-label="Linha de chegada" value={chegada} onChange={(e) => setChegada(e.target.value)} />
      <div className="linha">
        <Botao variante="acento" type="submit">
          Salvar
        </Botao>
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
  const [salvoComoModelo, setSalvoComoModelo] = useState(false)
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
        <Simbolo c="←" />
        Voltar para Projetos
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
                      <BotaoInterruptor ligado={s.focoId === id} onClick={() => s.definirFoco(s.focoId === id ? null : id)}>
                        <Simbolo c={s.focoId === id ? '★' : '☆'} />
                        {s.focoId === id ? 'Em foco' : 'Colocar em foco'}
                      </BotaoInterruptor>
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
                  <button
                    className="discreto"
                    onClick={() => {
                      s.salvarModelo(id)
                      setSalvoComoModelo(true)
                    }}
                  >
                    Salvar como modelo
                  </button>
                </div>
                {salvoComoModelo && (
                  <p className="motivo" role="status">
                    <Simbolo c="✓" />
                    Modelo salvo. Em Projetos, “{projeto.titulo}” aparece para começar de novo com um toque.
                  </p>
                )}
              </>
            )}
          </div>

          {proximo ? (
            <div className="cartao foco">
              <h2 className="rotulo">Próximo passo</h2>
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
              <PassoForm projetoId={id} onSalvar={(t, e, d) => s.criarPasso(id, t, e, undefined, d)} />
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
                    <span className="flex feito">
                      <Simbolo c="✓" />
                      {p.texto}
                    </span>
                    <TempoGasto passo={p} />
                    {!projeto.concluidoEm && <DeNovo passo={p} />}
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
                  <button
                    className="discreto"
                    onClick={() => apagarComDesfazer(useStore, 'ideias', i.id, i.texto, () => s.removerIdeia(i.id))}
                    aria-label={`Apagar ${i.texto}`}
                  >
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
        <Botao variante="acento" onClick={() => setCriando(true)}>
          Novo projeto
        </Botao>
      )}
      {!criando && <Modelos onCriado={setAberto} />}

      <div className="grade-cartoes">
        {ativos.map((p) => {
          const feitos = s.passos.filter((x) => x.projetoId === p.id && x.feitoEm).length
          // O próximo de verdade: um passo com "só a partir de" no futuro dá a vez ao seguinte, como no Agora.
          const fila = pendentes(s.passos, p.id)
          const proximo = fila.find((x) => !x.aPartirDe || x.aPartirDe <= hoje()) ?? fila[0]
          return (
            <button key={p.id} className="cartao clicavel" onClick={() => setAberto(p.id)}>
              <span className="projeto">
                {p.id === s.focoId && <Simbolo c="★" diz="Em foco" />}
                {p.titulo}
              </span>
              <span className="passo pequeno">{proximo ? (
                  <>
                    <Simbolo c="→" diz="Próximo passo" />
                    {proximo.texto}
                  </>
                ) : (
                  'Sem próximo passo definido'
                )}</span>
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
                <Simbolo c="✓" diz="Concluído" />
                {p.titulo}
              </button>
            ))}
          </div>
        </>
      )}
    </section>
  )
}
