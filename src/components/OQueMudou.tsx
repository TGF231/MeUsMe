import { useJanelaModal } from '../hooks'
import { novidadesPendentes } from '../novidades'
import { useConfig } from '../stores/config'
import { Botao } from '../tema/megui-react.mjs'

/** "O que mudou" (D16 em docs/CONCORRENTES.md): uma vez por versão, fecha com Esc ou "Entendi". */
export function OQueMudou({ onFechar }: Readonly<{ onFechar: () => void }>) {
  const janela = useJanelaModal()
  const { versaoVista, introducaoVista } = useConfig.getState()
  const lista = novidadesPendentes(versaoVista, introducaoVista, __VERSAO__)
  const fechar = () => {
    useConfig.getState().ajustar({ versaoVista: __VERSAO__ })
    onFechar()
  }

  return (
    <dialog
      ref={janela}
      className="fundo"
      aria-labelledby="o-que-mudou"
      onCancel={(e) => {
        e.preventDefault()
        fechar()
      }}
    >
      <div className="modal">
        <h2 id="o-que-mudou" className="titulo">
          O que mudou
        </h2>
        {lista.map((n) => (
          <section key={n.versao}>
            <p className="rotulo">Versão {n.versao}</p>
            <ul className="lista-simples">
              {n.itens.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          </section>
        ))}
        <p className="motivo">Tudo continua no mesmo lugar. O que é novo pode ser ignorado.</p>
        <Botao variante="acento" autoFocus onClick={fechar}>
          Entendi
        </Botao>
      </div>
    </dialog>
  )
}
