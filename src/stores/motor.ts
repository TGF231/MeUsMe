import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { carregarRede } from '../motor/carregar'
import { acrescentar, RETREINAR_A_CADA, retreinarUltimaCamada, type CamadaPessoal, type ExemploPessoal } from '../motor/pessoal'
import type { Classe } from '../motor/regras'

interface Estado {
  /** Como você organizou cada captura na Caixa. Só neste aparelho: não sincroniza nem vai para o backup. */
  exemplos: ExemploPessoal[]
  pessoal: CamadaPessoal | null
  registrar: (texto: string, classe: Classe) => void
  esquecer: () => void
}

let retreinando = false

/** O que o motor aprendeu com você (docs/MOTOR.md, parte 3). */
export const useMotor = create<Estado>()(
  persist(
    (set, get) => ({
      exemplos: [],
      pessoal: null,

      registrar: (texto, classe) => {
        if (!texto.trim()) return
        set((s) => ({ exemplos: acrescentar(s.exemplos, { texto: texto.trim(), classe, em: Date.now() }) }))
        const { exemplos, pessoal } = get()
        if (retreinando || exemplos.length - (pessoal?.exemplos ?? 0) < RETREINAR_A_CADA) return
        retreinando = true
        // Fora do clique: o retreino leva uma fração de segundo, mas não precisa atrasar a tela.
        setTimeout(() => {
          void carregarRede()
            .then((base) => {
              if (!base?.hashDados) return
              const atuais = get().exemplos
              set({ pessoal: { hashDados: base.hashDados, ...retreinarUltimaCamada(base.rede, atuais, base.revisao), exemplos: atuais.length } })
            })
            .finally(() => {
              retreinando = false
            })
        }, 0)
      },
      esquecer: () => set({ exemplos: [], pessoal: null }),
    }),
    { name: 'meusme-motor', version: 1 },
  ),
)
