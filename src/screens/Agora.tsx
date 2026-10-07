import { useEffect, useMemo, useState } from 'react'
import { EventoForm } from '../components/EventoForm'
import { PassoForm } from '../components/PassoForm'
import { PontosEditaveis, SeletorEnergia } from '../components/SeletorEnergia'
import { TempoGasto } from '../components/TempoGasto'
import { escolherPasso, type Escolha } from '../escolher'
import { hoje, minutosDoPasso, pendentes, useStore } from '../store'
import { chaveEvento, useAgenda } from '../stores/agenda'
import { diaDeVencimento, fixaPagaNoMes, useFinancas } from '../stores/financas'
import type { Energia, Evento, Projeto } from '../types'
import { duracao, hora, inicioDoDia, reais } from '../util'
import { RestoDoDia, SituacaoAgora } from './Agenda'

const relogio = (ms: number) => {
  const s = Math.floor(ms / 1000)
  const h = Math.floor(s / 3600)
  const mm = String(Math.floor((s % 3600) / 60)).padStart(2, '0')
  const ss = String(s % 60).padStart(2, '0')
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`
}

/** Lembretes vencidos e contas fixas vencidas ou do dia. */
function PendenciasDeHoje({ agora }: { agora: number }) {
  const agenda = useAgenda()
  const fin = useFinancas()
  const lembretes = agenda.lembretes.filter((l) => !l.concluido && l.quando <= agora)
  const diaHoje = new Date(agora).getDate()
  const contas = fin.fixas.filter((f) => f.tipo === 'gasto' && !fixaPagaNoMes(f, fin.transacoes) && diaDeVencimento(f) <= diaHoje)
  if (lembretes.length === 0 && contas.length === 0) return null

  return (
    <div className="cartao compacto pendencias">
      {lembretes.map((l) => (
        <div key={l.id} className="linha entre">
          <span>⏰ {l.texto}</span>
          <button onClick={() => agenda.concluirLembrete(l.id)}>Feito</button>
        </div>
      ))}
      {contas.map((f) => (
        <div key={f.id} className="linha entre">
          <span>
            💸 {f.nome} · {reais(f.valor)}{' '}
            <span className="motivo">{diaDeVencimento(f) === diaHoje ? 'vence hoje' : `venceu dia ${diaDeVencimento(f)}`}</span>
          </span>
          <button onClick={() => fin.pagarFixa(f.id)}>Paguei</button>
        </div>
      ))}
    </div>
  )
}

export function Agora() {
  const s = useStore()
  const eventos = useAgenda((a) => a.eventos)
  const checkIn = s.checkins.find((c) => c.dia === hoje())
  const [energia, setEnergia] = useState<Energia>(checkIn?.energia ?? 2)
  const [pulados, setPulados] = useState<Set<string>>(new Set())
  const [modo, setModo] = useState<'normal' | 'quebrando' | 'agendando'>('normal')
  const [celebrar, setCelebrar] = useState<{ passoId: string; projeto: Projeto | null; restantes: number } | null>(null)
  const encerrados = useAgenda((a) => a.encerrados)
  const encerrarEvento = useAgenda((a) => a.encerrarEvento)
  // Eventos dispensados nesta sessão ("Ver outra coisa").
  const [adiados, setAdiados] = useState<Set<string>>(new Set())
  const [ideia, setIdeia] = useState('')
  const [agora, setAgora] = useState(() => Date.now())

  // Sessão sem fim = cronômetro em andamento (persiste entre aberturas do app).
  const sessao = s.sessoes.find((x) => !x.fim)
  const passoAtivo = sessao && s.passos.find((p) => p.id === sessao.passoId)

  useEffect(() => {
    const t = setInterval(() => setAgora(Date.now()), sessao ? 1000 : 30_000)
    return () => clearInterval(t)
  }, [sessao])

  const sugerida = useMemo(() => {
    // Passos com reserva futura ficam fora da sugestão até o horário.
    const fora = new Set(pulados)
    for (const e of eventos) if (e.passoId && e.inicio > agora) fora.add(e.passoId)
    return escolherPasso(s.projetos, s.passos, s.focoId, energia, fora)
  }, [s.projetos, s.passos, s.focoId, energia, pulados, eventos, agora])

  // Horário reservado para um passo tem prioridade sobre a sugestão.
  const reserva = eventos.find((e) => e.passoId && !e.diaInteiro && e.inicio <= agora && e.fim > agora)
  const passoReservado = reserva && s.passos.find((p) => p.id === reserva.passoId && !p.feitoEm && !pulados.has(p.id))
  const escolha: Escolha | null = passoReservado
    ? {
        passo: passoReservado,
        projeto: s.projetos.find((p) => p.id === passoReservado.projetoId) ?? null,
        restantes: pendentes(s.passos, passoReservado.projetoId).length,
        motivo: `Você reservou ${hora(reserva.inicio)}–${hora(reserva.fim)} para isso.`,
        acimaDaEnergia: false,
      }
    : sugerida

  // Eventos em andamento ou começando em até 30 min têm prioridade sobre passos.
  const relevante = (e: Evento) => !e.diaInteiro && !e.passoId && !encerrados[chaveEvento(e)] && !adiados.has(chaveEvento(e))
  const eventoAgora = eventos.find((e) => relevante(e) && e.inicio <= agora && e.fim > agora)
  const eventoChegando = eventos
    .filter((e) => relevante(e) && e.inicio > agora && e.inicio - agora <= 30 * 60_000)
    .sort((a, b) => a.inicio - b.inicio)[0]
  const adiar = (e: Evento) => setAdiados(new Set(adiados).add(chaveEvento(e)))

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
    setCelebrar({ passoId, projeto, restantes })
    setModo('normal')
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
    const { passoId, projeto, restantes } = celebrar
    const passoFeito = s.passos.find((p) => p.id === passoId)
    const feitosNoProjeto = projeto ? s.passos.filter((p) => p.projetoId === projeto.id && p.feitoEm).length : 0
    return (
      <section className="tela centro">
        <div className="cartao celebra">
          <p className="grande">Feito.</p>
          {passoFeito && (
            <div className="linha centralizada">
              <span className="motivo">Tempo neste passo:</span>
              <TempoGasto passo={passoFeito} perguntar={!s.sessoes.some((x) => x.passoId === passoFeito.id)} />
            </div>
          )}
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
      <section className="tela centro">
        <div className="cartao foco">
          {projeto && <p className="projeto">{projeto.titulo}</p>}
          <p className="passo">{passoAtivo.texto}</p>
          <p className="relogio">{relogio(agora - sessao.inicio)}</p>
          {minutosDoPasso(passoAtivo, s.sessoes, agora) - (agora - sessao.inicio) / 60_000 >= 1 && (
            <p className="motivo centralizado">Total neste passo: {duracao(minutosDoPasso(passoAtivo, s.sessoes, agora))}</p>
          )}
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
    <section className="tela colunas agora">
      <div className="col">
        {eventoAgora ? (
          <div className="cartao foco compromisso">
            <p className="projeto">Compromisso agora{eventoAgora.origem === 'google' && <span className="selo">Google</span>}</p>
            <p className="passo">{eventoAgora.titulo}</p>
            <p className="motivo">
              {hora(eventoAgora.inicio)}–{hora(eventoAgora.fim)} · termina em {duracao((eventoAgora.fim - agora) / 60_000)}
            </p>
            <div className="linha">
              <button className="primario" onClick={() => encerrarEvento(eventoAgora)}>
                Já terminou
              </button>
              <button onClick={() => adiar(eventoAgora)}>Ver outra coisa</button>
            </div>
          </div>
        ) : !passoReservado && eventoChegando ? (
          <div className="cartao foco compromisso chegando">
            <p className="projeto">Daqui a {duracao((eventoChegando.inicio - agora) / 60_000)}</p>
            <p className="passo">{eventoChegando.titulo}</p>
            <p className="motivo">
              Às {hora(eventoChegando.inicio)}. Comece a fechar o que está fazendo: trocar de atividade leva mais tempo do que parece.
            </p>
            <div className="linha">
              <button className="primario" onClick={() => adiar(eventoChegando)}>
                Ok, estou de olho
              </button>
            </div>
          </div>
        ) : !escolha ? (
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
              <PontosEditaveis energia={escolha.passo.energia} onChange={(e) => s.atualizarPasso(escolha.passo.id, { energia: e })} />{' '}
              {escolha.motivo}
            </p>
            {escolha.projeto && (
              <p className="chegada">
                Linha de chegada: <i>{escolha.projeto.chegada}</i>
              </p>
            )}
            {escolha.acimaDaEnergia && (
              <p className="dica">Tudo na fila pede mais energia do que você tem agora. Que tal quebrar este em algo menor?</p>
            )}

            {modo === 'quebrando' ? (
              <PassoForm
                pergunta="Qual é o menor pedaço disso que dá para fazer em 2 minutos?"
                rotuloBotao="Fazer este primeiro"
                energiaInicial={1}
                onSalvar={(t, e) => {
                  s.criarPasso(escolha.passo.projetoId, t, e, escolha.passo.id)
                  setModo('normal')
                }}
                onCancelar={() => setModo('normal')}
              />
            ) : modo === 'agendando' ? (
              <>
                <p className="rotulo">Reservar um horário para este passo. Quando chegar a hora, ele aparece aqui primeiro.</p>
                <EventoForm
                  inicial={{ titulo: escolha.passo.texto, passoId: escolha.passo.id }}
                  rotulo="Reservar horário"
                  onPronto={() => setModo('normal')}
                  onCancelar={() => setModo('normal')}
                />
              </>
            ) : (
              <>
                <button className="primario grande-botao" onClick={() => s.iniciarSessao(escolha.passo.id)}>
                  Começar
                </button>
                <div className="linha">
                  <button onClick={() => concluir(escolha.passo.id)}>Já fiz</button>
                  <button onClick={() => setModo('quebrando')}>Grande demais</button>
                  <button onClick={() => setModo('agendando')}>Agendar</button>
                  <button onClick={() => setPulados(new Set(pulados).add(escolha.passo.id))}>Agora não</button>
                </div>
              </>
            )}
          </div>
        )}
        {rodape}
      </div>

      {/* Em telas estreitas, a ordem visual vem de .agora (index.css). */}
      <div className="col">
        <div className="cartao compacto energia">
          <SituacaoAgora />
          <label className="rotulo">Sua energia agora</label>
          <SeletorEnergia valor={energia} onChange={setEnergia} />
        </div>
        <PendenciasDeHoje agora={agora} />
        <RestoDoDia />
      </div>
    </section>
  )
}
