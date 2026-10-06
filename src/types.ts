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
