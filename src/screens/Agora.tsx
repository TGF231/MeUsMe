import { useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import { calibracao, diasDesde, marcoDePassos, revisaoPendente, somarDias, sugerirNovasDatas, ultimaAtividade, vencidos } from '../calculos'
import { EventoForm } from '../components/EventoForm'
import { Modal } from '../components/Modal'
import { NotaDoPasso } from '../components/NotaDoPasso'
import { PassoForm } from '../components/PassoForm'
import { Quebrar } from '../components/Quebrar'
import { BarraProgresso } from '../components/Progresso'
import { AnelDoBloco, Palpite } from '../components/RelogioDeFoco'
import { RevisaoSemana } from '../components/RevisaoSemana'
import { PontosEditaveis, SeletorEnergia } from '../components/SeletorEnergia'
import { TempoGasto } from '../components/TempoGasto'
import { ADIAMENTOS_PARA_DIMINUIR, anotadosFora, escolherPasso, type Escolha } from '../escolher'
import { useAgora } from '../hooks'
import { useEnergiaEscolhida } from '../stores/energia'
import { useContexto } from '../stores/contexto'
import { useNavegacao } from '../navegacao'
import { FIM_DO_DIA_H } from '../atencoes'
import { capacidadeDoDia, duracaoPrevista, horariosLivres, montarDia, refazerResto } from '../montarDia'
import { hoje, minutosDoPasso, pendentes, useStore } from '../store'
import { chaveEvento, useAgenda } from '../stores/agenda'
import { useAvisos, useConfig } from '../stores/config'
import { diaDeVencimento, fixaPagaNoMes, useFinancas } from '../stores/financas'
import type { Contexto, Energia, Evento, Passo, Projeto } from '../types'
import { dataISO, duracao, hora, horaInput, inicioDoDia, nomeDoDia, reais } from '../util'
import { RestoDoDia, SituacaoAgora } from './Agenda'
import { Simbolo } from '../components/Icone'
import { Botao, BotaoInterruptor } from '../tema/megui-react.mjs'

const relogio = (ms: number) => {
  const s = Math.floor(ms / 1000)
  const h = Math.floor(s / 3600)
  const mm = String(Math.floor((s % 3600) / 60)).padStart(2, '0')
  const ss = String(s % 60).padStart(2, '0')
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`
}

/** Lembretes vencidos e contas fixas vencidas ou do dia (cada um só com a sua seção ligada). */
function PendenciasDeHoje({ agora }: { agora: number }) {
  const agenda = useAgenda()
  const fin = useFinancas()
  const desligados = useConfig((c) => c.modulosDesligados)
  const lembretes = desligados.includes('agenda') ? [] : agenda.lembretes.filter((l) => !l.concluido && l.quando <= agora)
  const diaHoje = new Date(agora).getDate()
  const contas = desligados.includes('financas') ? [] : fin.fixas.filter((f) => f.tipo === 'gasto' && !fixaPagaNoMes(f, fin.transacoes) && diaDeVencimento(f) <= diaHoje)
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
        <Botao variante="acento" onClick={() => aplicar((id) => novas.get(id))}>
          Usar estas datas
        </Botao>
        <button onClick={() => aplicar(() => undefined)}>Tirar as datas</button>
      </div>
    </div>
  )
}

/**
 * "Montar meu dia" (D01 em docs/CONCORRENTES.md): sugere alguns passos com horário nos vãos livres de hoje,
 * pela energia, pela agenda e pelos seus palpites. Você desmarca o que não quer; nada é marcado sozinho.
 */
function MontarDia({ energia, agora }: Readonly<{ energia: Energia; agora: number }>) {
  const s = useStore()
  const agenda = useAgenda()
  const avisar = useAvisos((a) => a.mostrar)
  const [aberto, setAberto] = useState(false)
  const [tirados, setTirados] = useState<Set<string>>(new Set())
  const ate = inicioDoDia(agora) + FIM_DO_DIA_H * 3_600_000
  // Com horário passado esperando o "Refazer o resto do dia", os dois sugeririam o mesmo tempo livre.
  if (agora >= ate || refazerResto(agenda.eventos, s.passos, agora, ate, inicioDoDia(agora)).passaram > 0) return null

  if (!aberto) {
    return (
      <div className="cartao compacto">
        <div className="linha entre">
          <span>
            <b>Montar meu dia</b>
            <br />
            <span className="motivo">Alguns passos com horário no tempo livre de hoje. Você escolhe o que fica.</span>
          </span>
          <button onClick={() => (setTirados(new Set()), setAberto(true))}>Sugerir</button>
        </div>
      </div>
    )
  }

  const { propostas, semEspaco } = montarDia({ ...s, eventos: agenda.eventos, energia }, agora, ate)
  const marcadas = propostas.filter((p) => !tirados.has(p.id))
  const reservar = () => {
    marcadas.forEach((p) => agenda.criarEvento({ titulo: p.passo.texto, inicio: p.inicio, fim: p.fim, passoId: p.passo.id, origem: 'local' }))
    avisar('Dia montado', `${marcadas.length} horário${marcadas.length === 1 ? '' : 's'} reservado${marcadas.length === 1 ? '' : 's'}. Cada passo aparece aqui na hora dele.`)
    setAberto(false)
  }

  return (
    <div className="cartao compacto">
      <h2 className="rotulo">Montar meu dia</h2>
      {propostas.length === 0 ? (
        <p className="motivo">
          {semEspaco.length > 0 ? 'Não sobra tempo livre hoje para os próximos passos.' : 'Nada na fila que caiba na sua energia agora.'}
        </p>
      ) : (
        <>
          <p className="motivo">Desmarque o que não quiser. A duração vem do seu palpite ou da energia do passo.</p>
          {propostas.map((p) => (
            <label key={p.id} className="check">
              <input
                type="checkbox"
                checked={!tirados.has(p.id)}
                onChange={(e) => {
                  const n = new Set(tirados)
                  if (e.target.checked) n.delete(p.id)
                  else n.add(p.id)
                  setTirados(n)
                }}
              />
              <span>
                <span className="horario">
                  {hora(p.inicio)}–{hora(p.fim)}
                </span>{' '}
                {p.passo.texto}
                {p.projeto && <span className="motivo"> · {p.projeto.titulo}</span>}
              </span>
            </label>
          ))}
        </>
      )}
      <div className="linha">
        {marcadas.length > 0 && (
          <Botao variante="acento" onClick={reservar}>
            Reservar {marcadas.length === 1 ? 'este horário' : `estes ${marcadas.length} horários`}
          </Botao>
        )}
        <button onClick={() => setAberto(false)}>{propostas.length ? 'Agora não' : 'Ok'}</button>
      </div>
    </div>
  )
}

/**
 * Capacidade do dia (V14 em docs/CONCORRENTES.md): quando os passos com prazo hoje passam do tempo livre, pergunta
 * o que fica para amanhã. Nada muda sem você tocar; "Está bom assim" esconde o aviso até reabrir o app.
 */
function CapacidadeDoDia({ agora }: Readonly<{ agora: number }>) {
  const s = useStore()
  const eventos = useAgenda((a) => a.eventos)
  const [dispensado, setDispensado] = useState(false)
  const c = capacidadeDoDia(s.passos, s.sessoes, eventos, agora, inicioDoDia(agora) + FIM_DO_DIA_H * 3_600_000)
  if (dispensado || c.cabe || c.passos.length < 2) return null
  const amanha = somarDias(hoje(), 1)

  return (
    <div className="cartao compacto">
      <h2 className="rotulo">Hoje não cabe tudo</h2>
      <p className="motivo">
        Os passos com prazo hoje pedem cerca de {duracao(c.precisaMin)}, e sobram {duracao(c.livreMin)} livres até as {FIM_DO_DIA_H}h. O que fica para
        amanhã?
      </p>
      <ul className="lista-simples">
        {c.passos.map((p) => (
          <li key={p.id} className="linha entre">
            <span>{p.texto}</span>
            <button className="discreto" onClick={() => s.atualizarPasso(p.id, { prazo: amanha })}>
              Para amanhã
            </button>
          </li>
        ))}
      </ul>
      <button onClick={() => setDispensado(true)}>Está bom assim</button>
    </div>
  )
}

/**
 * Horários livres para o passo (V13 em docs/CONCORRENTES.md): três propostas no resto de hoje e amanhã, com a
 * duração prevista. Tocar numa delas reserva; o formulário abaixo continua para escolher outro horário.
 */
/**
 * "Agora não" com hora marcada: tudo bem deixar para depois, desde que o depois tenha dia e hora. Os horários livres
 * reservam com um toque; o formulário aceita qualquer dia e hora no futuro. Sem escolher, o passo continua na tela.
 */
/** Atalhos de "daqui a": minutos e rótulo. */
const DAQUI_A: [number, string][] = [
  [30, '30 min'],
  [60, '1 hora'],
  [120, '2 horas'],
  [240, '4 horas'],
]

function RetomarEm({ passo, agora, onPronto, onCancelar }: Readonly<{ passo: Passo; agora: number; onPronto: () => void; onCancelar: () => void }>) {
  const s = useStore()
  const agenda = useAgenda()
  const avisar = useAvisos((a) => a.mostrar)
  const [dia, setDia] = useState(() => dataISO(agora + 86_400_000))
  const [horario, setHorario] = useState('09:00')
  const inicio = new Date(`${dia}T${horario}`).getTime()
  const valido = Number.isFinite(inicio) && inicio > agora
  const minutos = duracaoPrevista(passo, Math.min(2, Math.max(0.5, calibracao(s.passos, s.sessoes)?.fator ?? 1)))
  // "Daqui a X tempo" só preenche dia e hora: você vê quando vai ser antes de combinar.
  const [quantos, setQuantos] = useState('')
  const [unidade, setUnidade] = useState(60)
  const daqui = (min: number) => {
    // `agora` atualiza a cada 30 s: o horário pode sair até meio minuto antes, o que não muda o combinado.
    const quando = agora + min * 60_000
    setDia(dataISO(quando))
    setHorario(horaInput(quando))
  }

  return (
    <>
      <p className="motivo">Tudo bem deixar para depois, com dia e hora marcados. Até lá o passo sai da fila; na hora, ele aparece aqui primeiro.</p>
      <HorariosLivres passo={passo} agora={agora} onPronto={onPronto} />
      <form
        className="form"
        onSubmit={(e) => {
          e.preventDefault()
          if (!valido) return
          agenda.criarEvento({ titulo: passo.texto, inicio, fim: inicio + minutos * 60_000, passoId: passo.id, origem: 'local' })
          avisar('Combinado', `“${passo.texto}” volta ${nomeDoDia(dia).toLowerCase()}, ${hora(inicio)}.`)
          onPronto()
        }}
      >
        <span className="rotulo">Ou daqui a</span>
        <div className="chips" role="group" aria-label="Daqui a quanto tempo">
          {DAQUI_A.map(([min, rotulo]) => (
            <button key={min} type="button" onClick={() => daqui(min)}>
              {rotulo}
            </button>
          ))}
        </div>
        <div className="linha">
          <span>
            <input
              type="number"
              min={1}
              inputMode="numeric"
              aria-label="Quanto tempo"
              placeholder="Outro: quanto?"
              value={quantos}
              onChange={(e) => {
                setQuantos(e.target.value)
                if (Number(e.target.value) > 0) daqui(Number(e.target.value) * unidade)
              }}
            />
          </span>
          <span>
            <select
              aria-label="Unidade"
              value={unidade}
              onChange={(e) => {
                setUnidade(Number(e.target.value))
                if (Number(quantos) > 0) daqui(Number(quantos) * Number(e.target.value))
              }}
            >
              <option value={1}>minutos</option>
              <option value={60}>horas</option>
              <option value={1440}>dias</option>
            </select>
          </span>
        </div>
        <div className="linha">
          <span>
            <label className="rotulo" htmlFor="retomar-dia">
              Dia
            </label>
            <input id="retomar-dia" type="date" required value={dia} min={dataISO(agora)} onChange={(e) => setDia(e.target.value)} />
          </span>
          <span>
            <label className="rotulo" htmlFor="retomar-hora">
              Hora
            </label>
            <input id="retomar-hora" type="time" required value={horario} onChange={(e) => setHorario(e.target.value)} />
          </span>
        </div>
        {!valido && dia && horario && <p className="dica">Esse horário já passou. Escolha um momento mais à frente.</p>}
        <div className="linha">
          <Botao variante="acento" type="submit" disabled={!valido}>
            Combinar
          </Botao>
          <button type="button" onClick={onCancelar}>
            Ficar com o passo
          </button>
        </div>
      </form>
    </>
  )
}

function HorariosLivres({ passo, agora, onPronto }: Readonly<{ passo: Passo; agora: number; onPronto: () => void }>) {
  const s = useStore()
  const agenda = useAgenda()
  const avisar = useAvisos((a) => a.mostrar)
  const hoje0 = inicioDoDia(agora)
  const amanha0 = inicioDoDia(hoje0 + 36 * 3_600_000)
  const fator = Math.min(2, Math.max(0.5, calibracao(s.passos, s.sessoes)?.fator ?? 1))
  const minutos = duracaoPrevista(passo, fator)
  const livres = horariosLivres(minutos, agenda.eventos, [
    [agora, hoje0 + FIM_DO_DIA_H * 3_600_000],
    [amanha0 + 8 * 3_600_000, amanha0 + FIM_DO_DIA_H * 3_600_000],
  ])
  if (livres.length === 0) return null
  const reservar = (inicio: number, fim: number) => {
    agenda.criarEvento({ titulo: passo.texto, inicio, fim, passoId: passo.id, origem: 'local' })
    avisar('Horário reservado', `${inicio < amanha0 ? 'Hoje' : 'Amanhã'}, ${hora(inicio)}–${hora(fim)}.`)
    onPronto()
  }

  return (
    <>
      <p className="motivo">Horários livres para {duracao(minutos)}:</p>
      <div className="chips" role="group" aria-label="Horários livres">
        {livres.map((b) => (
          <button key={b.inicio} onClick={() => reservar(b.inicio, b.fim)}>
            {b.inicio < amanha0 ? 'Hoje' : 'Amanhã'} {hora(b.inicio)}
          </button>
        ))}
      </div>
    </>
  )
}

/**
 * "Refazer o resto do dia" (D02 em docs/CONCORRENTES.md): quando um horário reservado passa sem o passo feito,
 * reencaixa esse e os próximos no tempo que sobra. O que não couber volta para a fila, sem horário e sem "atraso".
 */
function RefazerResto({ agora }: Readonly<{ agora: number }>) {
  const passos = useStore((s) => s.passos)
  const agenda = useAgenda()
  const desde = inicioDoDia(agora)
  const r = refazerResto(agenda.eventos, passos, agora, desde + FIM_DO_DIA_H * 3_600_000, desde)
  if (r.passaram === 0) return null

  const reencaixar = () => {
    r.mover.forEach((m) => agenda.atualizarEvento(m.id, { inicio: m.inicio, fim: m.fim }))
    r.naoCabem.forEach((e) => agenda.removerEvento(e.id))
  }
  const tirarHorarios = () => agenda.eventos.filter((e) => e.passoId && e.origem === 'local' && e.inicio >= desde && e.fim <= agora).forEach((e) => agenda.removerEvento(e.id))

  return (
    <div className="cartao compacto">
      <h2 className="rotulo">Refazer o resto do dia</h2>
      <p className="motivo">
        {r.passaram === 1 ? 'Um horário reservado passou' : `${r.passaram} horários reservados passaram`} sem o passo feito. Acontece. Dá para
        reencaixar no tempo que sobra:
      </p>
      {r.mover.length > 0 && (
        <ul className="lista-simples">
          {r.mover.map((m) => (
            <li key={m.id}>
              {m.evento.titulo}{' '}
              <span className="motivo">
                → {hora(m.inicio)}–{hora(m.fim)}
              </span>
            </li>
          ))}
        </ul>
      )}
      {r.naoCabem.length > 0 && (
        <p className="motivo">
          Não cabem hoje e voltam para a fila, sem horário: {r.naoCabem.map((e) => e.titulo).join(', ')}.
        </p>
      )}
      <div className="linha">
        <Botao variante="acento" onClick={reencaixar}>
          Reencaixar
        </Botao>
        <button onClick={tirarHorarios}>Só tirar os horários que passaram</button>
      </div>
    </div>
  )
}

const LUGARES: [Contexto, string][] = [
  ['trabalho', 'No trabalho'],
  ['casa', 'Em casa'],
]

/** Trabalho ou casa. Só aparece quando algum passo pendente tem lugar: quem não usa não ganha mais um controle. */
function SeletorLugar() {
  const { atual, ir } = useContexto()
  const temLugar = useStore((s) => s.passos.some((p) => p.contexto && !p.feitoEm))
  if (!atual && !temLugar) return null
  return (
    <div className="chips" role="group" aria-label="Onde você está">
      {LUGARES.map(([c, rotulo]) => (
        <BotaoInterruptor key={c} ligado={atual === c} onClick={() => ir(atual === c ? null : c)}>
          {rotulo}
        </BotaoInterruptor>
      ))}
    </div>
  )
}

/** Ao chegar a um lugar, o que foi anotado para ele enquanto você estava no outro: não depende de lembrar na troca. */
function Chegada() {
  const { atual, saiuEm, chegouEm, chegadaVista, verChegada } = useContexto()
  const passos = useStore((s) => s.passos)
  if (!atual || chegadaVista) return null
  const lista = anotadosFora(passos, atual, saiuEm[atual], chegouEm)
  if (lista.length === 0) return null
  return (
    <div className="cartao compacto">
      <p>
        <b>Anotado para {atual === 'trabalho' ? 'o trabalho' : 'casa'} enquanto você estava fora:</b>
      </p>
      <ul className="lista-simples">
        {lista.map((p) => (
          <li key={p.id}>{p.texto}</li>
        ))}
      </ul>
      <button className="discreto" onClick={verChegada}>
        Ok, visto
      </button>
    </div>
  )
}

/** Tela larga (computador): Próximo passo vira um painel de três colunas. No celular, nada muda. */
const LARGO = '(min-width: 1100px)'
function useLargo() {
  return useSyncExternalStore(
    (avisar) => {
      const m = window.matchMedia(LARGO)
      m.addEventListener('change', avisar)
      return () => m.removeEventListener('change', avisar)
    },
    () => window.matchMedia(LARGO).matches,
  )
}

/**
 * Coluna da direita no computador: os próximos da fila, na mesma ordem em que o Próximo passo os escolheria (fora o
 * atual), e as últimas coisas que esperam para ser organizadas.
 */
function ASeguir({ atual, energia, contexto }: Readonly<{ atual: string | undefined; energia: Energia; contexto: Contexto | null }>) {
  const s = useStore()
  const ir = useNavegacao((n) => n.ir)
  const fila: Escolha[] = []
  const pulados = new Set<string>(atual ? [atual] : [])
  for (let i = 0; i < 5; i++) {
    const e = escolherPasso(s.projetos, s.passos, s.focoId, energia, pulados, new Set(), undefined, contexto)
    if (!e) break
    fila.push(e)
    pulados.add(e.passo.id)
  }
  const recentes = s.capturas.slice(0, 3)  // a captura nova entra no começo da lista
  return (
    <>
      <div className="cartao compacto">
        <h2 className="rotulo">A seguir</h2>
        {fila.length === 0 ? (
          <p className="motivo">Depois deste, a fila fica vazia.</p>
        ) : (
          <ol className="lista-lado">
            {fila.map((e) => (
              <li key={e.passo.id}>
                <span>{e.passo.texto}</span>
                <span className="motivo">{e.projeto ? e.projeto.titulo : 'Tarefa'}</span>
              </li>
            ))}
          </ol>
        )}
      </div>
      <div className="cartao compacto">
        <h2 className="rotulo">Em espera</h2>
        {s.capturas.length === 0 ? (
          <p className="motivo">Nada esperando para organizar.</p>
        ) : (
          <>
            <ul className="lista-lado">
              {recentes.map((c) => (
                <li key={c.id}>
                  <span>{c.texto}</span>
                </li>
              ))}
            </ul>
            <button className="discreto" onClick={() => ir('caixa')}>
              Organizar {s.capturas.length} {s.capturas.length === 1 ? 'coisa' : 'coisas'}
            </button>
          </>
        )}
      </div>
    </>
  )
}

export function Agora() {
  const s = useStore()
  const largo = useLargo()
  const eventos = useAgenda((a) => a.eventos)
  const checkIn = s.checkins.find((c) => c.dia === hoje())
  // A mesma energia vale em Planejar (montar o dia): por isso fica fora da tela.
  const energia = useEnergiaEscolhida((e) => e.energia) ?? checkIn?.energia ?? 2
  const setEnergia = useEnergiaEscolhida((e) => e.escolher)
  const lugar = useContexto()
  const [modo, setModo] = useState<'normal' | 'quebrando' | 'agendando' | 'diminuindo' | 'adiando'>('normal')
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
  // A nota aberta é de um passo só: trocar de passo fecha.
  const [notaAberta, setNotaAberta] = useState<string | null>(null)
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
    return escolherPasso(s.projetos, s.passos, s.focoId, energia, new Set(), reservados, undefined, lugar.atual)
  }, [s.projetos, s.passos, s.focoId, energia, eventos, agora, lugar.atual])

  const proximaReserva = eventos
    .filter((e) => e.passoId && e.inicio > agora && s.passos.some((p) => p.id === e.passoId && !p.feitoEm))
    .sort((a, b) => a.inicio - b.inicio)[0]

  // Horário reservado para um passo tem prioridade sobre a sugestão.
  const reserva = eventos.find((e) => e.passoId && !e.diaInteiro && e.inicio <= agora && e.fim > agora)
  const passoReservado = reserva && s.passos.find((p) => p.id === reserva.passoId && !p.feitoEm)
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

  // "Agora não" é um compromisso: o passo só sai da vez com dia e hora para voltar (o formulário em RetomarEm cria a
  // reserva). Aqui só se conta o adiamento e se encerra a reserva em andamento, senão ela seguraria o passo na tela.
  const adiado = (passo: Passo) => {
    s.atualizarPasso(passo.id, { adiamentos: (passo.adiamentos ?? 0) + 1 })
    if (reserva?.passoId === passo.id) useAgenda.getState().removerEvento(reserva.id)
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
    const marco = marcoDePassos(s.passos.filter((p) => p.feitoEm).length)
    return (
      <section className="tela centro">
        <div className="cartao celebra">
          <p className="grande">Feito.</p>
          {cfg.marcos && marco && <p className="motivo centralizado">{marco}</p>}
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
                <Botao
                  variante="acento"
                  onClick={() => {
                    s.concluirProjeto(projeto.id)
                    setCelebrar(null)
                  }}
                >
                  Sim, concluir projeto
                </Botao>
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
            <Botao variante="acento" onClick={() => setCelebrar(null)}>
              Próximo
            </Botao>
          )}
          {/* Toque errado no Feito (tremor, ponteira, acionador): o passo volta para a fila como estava. */}
          <button
            className="discreto"
            onClick={() => {
              s.reabrirPasso(passoId)
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
          <NotaDoPasso nota={passoAtivo.nota} />
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
            <Botao variante="acento" onClick={() => concluir(passoAtivo.id)}>
              Feito
            </Botao>
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
              <Simbolo c="✓" />“{guardada}” guardada {projeto ? `em ${projeto.titulo}` : 'em espera'}. Pode voltar ao passo.
            </p>
          )}
        </form>
        {rodape}
      </section>
    )
  }

  const verNota = !!escolha && notaAberta === escolha.passo.id

  const tela = (
    <section className="tela centro agora">
      {diasLonge >= 3 && (
        <div className="cartao compacto de-volta">
          <p>
            <b>Que bom te ver de novo.</b> Faz {diasLonge} dias. Nada se perdeu e nada ficou atrasado aqui: escolha uma coisa leve para
            recomeçar.
          </p>
          <div className="linha">
            <button
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

      <SeletorEnergia valor={energia} onChange={setEnergia} />
      <SeletorLugar />
      <Chegada />

      {/* O passo fica no meio da altura que sobra, e não colado no topo com a tela vazia embaixo. */}
      <div className="agora-meio">
        {eventoAgora ? (
          <div className="cartao foco compromisso">
            <p className="projeto">Compromisso agora{eventoAgora.origem === 'google' && <span className="selo">Google</span>}</p>
            <p className="passo">{eventoAgora.titulo}</p>
            <p className="motivo">
              {hora(eventoAgora.inicio)}–{hora(eventoAgora.fim)} · termina em {duracao((eventoAgora.fim - agora) / 60_000)}
            </p>
            <div className="linha">
              <Botao variante="acento" onClick={() => encerrarEvento(eventoAgora)}>
                Já terminou
              </Botao>
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
              <Botao variante="acento" onClick={() => adiar(eventoChegando)}>
                Ok, estou de olho
              </Botao>
            </div>
          </div>
        ) : !escolha ? (
          <div className="cartao vazio">
            {proximaReserva ? (
              <p>
                O que está na fila já tem horário: <b>{hora(proximaReserva.inicio)}</b>. Até lá, o tempo é seu.
              </p>
            ) : (
              <p>
                Nada na fila. Jogue o que estiver na cabeça no botão <b>+</b> e organize depois, em <b>Em espera</b>.
              </p>
            )}
          </div>
        ) : (
          <div className="cartao foco">
            <p className="projeto">{escolha.projeto ? escolha.projeto.titulo : 'Tarefa'}</p>
            <p className="passo">{escolha.passo.texto}</p>
            <p className="motivo">
              <PontosEditaveis energia={escolha.passo.energia} onChange={(e) => s.atualizarPasso(escolha.passo.id, { energia: e })} />{' '}
              {escolha.motivo}
            </p>
            {/* A nota fica a um toque: o Agora mostra só o passo, e o contexto aparece quando é pedido. */}
            {escolha.passo.nota && (
              <>
                <button className="discreto" aria-expanded={verNota} onClick={() => setNotaAberta(verNota ? null : escolha.passo.id)}>
                  {verNota ? 'Esconder a nota' : 'Ver nota'}
                </button>
                {verNota && <NotaDoPasso nota={escolha.passo.nota} />}
              </>
            )}
            {(escolha.passo.adiamentos ?? 0) >= ADIAMENTOS_PARA_DIMINUIR && (
              <p className="dica">
                Este passo já ficou para depois {escolha.passo.adiamentos} vezes. Tudo bem: uma versão menor também conta.{' '}
                <button className="discreto" onClick={() => setModo('diminuindo')}>
                  Diminuir
                </button>
              </p>
            )}
            {escolha.acimaDaEnergia && <p className="dica">Tudo na fila pede mais energia do que você tem agora. Que tal quebrar este em algo menor?</p>}
            <Botao variante="acento" className="grande-botao" onClick={() => s.iniciarSessao(escolha.passo.id)}>
              Começar
            </Botao>
            <p className="motivo centralizado">Combinado: só 5 minutos. Depois você decide se continua.</p>
            <div className="linha centralizada">
              <button className="discreto" onClick={() => concluir(escolha.passo.id)}>
                Já fiz
              </button>
              <button className="discreto" onClick={() => setModo('quebrando')}>
                Grande demais
              </button>
              <button className="discreto" onClick={() => setModo('agendando')}>
                Agendar
              </button>
              <button className="discreto" onClick={() => setModo('adiando')}>
                Agora não
              </button>
            </div>
          </div>
        )}
        {rodape}
      </div>

      {escolha && modo === 'quebrando' && (
        <Modal titulo="Grande demais" onFechar={() => setModo('normal')}>
          <Quebrar passo={escolha.passo} onPronto={() => setModo('normal')} />
        </Modal>
      )}
      {escolha && modo === 'adiando' && (
        <Modal titulo="Agora não" onFechar={() => setModo('normal')}>
          <RetomarEm passo={escolha.passo} agora={agora} onPronto={() => adiado(escolha.passo)} onCancelar={() => setModo('normal')} />
        </Modal>
      )}
      {escolha && modo === 'diminuindo' && (
        <Modal titulo="Versão menor" onFechar={() => setModo('normal')}>
          <p className="motivo">O que, menor do que “{escolha.passo.texto}”, já contaria como feito? Se forem vários pedaços, use Grande demais.</p>
          <PassoForm
            inicial={escolha.passo.texto}
            pergunta="A versão menor"
            rotuloBotao="Trocar por esta"
            sugerir={false}
            comDatas={false}
            energiaInicial={1}
            onSalvar={(texto, energia) => {
              const p = escolha.passo
              s.atualizarPasso(p.id, { texto, energia, adiamentos: 0, reduzidoDe: p.reduzidoDe ?? p.texto })
              setModo('normal')
            }}
            onCancelar={() => setModo('normal')}
          />
        </Modal>
      )}
      {escolha && modo === 'agendando' && (
        <Modal titulo="Agendar" onFechar={() => setModo('normal')}>
          <p className="motivo">Reservar um horário para “{escolha.passo.texto}”. Quando chegar a hora, ele aparece aqui primeiro.</p>
          <HorariosLivres passo={escolha.passo} agora={agora} onPronto={() => setModo('normal')} />
          <EventoForm
            inicial={{ titulo: escolha.passo.texto, passoId: escolha.passo.id }}
            rotulo="Reservar horário"
            onPronto={() => setModo('normal')}
            onCancelar={() => setModo('normal')}
          />
        </Modal>
      )}
    </section>
  )
  if (!largo) return tela
  // Computador: o passo no meio; à esquerda o que pede decisão e o resto do dia, à direita a fila e o que espera.
  return (
    <div className="agora-painel">
      <aside className="agora-lado" aria-label="Hoje">
        <PendenciasDeHoje agora={agora} />
        <RestoDoDia />
      </aside>
      {tela}
      <aside className="agora-lado" aria-label="A seguir">
        <ASeguir atual={escolha?.passo.id} energia={energia} contexto={lugar.atual} />
      </aside>
    </div>
  )
}

/**
 * Planejar o dia, ao lado do Próximo passo no menu de Em ação: o que pede decisão hoje, o que reagendar, montar e
 * refazer o dia, e a revisão da semana quando for o dia dela. Cada bloco é um cartão, como nas outras telas.
 */
export function Planejar() {
  const agora = useAgora(30_000)
  const cfg = useConfig()
  const checkIn = useStore((s) => s.checkins.find((c) => c.dia === hoje()))
  const energia = useEnergiaEscolhida((e) => e.energia) ?? checkIn?.energia ?? 2
  const [revisando, setRevisando] = useState(false)
  const comAgenda = !cfg.modulosDesligados.includes('agenda')

  if (revisando)
    return (
      <section className="tela centro planejar">
        <RevisaoSemana agora={agora} onFechar={() => setRevisando(false)} />
      </section>
    )

  return (
    <section className="tela centro planejar">
      {comAgenda && (
        <div className="cartao compacto">
          <SituacaoAgora />
        </div>
      )}
      {revisaoPendente(agora, cfg.diaRevisao, cfg.revisaoFeitaEm) && (
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
      )}
      <PendenciasDeHoje agora={agora} />
      <ParaReagendar />
      {comAgenda && (
        <>
          <RefazerResto agora={agora} />
          <CapacidadeDoDia agora={agora} />
          <MontarDia energia={energia} agora={agora} />
          <RestoDoDia />
        </>
      )}
    </section>
  )
}

