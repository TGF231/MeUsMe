import { useEffect, useMemo, useState } from 'react'
import { PassoForm } from '../components/PassoForm'
import { Pontos, SeletorEnergia } from '../components/SeletorEnergia'
import { escolherPasso } from '../escolher'
import { hoje, pendentes, useStore } from '../store'
import type { Energia, Projeto } from '../types'

const relogio = (ms: number) => {
  const s = Math.floor(ms / 1000)
  const h = Math.floor(s / 3600)
  const mm = String(Math.floor((s % 3600) / 60)).padStart(2, '0')
  const ss = String(s % 60).padStart(2, '0')
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`
}

const inicioDoDia = () => new Date(new Date().setHours(0, 0, 0, 0)).getTime()

export function Agora() {
  const s = useStore()
  const checkIn = s.checkins.find((c) => c.dia === hoje())
  const [energia, setEnergia] = useState<Energia>(checkIn?.energia ?? 2)
  const [pulados, setPulados] = useState<Set<string>>(new Set())
  const [quebrando, setQuebrando] = useState(false)
  const [celebrar, setCelebrar] = useState<{ projeto: Projeto | null; restantes: number } | null>(null)
  const [ideia, setIdeia] = useState('')
  const [agora, setAgora] = useState(() => Date.now())

  // Uma sessão sem fim é a que está rodando, mesmo depois de fechar e reabrir o app.
  const sessao = s.sessoes.find((x) => !x.fim)
  const passoAtivo = sessao && s.passos.find((p) => p.id === sessao.passoId)

  useEffect(() => {
    if (!sessao) return
    const t = setInterval(() => setAgora(Date.now()), 1000)
    return () => clearInterval(t)
  }, [sessao])

  const escolha = useMemo(
    () => escolherPasso(s.projetos, s.passos, s.focoId, energia, pulados),
    [s.projetos, s.passos, s.focoId, energia, pulados],
  )

  const desde = inicioDoDia()
  const feitosHoje = s.passos.filter((p) => p.feitoEm && p.feitoEm >= desde).length
  const minutosHoje = Math.round(
    s.sessoes
      .filter((x) => x.inicio >= desde)
      .reduce((t, x) => t + ((x.fim ?? agora) - x.inicio), 0) / 60_000,
  )

  const concluir = (passoId: string) => {
    if (sessao) s.encerrarSessao(sessao.id)
    s.concluirPasso(passoId)
    const passo = s.passos.find((p) => p.id === passoId)
    const projeto = s.projetos.find((p) => p.id === passo?.projetoId) ?? null
    const restantes = projeto ? pendentes(useStore.getState().passos, projeto.id).length : 0
    setCelebrar({ projeto, restantes })
    setQuebrando(false)
  }

  const estacionar = (projetoId: string | null) => {
    if (!ideia.trim()) return
    s.estacionarIdeia(ideia.trim(), projetoId)
    setIdeia('')
  }

  const rodape = (
    <p className="rodape">
      Hoje: {feitosHoje} passo{feitosHoje === 1 ? '' : 's'} feito{feitosHoje === 1 ? '' : 's'} · {minutosHoje} min de foco
    </p>
  )

  if (celebrar) {
    const { projeto, restantes } = celebrar
    const feitosNoProjeto = projeto ? s.passos.filter((p) => p.projetoId === projeto.id && p.feitoEm).length : 0
    return (
      <section className="tela">
        <div className="cartao celebra">
          <p className="grande">Feito.</p>
          {projeto && (
            <p>
              {feitosNoProjeto} passo{feitosNoProjeto === 1 ? '' : 's'} já {feitosNoProjeto === 1 ? 'feito' : 'feitos'} em{' '}
              <b>{projeto.titulo}</b>.
            </p>
          )}
          {projeto && restantes === 0 ? (
            <>
              <p>
                Linha de chegada: <i>{projeto.chegada}</i>
              </p>
              <p>Você chegou lá?</p>
              <div className="linha">
                <button
                  className="primario"
                  onClick={() => {
                    s.concluirProjeto(projeto.id)
                    setCelebrar(null)
                  }}
                >
                  Sim, concluir projeto
                </button>
              </div>
              <PassoForm
                pergunta="Ainda não? Qual é o próximo movimento concreto?"
                onSalvar={(t, e) => {
                  s.criarPasso(projeto.id, t, e)
                  setCelebrar(null)
                }}
              />
            </>
          ) : (
            <button className="primario" onClick={() => setCelebrar(null)}>
              Próximo
            </button>
          )}
        </div>
        {rodape}
      </section>
    )
  }

  if (sessao && passoAtivo) {
    const projeto = s.projetos.find((p) => p.id === passoAtivo.projetoId) ?? null
    return (
      <section className="tela">
        <div className="cartao foco">
          {projeto && <p className="projeto">{projeto.titulo}</p>}
          <p className="passo">{passoAtivo.texto}</p>
          <p className="relogio">{relogio(agora - sessao.inicio)}</p>
          <div className="linha">
            <button className="primario" onClick={() => concluir(passoAtivo.id)}>
              Feito
            </button>
            <button onClick={() => s.encerrarSessao(sessao.id)}>Pausar</button>
          </div>
        </div>
        <form
          className="cartao estacionar"
          onSubmit={(e) => {
            e.preventDefault()
            estacionar(projeto?.id ?? null)
          }}
        >
          <label className="rotulo">Surgiu uma ideia? Estacione aqui e continue.</label>
          <div className="linha">
            <input value={ideia} onChange={(e) => setIdeia(e.target.value)} placeholder="A ideia fica guardada, sem desviar você" />
            <button type="submit">Estacionar</button>
          </div>
        </form>
        {rodape}
      </section>
    )
  }

  return (
    <section className="tela">
      <div className="cartao compacto">
        <label className="rotulo">Sua energia agora</label>
        <SeletorEnergia valor={energia} onChange={setEnergia} />
      </div>

      {!escolha ? (
        <div className="cartao vazio">
          {pulados.size > 0 ? (
            <>
              <p>Você pulou tudo por agora. Tudo bem.</p>
              <button onClick={() => setPulados(new Set())}>Ver de novo desde o início</button>
            </>
          ) : (
            <p>
              Nada na fila. Jogue o que estiver na cabeça no botão <b>+</b> e transforme em passos na <b>Caixa</b>.
            </p>
          )}
        </div>
      ) : (
        <div className="cartao foco">
          {escolha.projeto ? <p className="projeto">{escolha.projeto.titulo}</p> : <p className="projeto">Tarefa solta</p>}
          <p className="passo">{escolha.passo.texto}</p>
          <p className="motivo">
            <Pontos energia={escolha.passo.energia} /> {escolha.motivo}
          </p>
          {escolha.projeto && (
            <p className="chegada">
              Linha de chegada: <i>{escolha.projeto.chegada}</i>
            </p>
          )}
          {escolha.acimaDaEnergia && (
            <p className="dica">Tudo na fila pede mais energia do que você tem agora. Que tal quebrar este em algo menor?</p>
          )}

          {quebrando ? (
            <PassoForm
              pergunta="Qual é o menor pedaço disso que dá para fazer em 2 minutos?"
              rotuloBotao="Fazer este primeiro"
              onSalvar={(t, e) => {
                s.criarPasso(escolha.passo.projetoId, t, e, escolha.passo.id)
                setQuebrando(false)
              }}
              onCancelar={() => setQuebrando(false)}
            />
          ) : (
            <>
              <button className="primario grande-botao" onClick={() => s.iniciarSessao(escolha.passo.id)}>
                Começar
              </button>
              <div className="linha">
                <button onClick={() => concluir(escolha.passo.id)}>Já fiz</button>
                <button onClick={() => setQuebrando(true)}>Grande demais</button>
                <button onClick={() => setPulados(new Set(pulados).add(escolha.passo.id))}>Agora não</button>
              </div>
            </>
          )}
        </div>
      )}
      {rodape}
    </section>
  )
}
