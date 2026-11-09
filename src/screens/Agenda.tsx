import { useEffect, useState } from 'react'
import { Simbolo } from '../components/Icone'
import { conectarGoogle, ErroGoogle, removerDoGoogle, sincronizarGoogle, temToken } from '../google'
import { useAgora } from '../hooks'
import { apagarComDesfazer } from '../desfazer'
import { useStore } from '../store'
import { apertos, linhaDoTempo } from '../linhaDoTempo'
import { eventosDoDia, situacaoAgora, useAgenda } from '../stores/agenda'
import { NotaDoPasso } from '../components/NotaDoPasso'
import type { Evento, Lembrete } from '../types'
import { dataISO, duracao, hora, inicioDoDia, nomeDoDia } from '../util'
import { BotaoInterruptor } from '../tema/megui-react.mjs'

const REPETIR = { nunca: '', diario: 'todo dia', semanal: 'toda semana', mensal: 'todo mês' }

/** Lembrete da lista, com a nota embaixo e o botão para escrever ou mudar a nota no lugar. */
function ItemLembrete({ lembrete: l, agora }: Readonly<{ lembrete: Lembrete; agora: number }>) {
  const agenda = useAgenda()
  const [editando, setEditando] = useState(false)
  const [nota, setNota] = useState('')

  return (
    <div className="item">
      <div className="linha entre">
        <span>
          {l.texto}
          <br />
          <span className={`motivo ${l.quando <= agora ? 'atencao' : ''}`}>
            {l.quando <= agora ? 'agora' : `${nomeDoDia(dataISO(l.quando))} às ${hora(l.quando)}`}
            {REPETIR[l.repetir] && ` · ${REPETIR[l.repetir]}`}
          </span>
          {!editando && <NotaDoPasso nota={l.nota} />}
        </span>
        <span className="linha">
          <button onClick={() => agenda.concluirLembrete(l.id)}>Feito</button>
          {!editando && (
            <button className="discreto" onClick={() => (setNota(l.nota ?? ''), setEditando(true))} aria-label={`Nota do lembrete ${l.texto}`}>
              Nota
            </button>
          )}
          <button
            className="discreto"
            onClick={() => apagarComDesfazer(useAgenda, 'lembretes', l.id, l.texto, () => agenda.removerLembrete(l.id))}
            aria-label={`Apagar lembrete ${l.texto}`}
          >
            ×
          </button>
        </span>
      </div>
      {editando && (
        <form
          className="form"
          onSubmit={(e) => {
            e.preventDefault()
            agenda.atualizarLembrete(l.id, { nota: nota.trim() || undefined })
            setEditando(false)
          }}
        >
          <textarea
            className="nota-passo"
            rows={2}
            autoFocus
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            placeholder="Link, endereço, o que não esquecer"
            aria-label={`Nota do lembrete ${l.texto}`}
          />
          <div className="linha">
            <button type="submit">Salvar nota</button>
            <button type="button" className="discreto" onClick={() => setEditando(false)}>
              Cancelar
            </button>
          </div>
        </form>
      )}
    </div>
  )
}

