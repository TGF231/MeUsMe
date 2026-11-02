import { useEffect, useMemo, useState } from 'react'
import { diasDesde, revisaoPendente, sugerirNovasDatas, ultimaAtividade, vencidos } from '../calculos'
import { EventoForm } from '../components/EventoForm'
import { PassoForm } from '../components/PassoForm'
import { BarraProgresso } from '../components/Progresso'
import { AnelDoBloco, Palpite } from '../components/RelogioDeFoco'
import { RevisaoSemana } from '../components/RevisaoSemana'
import { PontosEditaveis, SeletorEnergia } from '../components/SeletorEnergia'
import { TempoGasto } from '../components/TempoGasto'
import { escolherPasso, type Escolha } from '../escolher'
import { hoje, minutosDoPasso, pendentes, useStore } from '../store'
import { chaveEvento, useAgenda } from '../stores/agenda'
import { useConfig } from '../stores/config'
import { diaDeVencimento, fixaPagaNoMes, useFinancas } from '../stores/financas'
import type { Energia, Evento, Projeto } from '../types'
import { duracao, hora, inicioDoDia, nomeDoDia, reais } from '../util'
import { RestoDoDia, SituacaoAgora } from './Agenda'
import { Simbolo } from '../components/Icone'

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
          <span>
            <Simbolo c="⏰" diz="Lembrete" />
            {l.texto}
          </span>
          <button onClick={() => agenda.concluirLembrete(l.id)}>Feito</button>
        </div>
      ))}
      {contas.map((f) => (
        <div key={f.id} className="linha entre">
          <span>
            <Simbolo c="💸" diz="Conta" />
            {f.nome} · {reais(f.valor)}{' '}
            <span className="motivo">{diaDeVencimento(f) === diaHoje ? 'vence hoje' : `venceu dia ${diaDeVencimento(f)}`}</span>
          </span>
          <button onClick={() => fin.pagarFixa(f.id)}>Paguei</button>
        </div>
      ))}
    </div>
  )
}

/**
 * Passos com prazo vencido viram "para reagendar": novas datas sugeridas em lote (até duas por dia, a partir de
 * amanhã) e aceitas com um toque. Sem vermelho, sem contar dias de atraso (D04 em docs/CONCORRENTES.md).
 */
