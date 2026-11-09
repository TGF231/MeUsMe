import type { Classe } from './motor/regras'

export type Energia = 1 | 2 | 3 // 1 = baixa, 2 = média, 3 = alta

export interface Captura {
  id: string
  texto: string
  criadoEm: number
  /** Recado de voz: o áudio fica em src/audios.ts, com o id da captura, só neste aparelho. */
  audio?: { segundos: number }
  /** Tipo provável segundo o motor (docs/MOTOR.md), mostrado primeiro na Caixa. */
  sugestao?: Classe
  /** "Ainda não" na pergunta dos 30 dias parada (D09): conta de novo a partir daqui. */
  adiadaEm?: number
}

export interface Projeto {
  id: string
  titulo: string
  /** Critério de conclusão definido na criação do projeto. */
  chegada: string
  criadoEm: number
  concluidoEm?: number
}

export interface Passo {
  id: string
  projetoId: string | null
  /** Ação concreta e executável. */
  texto: string
  energia: Energia
  ordem: number
  criadoEm: number
  feitoEm?: number
  /** Minutos informados manualmente (passo concluído sem cronômetro). */
  minutosManuais?: number
  /** Palpite de duração feito antes ou durante o passo; comparado com o real no Histórico. */
  estimativaMin?: number
  /** Dia limite (AAAA-MM-DD). Pesa na escolha de Agora; vencido vira "para reagendar", nunca alerta. */
  prazo?: string
  /** Só concorre em Agora a partir deste dia (AAAA-MM-DD). */
  aPartirDe?: string
  /** Ao concluir, o passo volta sozinho, com "só a partir de" na próxima data (V08). */
  repetir?: 'diario' | 'semanal' | 'mensal'
  /** Id do passo concluído que gerou esta repetição (para "Não terminei" desfazer as duas coisas). */
  repeteDe?: string
  /** Contexto curto junto do passo (V10): link, endereço, o que não esquecer. Só texto; anexos esperam o IndexedDB. */
  nota?: string
}

/** Datas opcionais de um passo, em AAAA-MM-DD. */
export type Datas = Pick<Passo, 'prazo' | 'aPartirDe' | 'repetir'>

/** Projeto reaproveitável: nome, chegada e passos, criados de uma vez com um toque. */
export interface Modelo {
  id: string
  titulo: string
  chegada: string
  passos: { texto: string; energia: Energia }[]
  criadoEm: number
}

export interface Ideia {
  id: string
  texto: string
  projetoId: string | null
  criadoEm: number
  /** "Ainda vale" na pergunta dos 90 dias (D10): conta de novo a partir daqui. */
  adiadaEm?: number
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

// Finanças: valores monetários em centavos (inteiros).

export interface Conta {
  id: string
  nome: string
  saldoInicial: number
  /** Conta vinculada ao Open Finance (Meu Pluggy). */
  pluggyId?: string
}

export interface Categoria {
  id: string
  nome: string
  /** 'transferencia' fica fora dos totais de gastos e receitas. */
  tipo: 'gasto' | 'receita' | 'transferencia'
  /** Limite mensal, em centavos. */
  orcamento?: number
}

export interface Transacao {
  id: string
  contaId: string
  categoriaId: string | null
  /** Negativo: saída. Positivo: entrada. */
  valor: number
  descricao: string
  /** AAAA-MM-DD */
  data: string
  criadoEm: number
  /** Identificador da linha importada, para deduplicação. */
  chaveImport?: string
  fixaId?: string
  /** Criado a partir de notificação; substituído quando o Open Finance traz o lançamento. */
  provisoria?: boolean
}

/** "Se a descrição contém X, a categoria é Y" (V28): criada ao trocar a categoria de um lançamento. Vence o resto. */
export interface RegraCategoria {
  id: string
  /** Trecho procurado na descrição, sem acento e sem diferença de maiúsculas. */
  contem: string
  categoriaId: string
  criadoEm: number
}

/** Meta de economia (V25): uma linha de chegada em dinheiro, como nos projetos. Valores em centavos. */
export interface Meta {
  id: string
  titulo: string
  alvo: number
  guardado: number
  criadoEm: number
  concluidaEm?: number
}

/** Compra adiada: espera um prazo antes de decidir (contra a compra por impulso). */
export interface Desejo {
  id: string
  texto: string
  /** Centavos, se informado. */
  valor?: number
  criadoEm: number
  /** A partir deste instante o app pergunta se ainda quer. */
  decidirEm: number
  decisao?: 'comprei' | 'desisti'
  decididoEm?: number
}

/** Lançamento recorrente mensal. */
export interface ContaFixa {
  id: string
  nome: string
  /** Sempre positivo; o sinal vem de `tipo`. */
  valor: number
  dia: number
  tipo: 'gasto' | 'receita'
  categoriaId: string | null
  contaId: string
}

// Agenda

export interface Evento {
  id: string
  titulo: string
  inicio: number
  fim: number
  diaInteiro?: boolean
  origem: 'local' | 'google'
  googleId?: string
  /** Nome da agenda do Google, quando não é a principal: só leitura, não se apaga daqui. */
  agendaGoogle?: string
  /** Passo associado a este horário reservado. */
  passoId?: string
}

export interface Lembrete {
  id: string
  texto: string
  quando: number
  repetir: 'nunca' | 'diario' | 'semanal' | 'mensal'
  /** Mensal: o dia do mês pretendido. "Todo dia 31" cai no último dia dos meses curtos e volta ao 31 depois. */
  dia?: number
  concluido?: boolean
  /** Contexto curto junto do lembrete, como a nota do passo (V10). */
  nota?: string
}
