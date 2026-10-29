import { lerData, lerDinheiro, lerHora, limparTitulo, resolverQuando, type Trecho } from './extratores.ts'

/**
 * As quatro regras do tutorial (docs/MOTOR.md), em ordem de precedência. O que o tutorial
 * ensina funciona sempre: aqui não há palpite. A rede (fase 2) só decide o que sobra.
 */

export type Classe = 'compromisso' | 'lembrete' | 'despesa' | 'receita' | 'passo' | 'ideia' | 'compra'

export interface Interpretacao {
  classe: Classe
  titulo: string
  /** O trecho que disparou a regra ("13:00", "-R$ 35", "lembrar"), em negrito no aviso. */
  motivo: string
  /** Compromisso e lembrete. */
  quando?: number
  /** Centavos, com sinal: negativo é saída. */
  valor?: number
  /** O que falta para criar sozinho; sem isso, vai para a Caixa com sugestão. */
  falta?: 'quando' | 'direcao'
}

// Regra 1. "lembrar de", "lembra", "me lembre de", "lembrete:"
const LEMBRAR = /(?<![\wÀ-ÿ])(?:me\s+)?lembr(?:ar|a|e|ete)(?:-me)?(?:\s+de)?(?![\wÀ-ÿ]):?/i

export function aplicarRegras(texto: string, agora: Date, horaLembrete = 9): Interpretacao | null {
  const t = texto.trim()

  const lembrar = t.match(LEMBRAR)
  if (lembrar?.index !== undefined) {
    const usado: Trecho = { inicio: lembrar.index, fim: lembrar.index + lembrar[0].length, trecho: lembrar[0] }
    const data = lerData(t, agora)
    const hora = lerHora(t)
    const quando = resolverQuando(data, hora, agora, horaLembrete)
    return {
      classe: 'lembrete',
      titulo: limparTitulo(t, [usado, data, hora]) || 'Lembrete',
      motivo: usado.trecho.replace(/:$/, ''),
      ...(quando ? { quando } : { falta: 'quando' }),
    }
  }

  // Regra 2. Dinheiro começa com - ou + ("-35 almoço"); R$, "reais" e centavos também valem.
  const dinheiro = lerDinheiro(t)
  if (dinheiro) {
    const entrada = dinheiro.direcao === 'entrada'
    return {
      classe: entrada ? 'receita' : 'despesa',
      titulo: dinheiro.descricao,
      motivo: dinheiro.trecho,
      valor: entrada ? dinheiro.valor : -dinheiro.valor,
      ...(dinheiro.direcao ? {} : { falta: 'direcao' }),
    }
  }

  // Regra 3. Hora vira compromisso.
  const hora = lerHora(t)
  if (hora) {
    const data = lerData(t, agora)
    return {
      classe: 'compromisso',
      titulo: limparTitulo(t, [data, hora]) || 'Compromisso',
      motivo: hora.trecho,
      quando: resolverQuando(data, hora, agora) ?? undefined,
    }
  }

  // Regra 4. O resto, a Caixa guarda.
  return null
}