function ParaReagendar() {
  const s = useStore()
  const dia = hoje()
  const lista = vencidos(s.passos, dia)
  if (lista.length === 0) return null
  const novas = new Map(sugerirNovasDatas(lista, dia).map((n) => [n.id, n.prazo]))
  const aplicar = (prazo: (id: string) => string | undefined) => lista.forEach((p) => s.atualizarPasso(p.id, { prazo: prazo(p.id) }))

  return (
    <div className="cartao compacto">
      <h2 className="rotulo">Para reagendar</h2>
      <p className="motivo">
        {lista.length === 1 ? 'Um passo passou da data.' : `${lista.length} passos passaram da data.`} Novas datas sugeridas, até duas por dia:
      </p>
      <ul className="lista-simples">
        {lista.map((p) => (
          <li key={p.id}>
            {p.texto} <span className="motivo">→ {nomeDoDia(novas.get(p.id)!)}</span>
          </li>
        ))}
      </ul>
      <div className="linha">
        <button className="primario" onClick={() => aplicar((id) => novas.get(id))}>
          Usar estas datas
        </button>
        <button onClick={() => aplicar(() => undefined)}>Tirar as datas</button>
      </div>
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
  // Confirmação discreta da última ideia estacionada (some ao digitar outra).
  const [guardada, setGuardada] = useState('')
  const [agora, setAgora] = useState(() => Date.now())
  const cfg = useConfig()
  const [revisando, setRevisando] = useState(false)
  // Última atividade lida ao abrir a tela: o cartão de boas-vindas não some no meio do primeiro passo.
  const [diasLonge, setDiasLonge] = useState(() => {
    const ultima = ultimaAtividade(useStore.getState())
    return ultima ? diasDesde(ultima) : 0
  })

  // Sessão sem fim = cronômetro em andamento (persiste entre aberturas do app).
  const sessao = s.sessoes.find((x) => !x.fim)
  const passoAtivo = sessao && s.passos.find((p) => p.id === sessao.passoId)

  useEffect(() => {
    const t = setInterval(() => setAgora(Date.now()), sessao ? 1000 : 30_000)
    return () => clearInterval(t)
  }, [sessao])

  const sugerida = useMemo(() => {
    // Passos com reserva futura ficam fora da sugestão até o horário (o resto do projeto continua).
    const reservados = new Set(eventos.filter((e) => e.passoId && e.inicio > agora).map((e) => e.passoId!))
    return escolherPasso(s.projetos, s.passos, s.focoId, energia, pulados, reservados)
  }, [s.projetos, s.passos, s.focoId, energia, pulados, eventos, agora])

  const proximaReserva = eventos
    .filter((e) => e.passoId && e.inicio > agora && s.passos.some((p) => p.id === e.passoId && !p.feitoEm))
    .sort((a, b) => a.inicio - b.inicio)[0]

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
    setGuardada(ideia.trim())
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
          {passoFeito?.estimativaMin && minutosDoPasso(passoFeito, s.sessoes) >= 1 && (
            <p className="motivo">
              Palpite: {duracao(passoFeito.estimativaMin)} · real: {duracao(minutosDoPasso(passoFeito, s.sessoes))}. Errar o palpite é normal; o
              Histórico usa isso para mostrar o seu ritmo.
            </p>
          )}
          {projeto && <BarraProgresso passos={s.passos} projetoId={projeto.id} />}
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
                projetoId={projeto.id}
                onSalvar={(t, e, d) => {
                  s.criarPasso(projeto.id, t, e, undefined, d)
                  setCelebrar(null)
                }}
              />
            </>
          ) : (
            <button className="primario" onClick={() => setCelebrar(null)}>
              Próximo
            </button>
          )}
          {/* Toque errado no Feito (tremor, ponteira, acionador): o passo volta para a fila como estava. */}
          <button
            className="discreto"
            onClick={() => {
              s.atualizarPasso(passoId, { feitoEm: undefined })
              setCelebrar(null)
            }}
          >
            Não terminei: voltar para a fila
          </button>
        </div>
        {rodape}
      </section>
    )
  }

  if (sessao && passoAtivo) {
    const projeto = s.projetos.find((p) => p.id === passoAtivo.projetoId) ?? null
    // agora vem do intervalo e pode estar até 1 s atrás do início da sessão.
    const decorrido = Math.max(0, agora - sessao.inicio)
    return (
      <section className="tela centro">
        <div className="cartao foco">
          {projeto && <p className="projeto">{projeto.titulo}</p>}
          <p className="passo">{passoAtivo.texto}</p>
          <p className="relogio">{relogio(decorrido)}</p>
          <AnelDoBloco decorrido={decorrido} blocoMin={cfg.avisoFocoMin || 25} />
          {decorrido >= 5 * 60_000 && decorrido < 10 * 60_000 && (
            <p className="dica neutra centralizado">5 minutos feitos. Dá para parar aqui sem culpa, ou seguir.</p>
          )}
          <Palpite passo={passoAtivo} />
          {minutosDoPasso(passoAtivo, s.sessoes, agora) - decorrido / 60_000 >= 1 && (
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
            <input aria-label="Ideia para estacionar"
              value={ideia}
              onChange={(e) => (setIdeia(e.target.value), setGuardada(''))}
              placeholder="A ideia fica guardada, sem desviar você"
            />
            <button type="submit">Estacionar</button>
          </div>
          {guardada && (
            <p className="motivo" role="status">
              <Simbolo c="✓" />“{guardada}” guardada {projeto ? `em ${projeto.titulo}` : 'na Caixa'}. Pode voltar ao passo.
            </p>
          )}
        </form>
        {rodape}
      </section>
    )
  }

  return (
    <section className="tela colunas agora">
      <div className="col">
        {diasLonge >= 3 && (
          <div className="cartao compacto de-volta">
            <p>
              <b>Que bom te ver de novo.</b> Faz {diasLonge} dias. Nada se perdeu e nada ficou atrasado aqui: escolha uma coisa leve para
              recomeçar.
            </p>
            <div className="linha">
              <button
                className="primario"
                onClick={() => {
                  setEnergia(1)
                  setDiasLonge(0)
                }}
              >
                Começar leve
              </button>
              <button className="discreto" onClick={() => setDiasLonge(0)}>
                Ok
              </button>
            </div>
          </div>
        )}
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
            ) : proximaReserva ? (
              <p>
                O que está na fila já tem horário: <b>{hora(proximaReserva.inicio)}</b>. Até lá, o tempo é seu.
              </p>
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
              <>
                <p className="chegada">
                  Linha de chegada: <i>{escolha.projeto.chegada}</i>
                </p>
                <BarraProgresso passos={s.passos} projetoId={escolha.projeto.id} />
              </>
            )}
            {escolha.acimaDaEnergia && (
              <p className="dica">Tudo na fila pede mais energia do que você tem agora. Que tal quebrar este em algo menor?</p>
            )}

            {modo === 'quebrando' ? (
              <PassoForm
                pergunta="Qual é o menor pedaço disso que dá para fazer em 2 minutos?"
                rotuloBotao="Fazer este primeiro"
                sugerir={false}
                comDatas={false}
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
                <p className="motivo centralizado">Combinado: só 5 minutos. Depois você decide se continua.</p>
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
        {revisando ? (
          <RevisaoSemana agora={agora} onFechar={() => setRevisando(false)} />
        ) : (
          revisaoPendente(agora, cfg.diaRevisao, cfg.revisaoFeitaEm) && (
            <div className="cartao compacto">
              <div className="linha entre">
                <span>
                  <b>Revisão da semana</b>
                  <br />
                  <span className="motivo">5 minutos para escolher o foco e olhar a semana.</span>
                </span>
                <button onClick={() => setRevisando(true)}>Fazer agora</button>
              </div>
            </div>
          )
        )}
        <div className="cartao compacto energia">
          <SituacaoAgora />
          <label className="rotulo">Sua energia agora</label>
          <SeletorEnergia valor={energia} onChange={setEnergia} />
        </div>
        <PendenciasDeHoje agora={agora} />
        <ParaReagendar />
        <RestoDoDia />
      </div>
    </section>
  )
}
