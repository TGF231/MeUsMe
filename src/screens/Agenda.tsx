import { useEffect, useState } from 'react'
import { EventoForm } from '../components/EventoForm'
import { LembreteForm } from '../components/LembreteForm'
import { conectarGoogle, ErroGoogle, removerDoGoogle, sincronizarGoogle, temToken } from '../google'
import { useStore } from '../store'
import { eventosDoDia, situacaoAgora, useAgenda } from '../stores/agenda'
import type { Evento } from '../types'
import { dataISO, duracao, hora, inicioDoDia, nomeDoDia } from '../util'

const REPETIR = { nunca: '', diario: 'todo dia', semanal: 'toda semana', mensal: 'todo mês' }

export function SituacaoAgora() {
  const eventos = useAgenda((s) => s.eventos)
  const [agora, setAgora] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setAgora(Date.now()), 30_000)
    return () => clearInterval(t)
  }, [])
  const { atual, proximo } = situacaoAgora(eventos, agora)
  const fimDoDia = inicioDoDia() + 86_400_000

  if (atual)
    return (
      <p className="situacao ocupado">
        Agora: <b>{atual.titulo}</b>, até {hora(atual.fim)}
      </p>
    )
  if (proximo && proximo.inicio < fimDoDia)
    return (
      <p className="situacao">
        Livre por <b>{duracao((proximo.inicio - agora) / 60_000)}</b>. Depois: {proximo.titulo} às {hora(proximo.inicio)}
      </p>
    )
  return <p className="situacao">Nenhum compromisso pelo resto do dia.</p>
}

