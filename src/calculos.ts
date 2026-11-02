import type { Captura, Lembrete, Passo, Sessao } from './types'

/** Cálculos puros usados pelas telas (testados em testes/calculos.test.ts). */

const DIA = 86_400_000

/**
 * Próxima vez de um lembrete que se repete, depois de `agora`. O mensal mantém o dia pretendido:
 * "todo dia 31" cai em 30/11 e 28/02, e volta a 31/12 e 31/03, em vez de escorregar para o dia 1.
 */
export function proximaOcorrencia(l: Pick<Lembrete, 'quando' | 'repetir' | 'dia'>, agora = Date.now()) {
  const d = new Date(l.quando)
  const dia = l.dia ?? d.getDate()
  do {
    if (l.repetir === 'diario') d.setDate(d.getDate() + 1)
    else if (l.repetir === 'semanal') d.setDate(d.getDate() + 7)
    else if (l.repetir === 'mensal') {
      const proximoMes = d.getMonth() + 1
      d.setDate(1)
      d.setMonth(proximoMes)
      d.setDate(Math.min(dia, new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()))
    } else break
  } while (d.getTime() <= agora)
  return d.getTime()
}

/** Passos pendentes de um projeto (ou soltos, com null), ordenados. */
export const pendentes = (passos: Passo[], projetoId: string | null) =>
  passos.filter((p) => p.projetoId === projetoId && !p.feitoEm).sort((a, b) => a.ordem - b.ordem)

/** Dias de `de` até `dia` (datas AAAA-MM-DD); negativo quando `dia` já passou. Meio-dia evita o salto do horário de verão. */
export const diasAte = (dia: string, de: string) =>
  Math.round((Date.parse(`${dia}T12:00:00`) - Date.parse(`${de}T12:00:00`)) / DIA)

