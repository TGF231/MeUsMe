import { useEffect, useState } from 'react'
import { carregarRede } from '../motor/carregar'
import { decidirAgora, descrever } from '../motor/executar'
import type { MotorRede } from '../motor/interpretar'
import { ERROU, TUTORIAL } from '../motor/tutorial'
import { useConfig } from '../stores/config'

/** Escreva e veja o que o app faria, sem criar nada. */
function Experimente() {
  const [texto, setTexto] = useState('')
  const [rede, setRede] = useState<MotorRede | null>(null)
  useEffect(() => {
    void carregarRede().then(setRede)
  }, [])

  return (
    <div className="experimente">
      <label className="rotulo" htmlFor="experimente">
        Experimente: escreva algo e veja o que o app faria
      </label>
      <input id="experimente" value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Ex.: dentista amanhã 15h" autoComplete="off" />
      <p className="motivo" aria-live="polite">
        {texto.trim() ? `→ ${descrever(decidirAgora(texto, rede))}` : 'Nada é criado aqui.'}
      </p>
    </div>
  )
}

/** Tutorial "Como escrever rápido": as quatro regras do motor, uma por tela (src/motor/tutorial.ts). */
export function ComoEscrever({ onFechar }: { onFechar: () => void }) {
  const [i, setI] = useState(0)
  const ajustar = useConfig((c) => c.ajustar)
  const tela = TUTORIAL[i]
  const fim = i === TUTORIAL.length - 1
  const fechar = () => {
    ajustar({ tutorialCapturaVisto: true })
    onFechar()
  }

  return (
    <div className="fundo" role="dialog" aria-modal="true" aria-label="Como escrever rápido" onClick={fechar}>
      <div className="modal tutorial" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.key === 'Escape' && fechar()}>
        <p className="rotulo">
          Como escrever rápido · {i + 1} de {TUTORIAL.length}
        </p>
        <h2 className="titulo">{tela.titulo}</h2>
        <p>{tela.texto}</p>
        <ul className="lista-simples exemplos">
          {tela.exemplos.map((e) => (
            <li key={e.texto}>
              <code>{e.texto}</code> → {e.resultado}
            </li>
          ))}
        </ul>
        <p className="motivo">{ERROU}</p>
        {fim && <Experimente />}
        <div className="pontinhos" role="img" aria-label={`Tela ${i + 1} de ${TUTORIAL.length}`}>
          {TUTORIAL.map((t, j) => (
            <span key={t.titulo} className={j === i ? 'ativo' : ''} />
          ))}
        </div>
        <div className="linha">
          {fim ? (
            <button className="primario" autoFocus onClick={fechar}>
              Entendi
            </button>
          ) : (
            <>
              <button className="primario" autoFocus onClick={() => setI(i + 1)}>
                Continuar
              </button>
              <button className="discreto" onClick={fechar}>
                Pular
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
