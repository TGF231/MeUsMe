import type { Passo, Sessao } from './types'

/** Cálculos puros usados pelas telas (testados em testes/calculos.test.ts). */

const DIA = 86_400_000

/** Passos pendentes de um projeto (ou soltos, com null), ordenados. */
export const pendentes = (passos: Passo[], projetoId: string | null) =>
  passos.filter((p) => p.projetoId === projetoId && !p.feitoEm).sort((a, b) => a.ordem - b.ordem)

/** Minutos gastos: sessões do cronômetro + minutosManuais. */
export const minutosDoPasso = (passo: Passo, sessoes: Sessao[], agora = Date.now()) =>
  sessoes.filter((x) => x.passoId === passo.id).reduce((t, x) => t + ((x.fim ?? agora) - x.inicio) / 60_000, 0) +
  (passo.minutosManuais ?? 0)

/** Passos feitos e total do projeto, para a barra de progresso (o feito conta desde o início). */
export function progresso(passos: Passo[], projetoId: string) {
  const doProjeto = passos.filter((p) => p.projetoId === projetoId)
  const feitos = doProjeto.filter((p) => p.feitoEm).length
  return { feitos, total: doProjeto.length, fracao: doProjeto.length ? feitos / doProjeto.length : 0 }
}

/**
 * Quanto o tempo real costuma ficar acima (ou abaixo) do palpite.
 * Usa a mediana de real/estimado dos passos concluídos com as duas medidas, para um passo esquecido
 * com o cronômetro ligado não distorcer tudo.
 */
export function calibracao(passos: Passo[], sessoes: Sessao[]) {
  const razoes = passos
    .filter((p) => p.feitoEm && p.estimativaMin && p.estimativaMin > 0)
    .map((p) => ({ real: minutosDoPasso(p, sessoes, p.feitoEm), estimado: p.estimativaMin! }))
    .filter((x) => x.real >= 1)
    .map((x) => x.real / x.estimado)
    .sort((a, b) => a - b)
  if (razoes.length === 0) return null
  const meio = Math.floor(razoes.length / 2)
  const mediana = razoes.length % 2 ? razoes[meio] : (razoes[meio - 1] + razoes[meio]) / 2
  return { passos: razoes.length, fator: mediana }
}

/** Frase neutra sobre um fator de calibração: sem julgar, só informar. */
export function explicarFator(fator: number) {
  if (fator >= 1.15) return `Na prática, seus passos levam ${fator.toFixed(1).replace('.', ',')}× o que você imagina. Vale reservar mais tempo.`
  if (fator <= 0.85) return `Seus passos costumam levar menos do que você imagina (${Math.round(fator * 100)}% do palpite).`
  return 'Seus palpites de tempo estão bem perto do real.'
}

/** Último uso do app: passo feito, sessão, captura ou check-in. */
export function ultimaAtividade(dados: {
  passos: Passo[]
  sessoes: Sessao[]
  capturas: { criadoEm: number }[]
  checkins: { dia: string }[]
}) {
  let ultima = 0
  for (const p of dados.passos) ultima = Math.max(ultima, p.feitoEm ?? 0, p.criadoEm)
  for (const s of dados.sessoes) ultima = Math.max(ultima, s.fim ?? s.inicio)
  for (const c of dados.capturas) ultima = Math.max(ultima, c.criadoEm)
  for (const c of dados.checkins) ultima = Math.max(ultima, new Date(`${c.dia}T12:00:00`).getTime())
  return ultima || null
}

/** Dias inteiros desde `desde` (0 se for hoje). */
export const diasDesde = (desde: number, agora = Date.now()) => {
  const inicio = (t: number) => new Date(t).setHours(0, 0, 0, 0)
  return Math.round((inicio(agora) - inicio(desde)) / DIA)
}

/** A revisão semanal está pendente: feita (ou pulada) antes do início da semana atual. diaRevisao -1 desliga. */
export const revisaoPendente = (agora: number, diaRevisao: number, revisaoFeitaEm: number) =>
  diaRevisao >= 0 && revisaoFeitaEm < inicioDaSemana(agora, diaRevisao)

/** Início (00:00 local) da semana de `t`, começando no dia `diaInicio` (0 = domingo). */
export function inicioDaSemana(t: number, diaInicio: number) {
  const d = new Date(t)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - ((d.getDay() - diaInicio + 7) % 7))
  return d.getTime()
}