/** Soma dias a uma data AAAA-MM-DD. */
export function somarDias(dia: string, n: number) {
  const d = new Date(`${dia}T12:00:00`)
  d.setDate(d.getDate() + n)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Próxima data de um passo que se repete, contada a partir do dia em que foi feito. O mensal vai para o último dia dos meses curtos. */
export function proximaRepeticao(repetir: NonNullable<Passo['repetir']>, dia: string) {
  if (repetir === 'diario') return somarDias(dia, 1)
  if (repetir === 'semanal') return somarDias(dia, 7)
  const [a, m, d] = dia.split('-').map(Number)
  const ultimo = new Date(a, m + 1, 0).getDate()
  const proximo = new Date(a, m, Math.min(d, ultimo), 12)
  return `${proximo.getFullYear()}-${String(proximo.getMonth() + 1).padStart(2, '0')}-${String(proximo.getDate()).padStart(2, '0')}`
}

/** Passos pendentes com prazo antes de `dia`, do mais antigo para o mais novo. */
export const vencidos = (passos: Passo[], dia: string) =>
  passos.filter((p) => !p.feitoEm && p.prazo && p.prazo < dia).sort((a, b) => a.prazo!.localeCompare(b.prazo!) || a.ordem - b.ordem)

/**
 * Novas datas para os vencidos, em lote: a partir de amanhã, no máximo `porDia` por dia, na ordem do prazo antigo.
 * Espalhar evita trocar uma pilha de atrasados por uma pilha de "hoje".
 */
export function sugerirNovasDatas(vencidosOrdenados: Passo[], dia: string, porDia = 2) {
  return vencidosOrdenados.map((p, i) => ({ id: p.id, prazo: somarDias(dia, 1 + Math.floor(i / porDia)) }))
}

/**
 * Ordem para um passo novo logo antes de `alvo`, depois de qualquer outro já inserido ali: quebrar um passo em
 * vários pedaços mantém os pedaços na ordem em que foram escritos.
 */
export function ordemAntesDe(passos: Passo[], alvo: Passo) {
  const anteriores = passos.filter((p) => p.projetoId === alvo.projetoId && p.ordem < alvo.ordem).map((p) => p.ordem)
  const anterior = Math.max(alvo.ordem - 1, ...anteriores)
  return (anterior + alvo.ordem) / 2
}

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

/** Capturas paradas na Caixa há `dias` dias ou mais (D09), da mais antiga para a mais nova. */
export const paradas = <T extends Pick<Captura, 'criadoEm' | 'adiadaEm'>>(capturas: T[], agora = Date.now(), dias = 30) =>
  capturas.filter((c) => diasDesde(c.adiadaEm ?? c.criadoEm, agora) >= dias).sort((a, b) => (a.adiadaEm ?? a.criadoEm) - (b.adiadaEm ?? b.criadoEm))

const MARCOS = [10, 50, 100, 250, 500, 1000, 2500, 5000]

/**
 * Marcos reais e raros (D12 em docs/CONCORRENTES.md): o primeiro passo e os totais de MARCOS, sem pontos, níveis
 * nem sequência. Recebe quantos passos já foram feitos contando o de agora; null quando não é um marco.
 */
export function marcoDePassos(feitos: number) {
  if (feitos === 1) return 'O primeiro passo feito no MeUsMe.'
  return MARCOS.includes(feitos) ? `${feitos} passos feitos desde o começo.` : null
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

/** Texto comparável: sem acento, minúsculo e com espaços simples. */
export const normalizar = (texto: string) =>
  texto.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().replace(/\s+/g, ' ').trim()

export interface Sugestao {
  texto: string
  energia: Passo['energia']
}

/**
 * Passos já escritos antes, para reaproveitar sem digitar.
 * Com `busca` vazia, devolve os mais repetidos e recentes; com busca, os que contêm o trecho.
 * Pula o que já está na fila do mesmo projeto e dá preferência aos passos do próprio projeto.
 */
export function sugestoesDePasso(passos: Passo[], busca: string, projetoId: string | null, limite = 4): Sugestao[] {
  const trecho = normalizar(busca)
  const naFila = new Set(pendentes(passos, projetoId).map((p) => normalizar(p.texto)))
  const grupos = new Map<string, { sugestao: Sugestao; vezes: number; ultimo: number; doProjeto: boolean }>()
  for (const p of passos) {
    const chave = normalizar(p.texto)
    if (!chave || naFila.has(chave) || chave === trecho || !chave.includes(trecho)) continue
    const quando = p.feitoEm ?? p.criadoEm
    const g = grupos.get(chave)
    if (!g) grupos.set(chave, { sugestao: { texto: p.texto, energia: p.energia }, vezes: 1, ultimo: quando, doProjeto: p.projetoId === projetoId })
    else {
      g.vezes++
      g.doProjeto ||= p.projetoId === projetoId
      // O texto e a energia vêm da vez mais recente.
      if (quando > g.ultimo) Object.assign(g, { sugestao: { texto: p.texto, energia: p.energia }, ultimo: quando })
    }
  }
  return [...grupos.values()]
    .sort((a, b) => Number(b.doProjeto) - Number(a.doProjeto) || b.vezes - a.vezes || b.ultimo - a.ultimo)
    .slice(0, limite)
    .map((g) => g.sugestao)
}

/** Passos de um projeto na ordem em que foram (ou serão) feitos, sem repetidos, para virar modelo. */
export function passosParaModelo(passos: Passo[], projetoId: string): Sugestao[] {
  const feitos = passos.filter((p) => p.projetoId === projetoId && p.feitoEm).sort((a, b) => a.feitoEm! - b.feitoEm!)
  const vistos = new Set<string>()
  return [...feitos, ...pendentes(passos, projetoId)]
    .filter((p) => !vistos.has(normalizar(p.texto)) && vistos.add(normalizar(p.texto)))
    .map((p) => ({ texto: p.texto, energia: p.energia }))
}
