import { useJanelaModal } from '../hooks'
import { novidadesPendentes } from '../novidades'
import { useConfig } from '../stores/config'
import { Dialogo } from '../tema/megui-react.mjs'

/**
 * "O que mudou" (D16 em docs/CONCORRENTES.md): uma vez por versão, fecha com Esc, ✕ ou "Entendi".
 * O Dialogo do MegUI desenha a janela; o <dialog> nativo em volta segura o foco e o Esc, e por isso o Dialogo perde o papel de diálogo.
 */
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
      aria-label="O que mudou"
      onCancel={(e) => {
        e.preventDefault()
        fechar()
      }}
    >
      <Dialogo
        titulo="O que mudou"
        role="none"
        aria-modal={undefined}
        aria-label={undefined}
        className="modal-megui"
        largura="100%"
        aoFechar={fechar}
        acoes={[{ rotulo: 'Entendi', variante: 'acento', aoClicar: fechar }]}
      >
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
      </Dialogo>
    </dialog>
  )
}