export function SituacaoAgora() {
  const eventos = useAgenda((s) => s.eventos)
  const agora = useAgora(30_000)
  const { atual, proximo } = situacaoAgora(eventos, agora)
  const fimDoDia = inicioDoDia(agora) + 86_400_000

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

  // Sincroniza ao abrir, se o token ainda for válido.
  useEffect(() => {
    if (agenda.googleConectado && temToken()) void sincronizar(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Sem Client ID (versão sem Google), a Agenda é só local: nada a oferecer aqui.
  if (!agenda.googleClientId) return null

  return (
    <div className="linha entre google">
      <span className="motivo">
        {agenda.googleConectado
          ? agenda.ultimaSync
            ? `Google sincronizado às ${hora(agenda.ultimaSync)}`
            : 'Google conectado'
          : 'Google Agenda não conectado'}
        {erro && (
          <span className="atencao" role="alert">
            {' · '}
            {erro}
          </span>
        )}
      </span>
      <button onClick={() => sincronizar(true)} disabled={estado === 'sincronizando'}>
        {estado === 'sincronizando' ? 'Sincronizando…' : agenda.googleConectado ? 'Sincronizar' : 'Conectar'}
      </button>
    </div>
  )
}

function LinhaEvento({ e, agora }: { e: Evento; agora: number }) {
  const remover = useAgenda((s) => s.removerEvento)
  const passo = useStore((s) => (e.passoId ? s.passos.find((p) => p.id === e.passoId) : undefined))
  const [erro, setErro] = useState('')
  const passou = e.fim < agora

  return (
    <div className={`evento ${passou ? 'passou' : ''} ${e.inicio <= agora && e.fim > agora ? 'acontecendo' : ''}`}>
      <span className="horario">{e.diaInteiro ? 'Dia todo' : `${hora(e.inicio)}–${hora(e.fim)}`}</span>
      <span className="flex">
        {/* O tom apagado e o horário em negrito não chegam ao leitor de tela. */}
        {passou && <span className="so-leitor">Já passou: </span>}
        {e.inicio <= agora && e.fim > agora && <span className="so-leitor">Acontecendo agora: </span>}
        {e.titulo}
        {passo && <span className="motivo"> · {passo.feitoEm ? 'passo feito' : 'horário reservado para um passo'}</span>}
        {e.origem === 'google' && <span className="selo">{e.agendaGoogle ?? 'Google'}</span>}
        {erro && (
          <span className="atencao" role="alert">
            {' '}
            {erro}
          </span>
        )}
      </span>
      {/* Evento de outra agenda (ex.: a da equipe) é só leitura: apagar aqui ele voltaria na próxima sincronização. */}
      {!e.agendaGoogle && (
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
      )}
    </div>
  )
}

/** Eventos do dia com os intervalos livres entre eles. */
function ListaDoDia({ dia }: { dia: number }) {
  const eventos = useAgenda((s) => s.eventos)
  const doDia = eventosDoDia(eventos, dia)
  const diaInteiro = doDia.filter((e) => e.diaInteiro)
  const comHora = doDia.filter((e) => !e.diaInteiro)
  const agora = useAgora(60_000)

  return (
    <>
      {doDia.length === 0 && <p className="motivo">Dia livre.</p>}
      {diaInteiro.map((e) => (
        <LinhaEvento key={e.id} e={e} agora={agora} />
      ))}
      {comHora.map((e, i) => {
        const anterior = i > 0 ? comHora[i - 1].fim : dia === inicioDoDia(agora) ? agora : null
        const livre = anterior !== null ? (e.inicio - anterior) / 60_000 : 0
        return (
          <div key={e.id}>
            {livre >= 20 && <p className="livre">livre {duracao(livre)}</p>}
            <LinhaEvento e={e} agora={agora} />
          </div>
        )
      })}
    </>
  )
}

/** Faixa de agora até a meia-noite (V12): compromissos, horários reservados e o livre. Só visual: a lista ao lado diz o mesmo. */
function LinhaDoTempo({ eventos, de, ate }: { eventos: Evento[]; de: number; ate: number }) {
  if (ate - de < 3_600_000) return null
  const { faixas, livreMin } = linhaDoTempo(eventos, de, ate)
  return (
    <div className="linha-do-tempo">
      <div className="faixa-do-dia" aria-hidden="true">
        {faixas.map((f) => (
          <span key={f.id} className={`bloco${f.reservado ? ' reservado' : ''}`} style={{ left: `${f.inicio}%`, width: `${f.largura}%` }} title={f.titulo} />
        ))}
      </div>
      <p className="motivo linha entre">
        <span>agora</span>
        <span>livre até a meia-noite: {duracao(livreMin)}</span>
        <span>24h</span>
      </p>
    </div>
  )
}

/** Eventos e lembretes restantes do dia (coluna lateral de Agora). */
export function RestoDoDia() {
  const agenda = useAgenda()
  const agora = useAgora(30_000)
  const fimDoDia = inicioDoDia(agora) + 86_400_000
  const eventos = agenda.eventos.filter((e) => e.fim > agora && e.inicio < fimDoDia).sort((a, b) => a.inicio - b.inicio)
  const lembretes = agenda.lembretes.filter((l) => !l.concluido && l.quando > agora && l.quando < fimDoDia)
  // Compromissos colados (D05): trocar de um para outro leva tempo, então avisa quando sobra pouco.
  const colados = apertos(eventos)
  const itens = [
    ...eventos.map((e) => ({
      id: e.id,
      quando: e.diaInteiro ? 0 : e.inicio,
      horario: e.diaInteiro ? 'Dia todo' : `${hora(e.inicio)}–${hora(e.fim)}`,
      texto: e.titulo,
      lembrete: false,
    })),
    ...lembretes.map((l) => ({ id: l.id, quando: l.quando, horario: hora(l.quando), texto: l.texto, lembrete: true })),
  ].sort((a, b) => a.quando - b.quando)

  return (
    <div className="cartao compacto resto-do-dia">
      <h2 className="rotulo">Resto do dia</h2>
      <LinhaDoTempo eventos={agenda.eventos} de={agora} ate={fimDoDia} />
      {itens.length === 0 && <p className="motivo">Nada mais marcado para hoje.</p>}
      {itens.slice(0, 8).map((i) => (
        <p key={i.id} className="linha-dia">
          <span className="horario">{i.horario}</span> {i.lembrete && <Simbolo c="⏰" diz="Lembrete" />}
          {i.texto}
          {colados.has(i.id) && (
            <span className="motivo">
              {' '}
              · {colados.get(i.id)! < 0 ? 'o próximo começa antes deste terminar' : `só ${colados.get(i.id)} min até o próximo`}
            </span>
          )}
        </p>
      ))}
    </div>
  )
}

export function Agenda() {
  const agenda = useAgenda()
  const agora = useAgora(60_000)
  const [dia, setDia] = useState(() => inicioDoDia())
  const dias = Array.from({ length: 7 }, (_, i) => inicioDoDia(agora + i * 86_400_000))
  const lembretes = agenda.lembretes.filter((l) => !l.concluido).sort((a, b) => a.quando - b.quando)

  return (
    <section className="tela">
      <div className="linha topo-agenda">
        <div className="cartao compacto flex">
          <SituacaoAgora />
        </div>
        <BarraGoogle />
      </div>

      {/* Telas estreitas: um dia por vez. */}
      <div className="visao-dia">
        <div className="dias">
          {dias.map((d) => (
            <BotaoInterruptor key={d} ligado={d === dia} onClick={() => setDia(d)}>
              {nomeDoDia(dataISO(d))}
            </BotaoInterruptor>
          ))}
        </div>
        <div className="cartao">
          <ListaDoDia dia={dia} />
        </div>
      </div>

      {/* Telas largas: semana inteira. */}
      <div className="visao-semana">
        {dias.map((d) => (
          <div key={d} className={`cartao dia-semana ${d === inicioDoDia(agora) ? 'hoje' : ''}`}>
            <h2 className="rotulo">{nomeDoDia(dataISO(d))}</h2>
            <ListaDoDia dia={d} />
          </div>
        ))}
      </div>

      <div className="colunas">
        <div className="col">
          {/* Marcar é sempre pela captura: um lugar só para pôr as coisas, e a Agenda fica para consultar. */}
          <p className="motivo">
            Para marcar, use <b>Capturar</b>: “reunião amanhã 15h” vira compromisso e “lembrar de pagar a luz sexta” vira lembrete.
          </p>
        </div>

        <div className="col">
          {lembretes.length > 0 && (
            <>
              <h2>Lembretes</h2>
              <div className="cartao">
                {lembretes.map((l) => (
                  <ItemLembrete key={l.id} lembrete={l} agora={agora} />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  )
}
