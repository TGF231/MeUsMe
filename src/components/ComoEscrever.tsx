import { useEffect, useState } from 'react'
import { useJanelaModal } from '../hooks'
import { Simbolo } from './Icone'
import { carregarRede } from '../motor/carregar'
import { decidirAgora, descrever } from '../motor/executar'
import type { MotorRede } from '../motor/interpretar'
import { ERROU, TUTORIAL } from '../motor/tutorial'
import { useConfig } from '../stores/config'
import { Botao } from '../tema/megui-react.mjs'

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
        {texto.trim() ? (
          <>
            <Simbolo c="→" />
            {descrever(decidirAgora(texto, rede))}
          </>
        ) : (
          'Nada é criado aqui.'
        )}
      </p>
    </div>
  )
}

/** Tutorial "Como escrever rápido": as quatro regras do motor, uma por tela (src/motor/tutorial.ts). */
export function ComoEscrever({ onFechar }: Readonly<{ onFechar: () => void }>) {
  const [i, setI] = useState(0)
  const ajustar = useConfig((c) => c.ajustar)
  const tela = TUTORIAL[i]
  const fim = i === TUTORIAL.length - 1
  const fechar = () => {
    ajustar({ tutorialCapturaVisto: true })
    onFechar()
  }
  const janela = useJanelaModal()

  return (
    <dialog
      ref={janela}
      className="fundo"
      aria-label="Como escrever rápido"
      onCancel={(e) => {
        e.preventDefault()
        fechar()
      }}
    >
      <div className="modal tutorial">
        <p className="rotulo">
          Como escrever rápido · {i + 1} de {TUTORIAL.length}
        </p>
        {/* Ao avançar, o leitor de tela lê a tela nova sem o foco sair do botão. */}
        <div aria-live="polite">
          <h2 className="titulo">{tela.titulo}</h2>
          <p>{tela.texto}</p>
          <ul className="lista-simples exemplos">
            {tela.exemplos.map((e) => (
              <li key={e.texto}>
                <code>{e.texto}</code> <Simbolo c="→" diz="vira" />
                {e.resultado}
              </li>
            ))}
          </ul>
        </div>
        <p className="motivo">{ERROU}</p>
        {fim && <Experimente />}
        <div className="pontinhos" role="img" aria-label={`Tela ${i + 1} de ${TUTORIAL.length}`}>
          {TUTORIAL.map((t, j) => (
            <span key={t.titulo} className={j === i ? 'ativo' : ''} />
          ))}
        </div>
        <div className="linha">
          {fim ? (
            <Botao variante="acento" autoFocus onClick={fechar}>
              Entendi
            </Botao>
          ) : (
            <>
              <Botao variante="acento" autoFocus onClick={() => setI(i + 1)}>
                Continuar
              </Botao>
              <button className="discreto" onClick={fechar}>
                Pular
              </button>
            </>
          )}
        </div>
      </div>
      {/* Tocar fora fecha: um botão de verdade cobrindo o fundo, alcançável por teclado e leitor de tela. */}
      <button type="button" className="fundo-fechar" aria-label="Fechar o tutorial" onClick={fechar} />
    </dialog>
  )
}
