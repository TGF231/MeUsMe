import { pendentes } from './calculos.ts'
import type { Energia, Passo, Projeto } from './types'

export interface Escolha {
  passo: Passo
  projeto: Projeto | null
  restantes: number
  /** Texto exibido explicando a escolha. */
  motivo: string
  acimaDaEnergia: boolean
}

/**
 * Escolhe o próximo passo. Critérios, em ordem:
 * 1. Só o primeiro passo pendente de cada projeto concorre.
 * 2. Projeto em foco tem prioridade.
 * 3. Projetos com menos passos restantes vêm antes.
 * 4. Passos acima da energia informada são descartados, salvo se não houver alternativa.
 *
 * `pulados` ("Agora não") tira o projeto da vez; `reservados` (horário marcado mais tarde) só
 * tira aquele passo, e o seguinte do mesmo projeto concorre no lugar.
 */
export function escolherPasso(
  projetos: Projeto[],
  passos: Passo[],
  focoId: string | null,
  energia: Energia,
  pulados: Set<string>,
  reservados: Set<string> = new Set(),
): Escolha | null {
  const candidatos: Omit<Escolha, 'acimaDaEnergia'>[] = []

  for (const projeto of projetos.filter((p) => !p.concluidoEm)) {
    const fila = pendentes(passos, projeto.id)
    const proximo = fila.find((p) => !reservados.has(p.id))
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
    if (pulados.has(passo.id) || reservados.has(passo.id)) continue
    candidatos.push({ passo, projeto: null, restantes: 1, motivo: 'Tarefa solta, rápida de tirar da frente.' })
  }

  if (candidatos.length === 0) return null

  const pontuar = (c: Omit<Escolha, 'acimaDaEnergia'>) =>
    (c.projeto?.id === focoId ? 1000 : 0) +
    // 100/restantes: projeto com até 4 passos restantes supera tarefa solta (25).
    (c.projeto ? 100 / c.restantes : 25) +
    // Bônus por idade (até 30) para itens antigos não ficarem sem ser escolhidos.
    Math.min(30, (Date.now() - c.passo.criadoEm) / 86_400_000)

  const ordenados = [...candidatos].sort((a, b) => pontuar(b) - pontuar(a))
  const cabe = ordenados.find((c) => c.passo.energia <= energia)
  if (cabe) return { ...cabe, acimaDaEnergia: false }

  const maisLeve = [...ordenados].sort((a, b) => a.passo.energia - b.passo.energia)[0]
  return { ...maisLeve, acimaDaEnergia: true }
}
