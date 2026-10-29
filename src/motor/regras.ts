import {
  lerData,
  lerDataPassada,
  lerDinheiro,
  lerHora,
  lerIntervalo,
  lerPeriodo,
  lerRepeticao,
  limparTitulo,
  proximoDiaDaSemana,
  resolverQuando,
  type Repetir,
  type Trecho,
} from './extratores.ts'

/**
 * As regras do tutorial (docs/MOTOR.md), em ordem de precedência. O que o tutorial ensina
 * funciona sempre: aqui não há palpite. A rede (fase 2) só decide o que sobra.
 *
 * Além das quatro do tutorial, há variações aceitas mas não ensinadas: repetição ("toda
 * segunda", "todo dia 10"), período sem hora ("amanhã de manhã"), intervalo ("das 14h às 16h")
 * e "ontem" num lançamento.
 */

export type Classe = 'compromisso' | 'lembrete' | 'despesa' | 'receita' | 'passo' | 'ideia' | 'compra'

export interface Interpretacao {
  classe: Classe
  titulo: string
  /** O trecho que disparou a regra ("13:00", "-35", "lembrar"), em negrito no aviso. */
  motivo: string
  /** Compromisso e lembrete. */
  quando?: number
  /** Fim do compromisso, quando o texto diz ("das 14h às 16h"). */
  fim?: number
  /** Lembrete que se repete. */
  repetir?: Repetir
  /** Centavos, com sinal: negativo é saída. */
  valor?: number
  /** Dia do lançamento (AAAA-MM-DD), quando não é hoje ("ontem"). */
  data?: string
  /** O que falta para criar sozinho; sem isso, vai para a Caixa com sugestão. */
  falta?: 'quando' | 'direcao'
}

// Regra 1. "lembrar de", "lembra", "me lembre de", "lembrete:"
const LEMBRAR = /(?<![\wÀ-ÿ])(?:me\s+)?lembr(?:ar|a|e|ete)(?:-me)?(?:\s+de)?(?![\wÀ-ÿ]):?/i

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

/** Lembrete a partir do texto: data, hora (ou período) e repetição. */
function lembrete(t: string, agora: Date, horaLembrete: number, motivo: Trecho): Interpretacao {
  const repeticao = lerRepeticao(t)
  const data = lerData(t, agora) ?? (repeticao?.diaDaSemana !== undefined ? proximoDiaDaSemana(repeticao.diaDaSemana, agora) : null)
  const hora = lerHora(t) ?? lerPeriodo(t)
  // Com repetição, sem data nem hora ("tomar água todo dia"), começa na próxima hora padrão.
  const padrao = repeticao && !data && !hora ? { inicio: 0, fim: 0, trecho: '', h: horaLembrete, m: 0 } : null
  const quando = resolverQuando(data, hora ?? padrao, agora, horaLembrete)
  return {
    classe: 'lembrete',
    titulo: limparTitulo(t, [motivo, data, hora, repeticao]) || 'Lembrete',
    motivo: motivo.trecho.replace(/:$/, ''),
    ...(repeticao && { repetir: repeticao.repetir }),
    ...(quando ? { quando } : { falta: 'quando' }),
  }
}

export function aplicarRegras(texto: string, agora: Date, horaLembrete = 9): Interpretacao | null {
  const t = texto.trim()

  const lembrar = t.match(LEMBRAR)
  if (lembrar?.index !== undefined) return lembrete(t, agora, horaLembrete, { inicio: lembrar.index, fim: lembrar.index + lembrar[0].length, trecho: lembrar[0] })

  // Regra 2. Dinheiro começa com - ou + ("-35 almoço"); R$, "reais" e centavos também valem.
  const dinheiro = lerDinheiro(t)
  if (dinheiro) {
    const entrada = dinheiro.direcao === 'entrada'
    const passado = lerDataPassada(dinheiro.descricao, agora)
    return {
      classe: entrada ? 'receita' : 'despesa',
      titulo: passado ? limparTitulo(dinheiro.descricao, [passado]).replace(/^./, (c) => c.toLowerCase()) : dinheiro.descricao,
      motivo: dinheiro.trecho,
      valor: entrada ? dinheiro.valor : -dinheiro.valor,
      ...(passado && { data: iso(passado.dia) }),
      ...(dinheiro.direcao ? {} : { falta: 'direcao' }),
    }
  }

  // Variação: repetição vira lembrete que se repete. Compromissos ainda não se repetem, e
  // "academia toda segunda 7h" precisa avisar toda semana, não só na próxima.
  const repeticao = lerRepeticao(t)
  if (repeticao) return lembrete(t, agora, horaLembrete, repeticao)

  // Regra 3. Hora vira compromisso; com intervalo ("das 14h às 16h"), com o fim.
  const intervalo = lerIntervalo(t)
  const hora = intervalo?.inicio ?? lerHora(t)
  if (hora) {
    const data = lerData(t, agora)
    const quando = resolverQuando(data, hora, agora) ?? undefined
    let fim: number | undefined
    if (intervalo && quando) {
      const d = new Date(quando)
      fim = new Date(d.getFullYear(), d.getMonth(), d.getDate(), intervalo.fim.h, intervalo.fim.m).getTime()
      if (fim <= quando) fim += 86_400_000 // "22h às 1h" termina no dia seguinte
    }
    return {
      classe: 'compromisso',
      titulo: limparTitulo(t, [data, intervalo?.trecho ?? hora]) || 'Compromisso',
      motivo: hora.trecho,
      quando,
      ...(fim && { fim }),
    }
  }

  // Regra 4. O resto, a Caixa guarda.
  return null
}
