import { diasAte, pendentes } from './calculos.ts'
import type { Contexto, Energia, Passo, Projeto } from './types'
import { dataISO } from './util.ts'

export interface Escolha {
  passo: Passo
  projeto: Projeto | null
  restantes: number
  /** Texto exibido explicando a escolha. */
  motivo: string
  acimaDaEnergia: boolean
}

/** Frase sobre o prazo, ou null quando ele está longe (mais de 7 dias) ou não existe. */
function motivoDoPrazo(passo: Passo, dia: string) {
  if (!passo.prazo) return null
  const d = diasAte(passo.prazo, dia)
  if (d < 0) return 'O prazo já passou. Dá para fazer agora ou escolher outra data, sem pressa.'
  if (d === 0) return 'O prazo é hoje.'
  if (d === 1) return 'O prazo é amanhã.'
  return d <= 7 ? `O prazo é daqui a ${d} dias.` : null
}

/** Pontos pelo prazo: vencido conta como hoje, para atraso não virar avalanche. */
function pesoDoPrazo(passo: Passo, dia: string) {
  if (!passo.prazo) return 0
  const d = diasAte(passo.prazo, dia)
  return d <= 0 ? 80 : d === 1 ? 60 : d <= 3 ? 40 : d <= 7 ? 15 : 0
}

/** Depois de tantos "Agora não", o passo volta mais cedo e o Agora oferece uma versão menor dele. */
export const ADIAMENTOS_PARA_DIMINUIR = 3

/** Passo adiado muitas vezes sobe um pouco (20, menos que um prazo para amanhã): ele volta pequeno, não some. */
const pesoDoAdiamento = (passo: Passo) => ((passo.adiamentos ?? 0) >= ADIAMENTOS_PARA_DIMINUIR ? 20 : 0)

/**
 * Escolhe o próximo passo. Critérios, em ordem:
 * 1. Só o primeiro passo pendente de cada projeto concorre.
 * 2. Projeto em foco tem prioridade.
 * 3. Prazo perto pesa; vencido pesa como "hoje", nunca mais que isso. Passo com 3 "Agora não" ou mais pesa um pouco.
 * 4. Projetos com menos passos restantes vêm antes.
 * 5. Passos acima da energia informada são descartados, salvo se não houver alternativa.
 *
 * `pulados` tira o projeto da vez. `reservados` (horário marcado mais tarde, inclusive o do "Agora não") e passos com
 * "só a partir de" no futuro tiram só aquele passo, e o seguinte do mesmo projeto concorre no lugar. Com `contexto`
 * (trabalho ou casa), passos marcados para o outro lugar saem do mesmo jeito; passos sem lugar valem nos dois.
 */
export function escolherPasso(
  projetos: Projeto[],
  passos: Passo[],
  focoId: string | null,
  energia: Energia,
  pulados: Set<string>,
  reservados: Set<string> = new Set(),
  dia: string = dataISO(),
  contexto: Contexto | null = null,
): Escolha | null {
  const candidatos: Omit<Escolha, 'acimaDaEnergia'>[] = []
  const noLugar = (p: Passo) => !contexto || !p.contexto || p.contexto === contexto
  const disponivel = (p: Passo) => !reservados.has(p.id) && (!p.aPartirDe || p.aPartirDe <= dia) && noLugar(p)

  for (const projeto of projetos.filter((p) => !p.concluidoEm)) {
    const fila = pendentes(passos, projeto.id)
    const proximo = fila.find(disponivel)
    if (!proximo || pulados.has(proximo.id)) continue
    const prazo = motivoDoPrazo(proximo, dia)
    const motivo =
      prazo && diasAte(proximo.prazo!, dia) <= 2
        ? prazo
        : projeto.id === focoId
          ? 'É o seu projeto em foco.'
          : (prazo ??
            (fila.length <= 3
              ? `Faltam só ${fila.length} passo${fila.length > 1 ? 's' : ''} para fechar este projeto.`
              : 'É o próximo passo deste projeto.'))
    candidatos.push({ passo: proximo, projeto, restantes: fila.length, motivo })
  }

  for (const passo of pendentes(passos, null)) {
    if (pulados.has(passo.id) || !disponivel(passo)) continue
    const motivo = motivoDoPrazo(passo, dia) ?? 'Tarefa solta, rápida de tirar da frente.'
    candidatos.push({ passo, projeto: null, restantes: 1, motivo })
  }

  if (candidatos.length === 0) return null

  const pontuar = (c: Omit<Escolha, 'acimaDaEnergia'>) =>
    (c.projeto?.id === focoId ? 1000 : 0) +
    pesoDoPrazo(c.passo, dia) +
    pesoDoAdiamento(c.passo) +
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

/**
 * Passos anotados para `lugar` enquanto você estava fora dele (entre a saída e a chegada), na ordem em que foram
 * anotados. Sem saída registrada (primeira vez no lugar), não há o que mostrar.
 */
export function anotadosFora(passos: Passo[], lugar: Contexto, saiuEm: number | undefined, chegouEm: number): Passo[] {
  if (saiuEm === undefined) return []
  return passos
    .filter((p) => !p.feitoEm && p.contexto === lugar && p.criadoEm > saiuEm && p.criadoEm <= chegouEm)
    .sort((a, b) => a.criadoEm - b.criadoEm)
}
