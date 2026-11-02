/**
 * Colar um texto longo e separar em itens (V04 em docs/CONCORRENTES.md): uma lista, uma ata ou uma conversa
 * vira uma captura por linha; um parágrafo só, uma por frase. Marcadores de lista ("-", "*", "•", "1.", "[ ]")
 * saem do começo. Até 50 itens, para uma colagem enorme não encher a Caixa.
 */
export const MAX_ITENS = 50

const MARCADOR = /^\s*(?:[-*•–]\s+|\d{1,3}[.)]\s+|\[[ xX]?\]\s+)+/

export function dividirEmItens(texto: string): string[] {
  const linhas = texto
    .split(/\r?\n/)
    .map((l) => l.replace(MARCADOR, '').trim())
    .filter(Boolean)
  const itens = linhas.length > 1 ? linhas : (linhas[0] ?? '').split(/(?<=[.!?])\s+(?=[A-ZÀ-Ú0-9])/).map((f) => f.trim())
  return itens.filter(Boolean).slice(0, MAX_ITENS)
}