function BarraGoogle() {
  const agenda = useAgenda()
  const [estado, setEstado] = useState<'parado' | 'sincronizando'>('parado')
  const [erro, setErro] = useState('')

  const sincronizar = async (interativo: boolean) => {
    setErro('')
    setEstado('sincronizando')
    try {
      if (!temToken()) {
        if (!interativo) return
        await conectarGoogle()
      }
      await sincronizarGoogle()
    } catch (e) {
      setErro(e instanceof ErroGoogle && e.precisaReconectar ? 'A conexão expirou. Toque em Sincronizar.' : String((e as Error).message))
    } finally {
      setEstado('parado')
    }
  }

  // Ao abrir a Agenda, atualiza sozinho se a conexão ainda estiver válida.
  useEffect(() => {
    if (agenda.googleConectado && temToken()) void sincronizar(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!agenda.googleClientId)
    return <p className="vazio-texto">Para ver seus compromissos do Google aqui, configure a conexão em Ajustes (ícone no topo).</p>

  return (
    <div className="linha entre google">
      <span className="motivo">
        {agenda.googleConectado
          ? agenda.ultimaSync
            ? `Google sincronizado às ${hora(agenda.ultimaSync)}`
            : 'Google conectado'
          : 'Google Agenda não conectado'}
        {erro && <span className="atencao"> · {erro}</span>}
      </span>
      <button onClick={() => sincronizar(true)} disabled={estado === 'sincronizando'}>
        {estado === 'sincronizando' ? 'Sincronizando…' : agenda.googleConectado ? 'Sincronizar' : 'Conectar'}
      </button>
    </div>
  )
}

function LinhaEvento({ e }: { e: Evento }) {
  const remover = useAgenda((s) => s.removerEvento)
  const passo = useStore((s) => (e.passoId ? s.passos.find((p) => p.id === e.passoId) : undefined))
  const [erro, setErro] = useState('')
  const agora = Date.now()
  const passou = e.fim < agora

  return (
    <div className={`evento ${passou ? 'passou' : ''} ${e.inicio <= agora && e.fim > agora ? 'acontecendo' : ''}`}>
      <span className="horario">{e.diaInteiro ? 'Dia todo' : `${hora(e.inicio)}–${hora(e.fim)}`}</span>
      <span className="flex">
        {e.titulo}
        {passo && <span className="motivo"> · {passo.feitoEm ? 'passo feito ✓' : 'horário reservado para um passo'}</span>}
        {e.origem === 'google' && <span className="selo">Google</span>}
        {erro && <span className="atencao"> {erro}</span>}
      </span>
      <button
        className="discreto"
        aria-label={`Apagar ${e.titulo}`}
        onClick={async () => {
          if (!confirm(e.origem === 'google' ? `Apagar "${e.titulo}" também do Google Agenda?` : `Apagar "${e.titulo}"?`)) return
          try {
            if (e.googleId) await removerDoGoogle(e.googleId)
            remover(e.id)
          } catch (x) {
            setErro((x as Error).message)
          }
        }}
      >
        ×
      </button>
    </div>
  )
}

/** Compromissos de um dia, com o tempo livre entre eles: tempo visível é tempo que dá para usar. */
function ListaDoDia({ dia }: { dia: number }) {
  const eventos = useAgenda((s) => s.eventos)
  const doDia = eventosDoDia(eventos, dia)
  const diaInteiro = doDia.filter((e) => e.diaInteiro)
  const comHora = doDia.filter((e) => !e.diaInteiro)
  const agora = Date.now()

  return (
    <>
      {doDia.length === 0 && <p className="motivo">Dia livre.</p>}
      {diaInteiro.map((e) => (
        <LinhaEvento key={e.id} e={e} />
      ))}
      {comHora.map((e, i) => {
        const anterior = i > 0 ? comHora[i - 1].fim : dia === inicioDoDia() ? agora : null
        const livre = anterior !== null ? (e.inicio - anterior) / 60_000 : 0
        return (
          <div key={e.id}>
            {livre >= 20 && <p className="livre">livre {duracao(livre)}</p>}
            <LinhaEvento e={e} />
          </div>
        )
      })}
    </>
  )
}

/** Para a coluna lateral da tela Agora: o que ainda vem hoje. */
export function RestoDoDia() {
  const agenda = useAgenda()
  const agora = Date.now()
  const fimDoDia = inicioDoDia() + 86_400_000
  const eventos = agenda.eventos.filter((e) => !e.diaInteiro && e.fim > agora && e.inicio < fimDoDia).sort((a, b) => a.inicio - b.inicio)
  const lembretes = agenda.lembretes.filter((l) => !l.concluido && l.quando > agora && l.quando < fimDoDia)
  const itens = [
    ...eventos.map((e) => ({ id: e.id, quando: e.inicio, texto: e.titulo, fim: e.fim })),
    ...lembretes.map((l) => ({ id: l.id, quando: l.quando, texto: `⏰ ${l.texto}`, fim: undefined })),
  ].sort((a, b) => a.quando - b.quando)

  return (
    <div className="cartao compacto resto-do-dia">
      <p className="rotulo">Resto do dia</p>
      {itens.length === 0 && <p className="motivo">Nada mais marcado para hoje.</p>}
      {itens.slice(0, 8).map((i) => (
        <p key={i.id} className="linha-dia">
          <span className="horario">{i.fim ? `${hora(i.quando)}–${hora(i.fim)}` : hora(i.quando)}</span> {i.texto}
        </p>
      ))}
    </div>
  )
}

export function Agenda() {
  const agenda = useAgenda()
  const [dia, setDia] = useState(inicioDoDia())
  const [criando, setCriando] = useState<'evento' | 'lembrete' | null>(null)
  const dias = Array.from({ length: 7 }, (_, i) => inicioDoDia(Date.now() + i * 86_400_000))
  const lembretes = agenda.lembretes.filter((l) => !l.concluido).sort((a, b) => a.quando - b.quando)
  const agora = Date.now()

  return (
    <section className="tela">
      <div className="linha topo-agenda">
        <div className="cartao compacto flex">
          <SituacaoAgora />
        </div>
        <BarraGoogle />
      </div>

      {/* Tela estreita: um dia por vez. */}
      <div className="visao-dia">
        <div className="dias">
          {dias.map((d) => (
            <button key={d} className={d === dia ? 'ativo' : ''} onClick={() => setDia(d)}>
              {nomeDoDia(dataISO(d))}
            </button>
          ))}
        </div>
        <div className="cartao">
          <ListaDoDia dia={dia} />
        </div>
      </div>

      {/* Tela larga: a semana inteira de uma vez. */}
      <div className="visao-semana">
        {dias.map((d) => (
          <div key={d} className={`cartao dia-semana ${d === inicioDoDia() ? 'hoje' : ''}`}>
            <p className="rotulo">{nomeDoDia(dataISO(d))}</p>
            <ListaDoDia dia={d} />
          </div>
        ))}
      </div>

      <div className="colunas">
        <div className="col">
          {criando === 'evento' ? (
            <div className="cartao">
              <EventoForm inicial={{ data: dataISO(dia) }} onPronto={() => setCriando(null)} onCancelar={() => setCriando(null)} />
            </div>
          ) : criando === 'lembrete' ? (
            <div className="cartao">
              <LembreteForm onPronto={() => setCriando(null)} onCancelar={() => setCriando(null)} />
            </div>
          ) : (
            <div className="linha">
              <button className="primario flex" onClick={() => setCriando('evento')}>
                Novo compromisso
              </button>
              <button className="flex" onClick={() => setCriando('lembrete')}>
                Novo lembrete
              </button>
            </div>
          )}
        </div>

        <div className="col">
          {lembretes.length > 0 && (
            <>
              <h2>Lembretes</h2>
              <div className="cartao">
                {lembretes.map((l) => (
                  <div key={l.id} className="linha entre item">
                    <span>
                      {l.texto}
                      <br />
                      <span className={`motivo ${l.quando <= agora ? 'atencao' : ''}`}>
                        {l.quando <= agora ? 'agora' : `${nomeDoDia(dataISO(l.quando))} às ${hora(l.quando)}`}
                        {REPETIR[l.repetir] && ` · ${REPETIR[l.repetir]}`}
                      </span>
                    </span>
                    <span className="linha">
                      <button onClick={() => agenda.concluirLembrete(l.id)}>Feito</button>
                      <button className="discreto" onClick={() => agenda.removerLembrete(l.id)} aria-label="Apagar lembrete">
                        ×
                      </button>
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  )
}
