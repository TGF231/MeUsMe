import { CheckInForm, HUMORES } from '../components/CheckInForm'
import { Pontos } from '../components/SeletorEnergia'
import { TempoGasto } from '../components/TempoGasto'
import { UsoDoComputador } from '../components/UsoDoComputador'
import { minutosDoPasso, useStore } from '../store'
import { useAgenda } from '../stores/agenda'
import { dataISO, duracao, hora, hoje, nomeDoDia } from '../util'

const DIA = 86_400_000

export function Historico() {
  const s = useStore()
  const eventos = useAgenda((a) => a.eventos)
  const agora = Date.now()
  const projetoDe = (id: string | null) => s.projetos.find((p) => p.id === id)

  // Últimos 7 dias, para o resumo.
  const desde7 = new Date().setHours(0, 0, 0, 0) - 6 * DIA
  const feitos7 = s.passos.filter((p) => p.feitoEm && p.feitoEm >= desde7)
  const foco7 = s.sessoes.filter((x) => x.inicio >= desde7).reduce((t, x) => t + ((x.fim ?? agora) - x.inicio) / 60_000, 0)
  const manuais7 = feitos7.reduce((t, p) => t + (p.minutosManuais ?? 0), 0)
  const comTempo = feitos7.map((p) => minutosDoPasso(p, s.sessoes, agora)).filter((m) => m >= 1)
  const mediaPorPasso = comTempo.length ? comTempo.reduce((a, b) => a + b, 0) / comTempo.length : 0

  // Tempo por projeto nos últimos 7 dias (sessões + tempo informado à mão).
  const porProjeto = new Map<string, number>()
  for (const x of s.sessoes.filter((x) => x.inicio >= desde7)) {
    const pid = s.passos.find((p) => p.id === x.passoId)?.projetoId ?? 'soltas'
    porProjeto.set(pid, (porProjeto.get(pid) ?? 0) + ((x.fim ?? agora) - x.inicio) / 60_000)
  }
  for (const p of feitos7) if (p.minutosManuais) porProjeto.set(p.projetoId ?? 'soltas', (porProjeto.get(p.projetoId ?? 'soltas') ?? 0) + p.minutosManuais)
  const ranking = [...porProjeto.entries()].filter(([, m]) => m >= 1).sort((a, b) => b[1] - a[1])
  const maior = Math.max(1, ...ranking.map(([, m]) => m))

  // Dias com alguma atividade, do mais recente para o mais antigo (até 30 dias).
  const dias = new Set<string>()
  for (const p of s.passos) if (p.feitoEm) dias.add(dataISO(p.feitoEm))
  for (const x of s.sessoes) dias.add(dataISO(x.inicio))
  for (const c of s.checkins) dias.add(c.dia)
  const listaDias = [...dias].sort().reverse().slice(0, 30)

  return (
    <section className="tela historico">
      <div className="colunas">
        <div className="col">
          <div className="cartao">
            <h2 className="titulo">Check-in de hoje</h2>
            <CheckInForm />
          </div>

          <UsoDoComputador />

          <div className="cartao">
            <p className="rotulo">Últimos 7 dias</p>
            <div className="numeros">
              <span>
                <b>{feitos7.length}</b> passo{feitos7.length === 1 ? '' : 's'} feito{feitos7.length === 1 ? '' : 's'}
              </span>
              <span>
                <b>{duracao(foco7 + manuais7)}</b> de trabalho registrado
              </span>
              {mediaPorPasso > 0 && (
                <span>
                  <b>{duracao(mediaPorPasso)}</b> em média por passo
                </span>
              )}
            </div>
            {ranking.length > 0 && (
              <>
                <p className="rotulo">Onde o tempo foi</p>
                {ranking.map(([pid, m]) => (
                  <div key={pid} className="barra-linha">
                    <div className="linha entre">
                      <span>{pid === 'soltas' ? 'Tarefas soltas' : (projetoDe(pid)?.titulo ?? 'Projeto apagado')}</span>
                      <span className="motivo">{duracao(m)}</span>
                    </div>
                    <div className="barra">
                      <div className="cheia" style={{ width: `${(m / maior) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>

        <div className="col">
          {listaDias.length === 0 && <p className="vazio-texto">Seu histórico aparece aqui conforme você conclui passos.</p>}
          {listaDias.map((dia) => {
            const inicio = new Date(`${dia}T00:00:00`).getTime()
            const fim = inicio + DIA
            const checkin = s.checkins.find((c) => c.dia === dia)
            const feitos = s.passos.filter((p) => p.feitoEm && p.feitoEm >= inicio && p.feitoEm < fim).sort((a, b) => a.feitoEm! - b.feitoEm!)
            const sessoesDoDia = s.sessoes.filter((x) => x.inicio >= inicio && x.inicio < fim)
            const foco = sessoesDoDia.reduce((t, x) => t + ((x.fim ?? agora) - x.inicio) / 60_000, 0)
            const registrado = foco + feitos.reduce((t, p) => t + (p.minutosManuais ?? 0), 0)
            // Passos em que você trabalhou neste dia, mas que não foram concluídos nele.
            const trabalhados = [...new Set(sessoesDoDia.map((x) => x.passoId))]
              .filter((id) => !feitos.some((p) => p.id === id))
              .map((id) => ({
                passo: s.passos.find((p) => p.id === id),
                minutos: sessoesDoDia.filter((x) => x.passoId === id).reduce((t, x) => t + ((x.fim ?? agora) - x.inicio) / 60_000, 0),
              }))
              .filter((t) => t.passo && t.minutos >= 1)
            const compromissos = eventos.filter((e) => !e.diaInteiro && e.inicio >= inicio && e.inicio < fim && e.fim <= agora).sort((a, b) => a.inicio - b.inicio)

            return (
              <div key={dia} className={`cartao dia-historico ${dia === hoje() ? 'hoje' : ''}`}>
                <div className="linha entre">
                  <b>{nomeDoDia(dia)}</b>
                  <span className="motivo">
                    {checkin && (
                      <>
                        {HUMORES[checkin.humor]} · <Pontos energia={checkin.energia} /> ·{' '}
                      </>
                    )}
                    {registrado >= 1 ? `${duracao(registrado)} registrados` : 'sem tempo registrado'}
                  </span>
                </div>
                {checkin?.frase && <p className="frase">“{checkin.frase}”</p>}

                {feitos.map((p) => (
                  <div key={p.id} className="registro">
                    <span className="flex">
                      ✓ {p.texto}
                      <span className="motivo"> · {projetoDe(p.projetoId)?.titulo ?? 'tarefa solta'} · {hora(p.feitoEm!)}</span>
                    </span>
                    <TempoGasto passo={p} />
                  </div>
                ))}
                {trabalhados.map(({ passo, minutos }) => (
                  <div key={passo!.id} className="registro andamento">
                    <span className="flex">
                      ⏱ {passo!.texto}
                      <span className="motivo"> · {passo!.feitoEm ? 'concluído em outro dia' : 'ainda em andamento'}</span>
                    </span>
                    <span className="tempo">{duracao(minutos)}</span>
                  </div>
                ))}
                {compromissos.map((e) => (
                  <div key={e.id} className="registro compromisso">
                    <span className="flex">
                      📅 {e.titulo}
                      <span className="motivo"> · {hora(e.inicio)}</span>
                    </span>
                    <span className="tempo">{duracao((e.fim - e.inicio) / 60_000)}</span>
                  </div>
                ))}
                {feitos.length === 0 && trabalhados.length === 0 && compromissos.length === 0 && (
                  <p className="motivo">Nenhum passo registrado neste dia. Tudo bem: descansar também conta.</p>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
