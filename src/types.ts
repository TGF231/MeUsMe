export type Energia = 1 | 2 | 3 // 1 = baixa, 2 = média, 3 = alta

export interface Captura {
  id: string
  texto: string
  criadoEm: number
}

export interface Projeto {
  id: string
  titulo: string
  /** Como eu sei que terminou? Definido no começo, enquanto ainda há energia. */
  chegada: string
  criadoEm: number
  concluidoEm?: number
}

export interface Passo {
  id: string
  projetoId: string | null
  /** Uma ação física e concreta, não uma ideia. */
  texto: string
  energia: Energia
  ordem: number
  criadoEm: number
  feitoEm?: number
}

export interface Ideia {
  id: string
  texto: string
  projetoId: string | null
  criadoEm: number
}

export interface Sessao {
  id: string
  passoId: string
  inicio: number
  fim?: number
}

export interface CheckIn {
  /** AAAA-MM-DD */
  dia: string
  humor: 1 | 2 | 3 | 4 | 5
  energia: Energia
  frase: string
}

// ── Finanças ── valores sempre em centavos inteiros.

export interface Conta {
  id: string
  nome: string
  saldoInicial: number
}

export interface Categoria {
  id: string
  nome: string
  tipo: 'gasto' | 'receita'
  /** Limite mensal, em centavos. */
  orcamento?: number
}

export interface Transacao {
  id: string
  contaId: string
  categoriaId: string | null
  /** Negativo = saiu dinheiro, positivo = entrou. */
  valor: number
  descricao: string
  /** AAAA-MM-DD */
  data: string
  criadoEm: number
  /** Impressão digital de uma linha importada de extrato, para não duplicar. */
  chaveImport?: string
  fixaId?: string
}

/** Conta que se repete todo mês: aluguel, internet, salário… */
export interface ContaFixa {
  id: string
  nome: string
  /** Sempre positivo; o sentido vem de `tipo`. */
  valor: number
  dia: number
  tipo: 'gasto' | 'receita'
  categoriaId: string | null
  contaId: string
}

// ── Agenda ──

export interface Evento {
  id: string
  titulo: string
  inicio: number
  fim: number
  diaInteiro?: boolean
  origem: 'local' | 'google'
  googleId?: string
  /** Horário reservado para um passo específico. */
  passoId?: string
}

export interface Lembrete {
  id: string
  texto: string
  quando: number
  repetir: 'nunca' | 'diario' | 'semanal' | 'mensal'
  concluido?: boolean
}
