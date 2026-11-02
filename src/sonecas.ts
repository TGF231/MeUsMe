/**
 * Soneca dos lembretes (V18 em docs/CONCORRENTES.md): "Daqui a 10 min" na notificação guarda um aviso extra,
 * com chave própria, sem mexer no horário do lembrete (que pode se repetir).
 */
export interface Soneca {
  chave: string
  quando: number
  titulo: string
  corpo: string
}

export const MINUTOS_DE_SONECA = 10

/** Chave do aviso original, sem as sonecas acumuladas ("lembrete:<id>:<quando>"). */
export const chaveOriginal = (chave: string) => chave.split(':soneca:')[0]

/** Id do lembrete numa chave de aviso, ou null quando o aviso não é de lembrete. */
export function idDoLembrete(chave: string | undefined) {
  if (!chave?.startsWith('lembrete:')) return null
  return chave.split(':')[1] || null
}

/** Nova soneca a partir do aviso tocado; a lista guarda só as das últimas 24 h. */
export function adiar(sonecas: Soneca[], aviso: { chave: string; titulo: string; corpo: string }, agora: number) {
  const quando = agora + MINUTOS_DE_SONECA * 60_000
  const nova = { chave: `${chaveOriginal(aviso.chave)}:soneca:${quando}`, quando, titulo: aviso.titulo, corpo: aviso.corpo }
  return [...sonecas.filter((s) => agora - s.quando < 86_400_000), nova]
}
