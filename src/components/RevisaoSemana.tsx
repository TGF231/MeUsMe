import { exportarBackup, quandoFoiOBackup } from '../exportarBackup'
import { useNavegacao } from '../navegacao'
import { pendentes, useStore } from '../store'
import { useAgenda } from '../stores/agenda'
import { useConfig } from '../stores/config'
import { diaDeVencimento, fixaPagaNoMes, useFinancas } from '../stores/financas'
import { mesISO, reais } from '../util'
import { Simbolo } from './Icone'

const DIA = 86_400_000

/**
 * Revisão semanal guiada, em 4 olhadas: Caixa, foco, projetos sem próximo passo e a semana que vem.
 * Planejar uma vez por semana com calendário e lista é um dos pilares da terapia cognitivo-comportamental para TDAH em adultos.
 */
export function RevisaoSemana({ agora, onFechar }: { agora: number; onFechar: () => void }) {
  const s = useStore()
  const eventos = useAgenda((a) => a.eventos)
  const fin = useFinancas()
  const ajustar = useConfig((c) => c.ajustar)
  const ultimoBackup = useConfig((c) => c.ultimoBackup)
  const ir = useNavegacao((n) => n.ir)

  const ativos = s.projetos.filter((p) => !p.concluidoEm)
  const semProximo = ativos.filter((p) => pendentes(s.passos, p.id).length === 0)
  const proximos7 = eventos.filter((e) => e.inicio >= agora && e.inicio < agora + 7 * DIA)
  const compromissos = proximos7.filter((e) => !e.passoId).length
  const reservas = proximos7.length - compromissos
  // Vencimentos dos próximos 7 dias, inclusive os do mês seguinte.
  const contas = Array.from({ length: 7 }, (_, i) => new Date(agora + i * DIA)).flatMap((d) =>
    fin.fixas
      .filter((f) => f.tipo === 'gasto' && diaDeVencimento(f, mesISO(d)) === d.getDate() && !fixaPagaNoMes(f, fin.transacoes, mesISO(d)))
      .map((f) => ({ f, dia: d.getDate() })),
  )
  const terminar = () => {
    ajustar({ revisaoFeitaEm: Date.now() })
    onFechar()
  }

  return (
    <div className="cartao revisao">
      <h2 className="titulo">Revisão da semana</h2>
      <p className="motivo">Cinco minutos para a semana não começar no escuro. Pule o que não fizer sentido.</p>

      <div className="etapa">
        <h3 className="rotulo">1. Caixa</h3>
        {s.capturas.length === 0 ? (
          <p>Vazia.</p>
        ) : (
          <div className="linha entre">
            <span>
              {s.capturas.length} {s.capturas.length === 1 ? 'coisa esperando' : 'coisas esperando'} para virar passo, compromisso ou ideia.
            </span>
            <button onClick={() => ir('caixa')}>Abrir a Caixa</button>
          </div>
        )}
      </div>

      <div className="etapa">
        <h3 className="rotulo">2. Um projeto para a semana</h3>
        {ativos.length === 0 ? (
          <p className="motivo">Nenhum projeto ativo. Uma captura da Caixa pode virar um.</p>
        ) : (
          <div className="chips" role="group" aria-label="Projeto em foco">
            {ativos.map((p) => (
              <button key={p.id} className={s.focoId === p.id ? 'ativo' : ''} aria-pressed={s.focoId === p.id} onClick={() => s.definirFoco(s.focoId === p.id ? null : p.id)}>
                {s.focoId === p.id && <Simbolo c="★" />}
                {p.titulo}
              </button>
            ))}
          </div>
        )}
      </div>

      {semProximo.length > 0 && (
        <div className="etapa">
          <h3 className="rotulo">3. Projetos sem próximo passo</h3>
          {semProximo.map((p) => (
            <div key={p.id} className="linha entre">
              <span>{p.titulo}</span>
              <button onClick={() => ir('projetos', p.id)}>Definir o próximo</button>
            </div>
          ))}
        </div>
      )}

      <div className="etapa">
        <h3 className="rotulo">{semProximo.length > 0 ? '4' : '3'}. Os próximos 7 dias</h3>
        <div className="linha entre">
          <span>
            {compromissos === 0 ? 'Nenhum compromisso marcado.' : `${compromissos} compromisso${compromissos > 1 ? 's' : ''}.`}
            {reservas > 0 && ` ${reservas} horário${reservas > 1 ? 's' : ''} reservado${reservas > 1 ? 's' : ''} para passos.`}
          </span>
          <button onClick={() => ir('agenda')}>Ver a agenda</button>
        </div>
        {contas.map(({ f, dia }) => (
          <p key={f.id} className="motivo">
            <Simbolo c="💸" diz="Conta" />
            {f.nome} · {reais(f.valor)} · dia {dia}
          </p>
        ))}
      </div>

      {/* Backup esquecido (D21): uma linha só, quando passa de 30 dias. */}
      {(!ultimoBackup || agora - ultimoBackup > 30 * DIA) && (
        <div className="linha entre">
          <span className="motivo">Último backup: {quandoFoiOBackup(ultimoBackup, agora)}.</span>
          <button onClick={exportarBackup}>Exportar agora</button>
        </div>
      )}

      <div className="linha">
        <button className="primario" onClick={terminar}>
          Revisão feita
        </button>
        <button className="discreto" onClick={terminar}>
          Pular esta semana
        </button>
        <button className="discreto" onClick={onFechar}>
          Depois
        </button>
      </div>
    </div>
  )
}
