import { create } from 'zustand'
import { createJSONStorage, type StateStorage } from 'zustand/middleware'
import { registrarErro } from './erros.ts'

/**
 * Gravação segura no localStorage para as lojas persistidas.
 *
 * Sem isto, quando o espaço acaba (cerca de 5 MB por site) ou o navegador bloqueia o armazenamento (aba anônima,
 * cota do sistema), o setItem lança erro dentro do set() da loja: a ação que o usuário fez quebra no meio, e o que
 * ficou na memória some ao recarregar, sem aviso. Aqui a falha é pega, vai para o registro de erros e acende
 * `useGravacao.falhou`, que o App transforma em aviso. Na próxima gravação que der certo, o estado volta ao normal.
 */
export const useGravacao = create<{ falhou: boolean; quando: number | null }>()(() => ({ falhou: false, quando: null }))

export const armazenamentoSeguro: StateStorage = {
  getItem: (chave) => {
    try {
      return localStorage.getItem(chave)
    } catch {
      return null
    }
  },
  setItem: (chave, valor) => {
    try {
      localStorage.setItem(chave, valor)
      if (useGravacao.getState().falhou) useGravacao.setState({ falhou: false, quando: null })
    } catch (e) {
      // Um aviso por falha nova, não um a cada gravação enquanto o espaço continua cheio.
      if (!useGravacao.getState().falhou) {
        registrarErro(e, `gravacao:${chave}`)
        useGravacao.setState({ falhou: true, quando: Date.now() })
      }
    }
  },
  removeItem: (chave) => {
    try {
      localStorage.removeItem(chave)
    } catch {
      /* nada a fazer */
    }
  },
}

/** O `storage` das lojas persistidas: JSON no armazenamento seguro. */
export const armazenar = <S>() => createJSONStorage<S>(() => armazenamentoSeguro)
