import { useEffect, useState } from 'react'
import { usoDeApps, type UsoDeApp } from '../nativo/desktop'
import { ehDesktop } from '../nativo/plataforma'
import { duracao, hoje } from '../util'

/** Tempo por programa medido pelo app Windows (src-tauri/src/uso.rs). */
export function UsoDoComputador() {
  const [periodo, setPeriodo] = useState<1 | 7>(1)
  const [uso, setUso] = useState<UsoDeApp[]>([])

  useEffect(() => {
    if (!ehDesktop()) return
    const carregar = () => void usoDeApps(periodo).then(setUso)
    carregar()
    const t = setInterval(carregar, 60_000)
    return () => clearInterval(t)
  }, [periodo])

  if (!ehDesktop()) return null

  const porApp = new Map<string, number>()
  for (const u of uso) if (periodo === 7 || u.dia === hoje()) porApp.set(u.app, (porApp.get(u.app) ?? 0) + u.segundos)
  const ranking = [...porApp.entries()].sort((a, b) => b[1] - a[1])
  const total = ranking.reduce((s, [, seg]) => s + seg, 0)
  const maior = Math.max(1, ...ranking.map(([, s]) => s))

  return (
    <div className="cartao">
      <div className="linha entre">
        <p className="rotulo">Tempo no computador</p>
        <div className="segmentado mini-segmentado">
          <button className={periodo === 1 ? 'ativo' : ''} onClick={() => setPeriodo(1)}>
            Hoje
          </button>
          <button className={periodo === 7 ? 'ativo' : ''} onClick={() => setPeriodo(7)}>
            7 dias
          </button>
        </div>
      </div>
      {ranking.length === 0 ? (
        <p className="motivo">Medindo… o tempo de cada programa aparece aqui conforme você usa o computador.</p>
      ) : (
        <>
          <p className="motivo">{duracao(total / 60)} de uso ativo (o tempo parado, sem mexer no teclado ou mouse, não conta).</p>
          {ranking.slice(0, 8).map(([app, seg]) => (
            <div key={app} className="barra-linha">
              <div className="linha entre">
                <span>{app}</span>
                <span className="motivo">{duracao(seg / 60)}</span>
              </div>
              <div className="barra">
                <div className="cheia" style={{ width: `${(seg / maior) * 100}%` }} />
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  )
}
