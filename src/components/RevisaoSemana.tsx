import { useNavegacao } from '../navegacao'
import { pendentes, useStore } from '../store'
import { useAgenda } from '../stores/agenda'
import { useConfig } from '../stores/config'
import { diaDeVencimento, fixaPagaNoMes, useFinancas } from '../stores/financas'
import { reais } from '../util'

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
  const ir = useNavegacao((n) => n.ir)

  const ativos = s.projetos.filter((p) => !p.concluidoEm)
  const semProximo = ativos.filter((p) => pendentes(s.passos, p.id).length === 0)
  const proximos7 = eventos.filter((e) => e.inicio >= agora && e.inicio < agora + 7 * DIA)
  const hojeDia = new Date(agora).getDate()
  const contas = fin.fixas.filter(
    (f) => f.tipo === 'gasto' && !fixaPagaNoMes(f, fin.transacoes) && diaDeVencimento(f) >= hojeDia && diaDeVencimento(f) < hojeDia + 7,
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
        <p className="rotulo">1. Caixa</p>
        {s.capturas.length === 0 ? (
          <p>Vazia. ✓</p>
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
        <p className="rotulo">2. Um projeto para a semana</p>
        {ativos.length === 0 ? (
          <p className="motivo">Nenhum projeto ativo. Uma captura da Caixa pode virar um.</p>
        ) : (
          <div className="chips">
            {ativos.map((p) => (
              <button key={p.id} className={s.focoId === p.id ? 'ativo' : ''} onClick={() => s.definirFoco(s.focoId === p.id ? null : p.id)}>
                {s.focoId === p.id ? '★ ' : ''}
                {p.titulo}
              </button>
            ))}
          </div>
        )}
      </div>

      {semProximo.length > 0 && (
        <div className="etapa">
          <p className="rotulo">3. Projetos sem próximo passo</p>
          {semProximo.map((p) => (
            <div key={p.id} className="linha entre">
              <span>{p.titulo}</span>
              <button onClick={() => ir('projetos', p.id)}>Definir o próximo</button>
            </div>
          ))}
        </div>
      )}

      <div className="etapa">
        <p className="rotulo">{semProximo.length > 0 ? '4' : '3'}. Os próximos 7 dias</p>
        <div className="linha entre">
          <span>
            {proximos7.length === 0 ? 'Nenhum compromisso marcado.' : `${proximos7.length} compromisso${proximos7.length > 1 ? 's' : ''}.`}
          </span>
          <button onClick={() => ir('agenda')}>Ver a agenda</button>
        </div>
        {contas.map((f) => (
          <p key={f.id} className="motivo">
            💸 {f.nome} · {reais(f.valor)} · dia {diaDeVencimento(f)}
          </p>
        ))}
      </div>

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
