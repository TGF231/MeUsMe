import type { Interpretacao } from './regras.ts'

/**
 * O tutorial "Como escrever rápido". A tela mostra estes exemplos e testes/motor-tutorial.test.ts
 * passa cada um pelo motor: se uma regra mudar e quebrar o que o tutorial promete, o teste falha.
 */

export interface ExemploTutorial {
  texto: string
  /** O que a tela mostra como resultado. */
  resultado: string
  /** O que o motor tem que devolver; null quando a promessa é "fica na Caixa". */
  espera: Pick<Interpretacao, 'classe' | 'titulo'> & Partial<Pick<Interpretacao, 'valor'>> | null
}

export interface TelaTutorial {
  titulo: string
  texto: string
  exemplos: ExemploTutorial[]
}

export const TUTORIAL: TelaTutorial[] = [
  {
    titulo: '“Lembrar” vira lembrete',
    texto: 'Comece com “lembrar de” e diga quando. Sem hora, fica para as 9h.',
    exemplos: [{ texto: 'lembrar de pagar a luz sexta', resultado: 'Lembrete na sexta, às 9h', espera: { classe: 'lembrete', titulo: 'Pagar a luz' } }],
  },
  {
    titulo: 'Dinheiro começa com - ou +',
    texto: 'Menos para o que saiu, mais para o que entrou, colado no número. Não precisa de R$. Falando: “menos 35 reais almoço”.',
    exemplos: [
      { texto: '-35 almoço', resultado: 'Gasto de R$ 35,00', espera: { classe: 'despesa', titulo: 'almoço', valor: -3500 } },
      { texto: '+1000 tv', resultado: 'Entrada de R$ 1.000,00', espera: { classe: 'receita', titulo: 'tv', valor: 100000 } },
    ],
  },
  {
    titulo: 'Hora vira compromisso',
    texto: 'Escreva a hora junto: 13:00, 15h ou “às 3 da tarde”. Sem dia, é hoje (ou amanhã, se a hora já passou).',
    exemplos: [
      { texto: 'dentista 13:00', resultado: 'Compromisso às 13:00', espera: { classe: 'compromisso', titulo: 'Dentista' } },
      { texto: 'reunião amanhã 15h', resultado: 'Compromisso amanhã, às 15:00', espera: { classe: 'compromisso', titulo: 'Reunião' } },
    ],
  },
  {
    titulo: 'O resto, a Caixa guarda',
    texto: 'Sem essas marcas, o app tenta entender pelo jeito da frase. Sem certeza, guarda na Caixa, já com o tipo provável na frente.',
    exemplos: [{ texto: 'ver aquele negócio do carro', resultado: 'Fica na Caixa, ou vira tarefa se o app tiver certeza', espera: null }],
  },
]

export const ERROU = 'Errou? Toque em Desfazer: o texto volta para a Caixa.'

/** Um exemplo por regra, para o campo de captura ir lembrando o tutorial. */
export const EXEMPLOS_DE_CAMPO = TUTORIAL.slice(0, 3).flatMap((t) => t.exemplos.map((e) => e.texto))
