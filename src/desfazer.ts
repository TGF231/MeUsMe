import type { StoreApi, UseBoundStore } from 'zustand'
import { useAvisos } from './stores/config'

/**
 * Apaga um item de uma lista da loja e avisa com Desfazer (Ctrl+Z também serve): um toque errado, comum com
 * tremor, ponteira ou acionador, não perde nada. O item volta com o mesmo id e no mesmo lugar; a sincronização
 * o envia de novo como se tivesse sido criado.
 * Só para remoções sem efeito colateral: o que apaga outra coisa junto (áudio, categoria dos lançamentos) pede confirmação.
 */
export function apagarComDesfazer<S, K extends keyof S>(loja: UseBoundStore<StoreApi<S>>, campo: K, id: string, nome: string, apagar: () => void) {
  const lista = loja.getState()[campo] as { id: string }[]
  const i = lista.findIndex((x) => x.id === id)
  const item = lista[i]
  apagar()
  if (!item) return
  useAvisos.getState().mostrar('Apagado', nome, {
    acao: {
      rotulo: 'Desfazer',
      fazer: () =>
        loja.setState((s) => {
          const atual = s[campo] as { id: string }[]
          if (atual.some((x) => x.id === id)) return {}
          const nova = [...atual]
          nova.splice(Math.min(i, nova.length), 0, item)
          return { [campo]: nova } as Partial<S>
        }),
    },
  })
}
