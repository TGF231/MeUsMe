import { Component, type ReactNode } from 'react'
import { registrarErro } from '../erros'
import { Botao } from '../tema/megui-react.mjs'

/** Erro durante o render: mostra uma tela calma em vez da página em branco. Os dados já estão salvos. */
export class LimiteDeErro extends Component<{ children: ReactNode }, { erro: Error | null }> {
  state = { erro: null as Error | null }

  static getDerivedStateFromError(erro: Error) {
    return { erro }
  }

  componentDidCatch(erro: Error) {
    registrarErro(erro, 'tela')
  }

  render() {
    if (!this.state.erro) return this.props.children
    return (
      <section className="tela centro">
        <div className="cartao celebra">
          <p className="grande">Algo deu errado.</p>
          <p>Seus dados estão salvos neste aparelho. Recarregar costuma resolver.</p>
          <div className="linha centralizada">
            <Botao variante="acento" onClick={() => location.reload()}>
              Recarregar
            </Botao>
            <button onClick={() => this.setState({ erro: null })}>Tentar continuar</button>
          </div>
          <p className="motivo">O erro ficou anotado em Ajustes → Sobre, se precisar mostrar para o suporte.</p>
        </div>
      </section>
    )
  }
}
