import assert from 'node:assert/strict'
import { test } from 'node:test'
import { converterExtrato, detectarColunas, lerCSV } from '../src/csv.ts'
import { paraCSV, paraICS, paraMarkdown } from '../src/exportar.ts'
import type { Passo, Transacao } from '../src/types.ts'

const passo = (id: string, ordem: number, extra: Partial<Passo> = {}): Passo => ({ id, projetoId: 'festa', texto: id, energia: 1, ordem, criadoEm: 0, ...extra })

test('Markdown: projetos com passos em ordem, feitos marcados, tarefas soltas, Caixa e ideias', () => {
  const md = paraMarkdown(
    {
      projetos: [{ id: 'festa', titulo: 'Festa', chegada: 'Festa feita', criadoEm: 0 }],
      passos: [passo('convite', 2, { prazo: '2026-11-10' }), passo('lista', 1, { feitoEm: new Date(2026, 10, 1, 12).getTime() }), passo('dentista', 1, { projetoId: null })],
      capturas: [{ id: 'c', texto: 'ligar pro João', criadoEm: 0 }],
      ideias: [{ id: 'i', texto: 'tema anos 80', projetoId: 'festa', criadoEm: 0 }],
    },
    '2026-11-02',
  )
  assert.equal(
    md,
    `# MeUsMe

Exportado em 02/11/2026.

## Festa

Linha de chegada: Festa feita

- [x] lista (feito em 01/11/2026)
- [ ] convite (prazo 10/11/2026)

## Tarefas soltas

- [ ] dentista

## Caixa

- ligar pro João

## Ideias

- tema anos 80 (Festa)
`,
  )
})

test('CSV volta pelo Importar com os mesmos valores, descrições e datas', () => {
  const t = (id: string, valor: number, descricao: string, data: string): Transacao => ({ id, contaId: 'nu', categoriaId: 'ali', valor, descricao, data, criadoEm: 0 })
  const transacoes = [t('a', -3590, 'Almoço; "bom"', '2026-11-01'), t('b', 100000, 'Venda TV', '2026-10-30'), t('c', -5, 'Troco', '2026-11-02')]
  const csv = paraCSV({ transacoes, contas: [{ id: 'nu', nome: 'Nubank', saldoInicial: 0 }], categorias: [{ id: 'ali', nome: 'Alimentação', tipo: 'gasto' }] })
  assert.ok(csv.startsWith('﻿Data;Descrição;Valor;Conta;Categoria;Provisório\r\n30/10/2026;Venda TV;1000,00;Nubank;Alimentação;\r\n'))
  const [cabecalho, ...linhas] = lerCSV(csv)
  const colunas = detectarColunas(cabecalho)
  assert.ok(colunas)
  const { ok } = converterExtrato(linhas, colunas, false, 'nu')
  assert.deepEqual(
    ok.map((l) => [l.data, l.valor, l.descricao]),
    [
      ['2026-10-30', 100000, 'Venda TV'],
      ['2026-11-01', -3590, 'Almoço; "bom"'],
      ['2026-11-02', -5, 'Troco'],
    ],
  )
})

test('.ics com compromissos, dia inteiro, lembrete que se repete com alarme, texto escapado e linhas dobradas', () => {
  const ics = paraICS(
    {
      eventos: [
        { id: 'e1', titulo: 'Dentista, consulta; retorno', inicio: Date.UTC(2026, 10, 3, 13), fim: Date.UTC(2026, 10, 3, 14), origem: 'local' },
        { id: 'e2', titulo: 'Feriado', inicio: new Date(2026, 10, 15).getTime(), fim: new Date(2026, 10, 16).getTime(), origem: 'google', diaInteiro: true },
      ],
      lembretes: [
        { id: 'l1', texto: 'Remédio', quando: Date.UTC(2026, 10, 2, 11), repetir: 'diario' },
        { id: 'l2', texto: 'feito', quando: 0, repetir: 'nunca', concluido: true },
        { id: 'l3', texto: 'x'.repeat(100), quando: Date.UTC(2026, 10, 2, 11), repetir: 'nunca' },
      ],
    },
    Date.UTC(2026, 10, 2),
  )
  const linhas = ics.split('\r\n')
  assert.equal(linhas[0], 'BEGIN:VCALENDAR')
  assert.ok(linhas.includes('DTSTART:20261103T130000Z'))
  assert.ok(linhas.includes('SUMMARY:Dentista\\, consulta\\; retorno'))
  assert.ok(linhas.includes('DTSTART;VALUE=DATE:20261115'))
  assert.ok(linhas.includes('DTEND;VALUE=DATE:20261116'))
  assert.ok(linhas.includes('RRULE:FREQ=DAILY'))
  assert.equal(ics.match(/BEGIN:VEVENT/g)?.length, 4)
  assert.ok(!ics.includes('feito'))
  assert.ok(linhas.every((l) => l.length <= 75))
  assert.ok(linhas.some((l) => l.startsWith(' x')))
})
