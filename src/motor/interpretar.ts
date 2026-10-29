import { aplicarRegras, type Classe, type Interpretacao } from './regras.ts'

export type Decisao = { criar: Interpretacao } | { caixa: true; sugestao?: Classe }

export interface OpcoesMotor {
  /** Ajustes → Organizar capturas automaticamente. Desligado, o motor só sugere. */
  automatico?: boolean
  horaLembrete?: number
}

/**
 * Decide o destino de uma captura: criar o item na hora ou guardar na Caixa.
 * Regras primeiro, sempre. A rede neural entra aqui na fase 2, só para o que as regras deixam em aberto.
 */
export function decidir(texto: string, agora: Date, { automatico = true, horaLembrete = 9 }: OpcoesMotor = {}): Decisao {
  const r = aplicarRegras(texto, agora, horaLembrete)
  if (!r) return { caixa: true }
  if (!automatico || r.falta) return { caixa: true, sugestao: r.classe }
  return { criar: r }
}
