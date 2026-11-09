import type { Aba } from './navegacao.ts'
import type { Captura, Evento, Ideia, Lembrete, Passo, Projeto, Transacao } from './types'

/**
 * Busca em tudo (V07 em docs/CONCORRENTES.md): passos, projetos, ideias, Caixa, lançamentos, compromissos e
 * lembretes. Sem acento e sem maiúscula, e todas as palavras precisam aparecer. Roda no aparelho.
 */

export interface Resultado {
  chave: string
  tipo: string
  texto: string
  detalhe?: string
  aba: Aba
  projetoId?: string
  quando: number
}

export interface Fontes {
  projetos: Projeto[]
  passos: Passo[]
  ideias: Ideia[]
  capturas: Captura[]
  transacoes: Transacao[]
  eventos: Evento[]
  lembretes: Lembrete[]
}

export const normalizar = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()

const dataCurta = (ms: number) => new Date(ms).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })

export function buscar(f: Fontes, termo: string, desligados: Aba[] = [], limite = 30): Resultado[] {
  const palavras = normalizar(termo).split(/\s+/).filter(Boolean)
  if (palavras.length === 0) return []
  const casa = (...textos: (string | undefined)[]) => {
    const alvo = normalizar(textos.filter(Boolean).join(' '))
    return palavras.every((p) => alvo.includes(p))
  }
  const titulo = new Map(f.projetos.map((p) => [p.id, p.titulo]))
  const r: Resultado[] = []

  for (const p of f.projetos)
    if (casa(p.titulo, p.chegada))
      r.push({ chave: `projeto:${p.id}`, tipo: 'Projeto', texto: p.titulo, detalhe: p.concluidoEm ? 'concluído' : p.chegada, aba: 'projetos', projetoId: p.id, quando: p.criadoEm })
  for (const p of f.passos)
    if (casa(p.texto, p.nota))
      r.push({
        chave: `passo:${p.id}`,
        tipo: p.feitoEm ? 'Passo feito' : 'Passo',
        texto: p.texto,
        detalhe: p.projetoId ? titulo.get(p.projetoId) : 'tarefa solta',
        aba: p.feitoEm ? 'historico' : 'projetos',
        projetoId: p.feitoEm ? undefined : (p.projetoId ?? undefined),
        quando: p.feitoEm ?? p.criadoEm,
      })
  for (const i of f.ideias)
    if (casa(i.texto))
      r.push({ chave: `ideia:${i.id}`, tipo: 'Ideia', texto: i.texto, detalhe: i.projetoId ? titulo.get(i.projetoId) : undefined, aba: 'projetos', projetoId: i.projetoId ?? undefined, quando: i.criadoEm })
  for (const c of f.capturas)
    if (casa(c.texto)) r.push({ chave: `captura:${c.id}`, tipo: 'Na Caixa', texto: c.texto, aba: 'caixa', quando: c.criadoEm })
  for (const t of f.transacoes)
    if (casa(t.descricao))
      r.push({ chave: `lancamento:${t.id}`, tipo: 'Lançamento', texto: t.descricao, detalhe: t.data.split('-').reverse().join('/'), aba: 'financas', quando: t.criadoEm })
  for (const e of f.eventos)
    if (casa(e.titulo)) r.push({ chave: `evento:${e.id}`, tipo: 'Compromisso', texto: e.titulo, detalhe: dataCurta(e.inicio), aba: 'agenda', quando: e.inicio })
  for (const l of f.lembretes)
    if (casa(l.texto, l.nota)) r.push({ chave: `lembrete:${l.id}`, tipo: 'Lembrete', texto: l.texto, detalhe: dataCurta(l.quando), aba: 'agenda', quando: l.quando })

  // Começar com o termo vale mais; depois, o mais recente primeiro.
  const inicio = (x: Resultado) => (normalizar(x.texto).startsWith(palavras[0]) ? 1 : 0)
  return r
    .filter((x) => !desligados.includes(x.aba))
    .sort((a, b) => inicio(b) - inicio(a) || b.quando - a.quando)
    .slice(0, limite)
}
