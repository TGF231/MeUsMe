import type { Captura, Categoria, Conta, Evento, Ideia, Lembrete, Passo, Projeto, Transacao } from './types'
import { dataISO } from './util.ts'

/**
 * Exportar em formatos abertos (D20 em docs/CONCORRENTES.md), além do backup em JSON:
 * - Markdown: projetos com os passos (feitos e pendentes), tarefas soltas, Caixa e ideias;
 * - CSV: lançamentos, no padrão do Excel em português (ponto e vírgula, vírgula decimal), e o próprio Importar lê de volta;
 * - .ics: compromissos e lembretes, para qualquer agenda.
 */

const dataBR = (iso: string) => iso.split('-').reverse().join('/')

export function paraMarkdown(d: { projetos: Projeto[]; passos: Passo[]; capturas: Captura[]; ideias: Ideia[] }, hoje: string) {
  const passo = (p: Passo) => {
    const extras = [
      p.feitoEm && `feito em ${dataBR(dataISO(p.feitoEm))}`,
      !p.feitoEm && p.prazo && `prazo ${dataBR(p.prazo)}`,
      !p.feitoEm && p.aPartirDe && `a partir de ${dataBR(p.aPartirDe)}`,
      p.repetir && `repete ${{ diario: 'todo dia', semanal: 'toda semana', mensal: 'todo mês' }[p.repetir]}`,
    ].filter(Boolean)
    const nota = p.nota ? `\n${p.nota.replace(/^/gm, '  > ')}` : ''
    return `- [${p.feitoEm ? 'x' : ' '}] ${p.texto}${extras.length ? ` (${extras.join(', ')})` : ''}${nota}`
  }
  const doProjeto = (id: string | null) => d.passos.filter((p) => p.projetoId === id).sort((a, b) => a.ordem - b.ordem)
  const partes = [`# MeUsMe\n\nExportado em ${dataBR(hoje)}.`]
  for (const pr of d.projetos) {
    const cabeca = `## ${pr.titulo}${pr.concluidoEm ? ' (concluído)' : ''}\n\nLinha de chegada: ${pr.chegada}`
    const lista = doProjeto(pr.id).map(passo)
    partes.push(lista.length ? `${cabeca}\n\n${lista.join('\n')}` : cabeca)
  }
  const soltas = doProjeto(null)
  if (soltas.length) partes.push(`## Tarefas soltas\n\n${soltas.map(passo).join('\n')}`)
  if (d.capturas.length) partes.push(`## Caixa\n\n${d.capturas.map((c) => `- ${c.texto || '(recado de voz)'}`).join('\n')}`)
  const ideias = d.ideias.map((i) => `- ${i.texto}${i.projetoId ? ` (${d.projetos.find((p) => p.id === i.projetoId)?.titulo ?? 'projeto apagado'})` : ''}`)
  if (ideias.length) partes.push(`## Ideias\n\n${ideias.join('\n')}`)
  return partes.join('\n\n') + '\n'
}

const celula = (t: string) => (/[;"\n\r]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t)
const reaisCSV = (centavos: number) => `${centavos < 0 ? '-' : ''}${Math.floor(Math.abs(centavos) / 100)},${String(Math.abs(centavos) % 100).padStart(2, '0')}`

export function paraCSV(d: { transacoes: Transacao[]; contas: Conta[]; categorias: Categoria[] }) {
  const nome = (lista: { id: string; nome: string }[], id: string | null) => lista.find((x) => x.id === id)?.nome ?? ''
  const linhas = [...d.transacoes]
    .sort((a, b) => a.data.localeCompare(b.data) || a.criadoEm - b.criadoEm)
    .map((t) =>
      [dataBR(t.data), t.descricao, reaisCSV(t.valor), nome(d.contas, t.contaId), nome(d.categorias, t.categoriaId), t.provisoria ? 'sim' : '']
        .map(celula)
        .join(';'),
    )
  // BOM: sem ele o Excel abre o UTF-8 com acentos trocados.
  return '\uFEFF' + ['Data;Descrição;Valor;Conta;Categoria;Provisório', ...linhas].join('\r\n') + '\r\n'
}

/** Texto do iCalendar: barra, ponto e vírgula, vírgula e quebra de linha escapados. */
const textoICS = (t: string) => t.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n')
const instante = (ms: number) => new Date(ms).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
const diaICS = (ms: number) => dataISO(ms).replace(/-/g, '')

/** Linhas com mais de 75 caracteres continuam na seguinte, começando com espaço (RFC 5545). */
function dobrar(linha: string) {
  const partes = []
  for (let i = 0; i < linha.length; i += 74) partes.push((i ? ' ' : '') + linha.slice(i, i + 74))
  return partes.join('\r\n')
}

export function paraICS(d: { eventos: Evento[]; lembretes: Lembrete[] }, agora: number) {
  const carimbo = `DTSTAMP:${instante(agora)}`
  const blocos: string[][] = []
  for (const e of d.eventos) {
    const quando = e.diaInteiro
      ? [`DTSTART;VALUE=DATE:${diaICS(e.inicio)}`, `DTEND;VALUE=DATE:${diaICS(Math.max(e.fim, e.inicio + 86_400_000))}`]
      : [`DTSTART:${instante(e.inicio)}`, `DTEND:${instante(e.fim)}`]
    blocos.push([`UID:${e.id}@meusme`, carimbo, ...quando, `SUMMARY:${textoICS(e.titulo)}`])
  }
  for (const l of d.lembretes) {
    if (l.concluido) continue
    const regra = { diario: 'DAILY', semanal: 'WEEKLY', mensal: 'MONTHLY' }[l.repetir as 'diario']
    blocos.push([
      `UID:${l.id}@meusme`,
      carimbo,
      `DTSTART:${instante(l.quando)}`,
      `DTEND:${instante(l.quando + 5 * 60_000)}`,
      `SUMMARY:${textoICS(l.texto)}`,
      ...(regra ? [`RRULE:FREQ=${regra}`] : []),
      'BEGIN:VALARM',
      'ACTION:DISPLAY',
      `DESCRIPTION:${textoICS(l.texto)}`,
      'TRIGGER:PT0M',
      'END:VALARM',
    ])
  }
  const linhas = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//MeUsMe//PT-BR', ...blocos.flatMap((b) => ['BEGIN:VEVENT', ...b, 'END:VEVENT']), 'END:VCALENDAR']
  return linhas.map(dobrar).join('\r\n') + '\r\n'
}
