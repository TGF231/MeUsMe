import { create } from 'zustand'

export type Aba = 'agora' | 'agenda' | 'caixa' | 'financas' | 'projetos' | 'historico' | 'ajustes'

/** Aba aberta (não persiste: o app sempre abre em Agora). Telas usam `ir` para levar a outra aba. */
export const useNavegacao = create<{ aba: Aba; projetoAberto: string | null; ir: (aba: Aba, projetoId?: string) => void }>()(
  (set) => ({
    aba: 'agora',
    projetoAberto: null,
    ir: (aba, projetoId) => set({ aba, projetoAberto: projetoId ?? null }),
  }),
)

/** Seções que dá para desligar em Ajustes (D14). Agora, Caixa e Ajustes ficam sempre. Desligar só esconde: os dados continuam. */
export const OPCIONAIS: { id: Aba; nome: string; descricao: string }[] = [
  { id: 'agenda', nome: 'Agenda', descricao: 'compromissos, lembretes e Google Agenda' },
  { id: 'financas', nome: 'Finanças', descricao: 'gastos, contas fixas e bancos' },
  { id: 'projetos', nome: 'Projetos', descricao: 'projetos com linha de chegada e tarefas soltas' },
  { id: 'historico', nome: 'Histórico', descricao: 'o que foi feito, o tempo gasto e o check-in' },
]

/** Perfis prontos (D13): escolher um em vez de montar o sistema. Trocáveis depois em Ajustes. */
export const PERFIS: { id: string; nome: string; descricao: string; desligados: Aba[] }[] = [
  { id: 'tarefas', nome: 'Só tarefas', descricao: 'Agora, Caixa, Projetos e Histórico.', desligados: ['agenda', 'financas'] },
  { id: 'agenda', nome: 'Tarefas e agenda', descricao: 'Também compromissos e lembretes.', desligados: ['financas'] },
  { id: 'tudo', nome: 'Tudo, com dinheiro', descricao: 'Também gastos, contas e bancos.', desligados: [] },
]
