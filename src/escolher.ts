import { pendentes } from './store'
import type { Energia, Passo, Projeto } from './types'

export interface Escolha {
  passo: Passo
  projeto: Projeto | null
  restantes: number
  /** Por que este passo, em linguagem humana. */
  motivo: string
  acimaDaEnergia: boolean
}

/**
 * Decide por você qual é o próximo passo, para que a prioridade não dependa do humor do momento.
 *
 * Regras, nesta ordem:
 * 1. Só o próximo passo de cada projeto entra na disputa (nunca o projeto inteiro).
 * 2. O projeto em foco vence.
 * 3. Depois, o projeto mais perto da linha de chegada: terminar vale mais que começar.
 * 4. Passos acima da energia atual ficam de fora, a não ser que não sobre nada.
 */
export function escolherPasso(
  projetos: Projeto[],
  passos: Passo[],
  focoId: string | null,
  energia: Energia,
  pulados: Set<string>,
): Escolha | null {
  const candidatos: Omit<Escolha, 'acimaDaEnergia'>[] = []

  for (const projeto of projetos.filter((p) => !p.concluidoEm)) {
    const fila = pendentes(passos, projeto.id)
    const proximo = fila[0]
    if (!proximo || pulados.has(proximo.id)) continue
    const motivo =
      projeto.id === focoId
        ? 'É o seu projeto em foco.'
        : fila.length <= 3
          ? `Faltam só ${fila.length} passo${fila.length > 1 ? 's' : ''} para fechar este projeto.`
          : 'É o próximo passo deste projeto.'
    candidatos.push({ passo: proximo, projeto, restantes: fila.length, motivo })
  }

  for (const passo of pendentes(passos, null)) {
    if (pulados.has(passo.id)) continue
    candidatos.push({ passo, projeto: null, restantes: 1, motivo: 'Tarefa solta, rápida de tirar da frente.' })
  }

  if (candidatos.length === 0) return null

  const pontuar = (c: Omit<Escolha, 'acimaDaEnergia'>) =>
    (c.projeto?.id === focoId ? 1000 : 0) +
    // Projeto com até 4 passos restantes vence uma tarefa solta: o embalo não deve ser quebrado.
    (c.projeto ? 100 / c.restantes : 25) +
    // Coisas antigas sobem devagar, para nada ficar esquecido para sempre.
    Math.min(30, (Date.now() - c.passo.criadoEm) / 86_400_000)

  const ordenados = [...candidatos].sort((a, b) => pontuar(b) - pontuar(a))
  const cabe = ordenados.find((c) => c.passo.energia <= energia)
  if (cabe) return { ...cabe, acimaDaEnergia: false }

  const maisLeve = [...ordenados].sort((a, b) => a.passo.energia - b.passo.energia)[0]
  return { ...maisLeve, acimaDaEnergia: true }
}
