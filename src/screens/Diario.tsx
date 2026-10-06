import { CheckInForm, HUMORES } from '../components/CheckInForm'
import { Pontos } from '../components/SeletorEnergia'
import { hoje, useStore } from '../store'

const formatarDia = (dia: string) =>
  new Date(`${dia}T12:00:00`).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })

export function Diario() {
  const checkins = useStore((s) => s.checkins)
  const passos = useStore((s) => s.passos)
  const anteriores = [...checkins].filter((c) => c.dia !== hoje()).sort((a, b) => b.dia.localeCompare(a.dia)).slice(0, 30)

  const feitosNoDia = (dia: string) =>
    passos.filter((p) => {
      if (!p.feitoEm) return false
      const d = new Date(p.feitoEm)
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` === dia
    }).length

  return (
    <section className="tela">
      <div className="colunas">
        <div className="col">
          <div className="cartao">
            <h2 className="titulo">Check-in de hoje</h2>
            <CheckInForm />
          </div>
        </div>
        <div className="col">
          {anteriores.length > 0 && (
            <>
              <h2>Dias anteriores</h2>
              {anteriores.map((c) => (
                <div key={c.dia} className="cartao">
                  <p className="linha entre">
                    <b>{formatarDia(c.dia)}</b>
                    <span className="motivo">
                      {HUMORES[c.humor]} · <Pontos energia={c.energia} /> · {feitosNoDia(c.dia)} feitos
                    </span>
                  </p>
                  {c.frase && <p>{c.frase}</p>}
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </section>
  )
}
