import assert from 'node:assert/strict'
import { test } from 'node:test'
import { dividirEmItens, MAX_ITENS } from '../src/dividir.ts'

test('uma captura por linha, sem marcadores de lista e sem linhas vazias', () => {
  assert.deepEqual(dividirEmItens('- comprar pão\n* ligar pro João\r\n\n1. pagar a luz\n2) revisar contrato\n[ ] marcar dentista\n• -35 almoço'), [
    'comprar pão',
    'ligar pro João',
    'pagar a luz',
    'revisar contrato',
    'marcar dentista',
    '-35 almoço',
  ])
})

test('um parágrafo só vira uma captura por frase, sem quebrar valores e horas', () => {
  assert.deepEqual(dividirEmItens('Ligar pro contador amanhã. Pagar R$ 35,50 do almoço! Reunião às 14.30 com a Ana? ok'), [
    'Ligar pro contador amanhã.',
    'Pagar R$ 35,50 do almoço!',
    'Reunião às 14.30 com a Ana? ok',
  ])
})

test('uma frase só continua um item; colagem enorme para em MAX_ITENS', () => {
  assert.deepEqual(dividirEmItens('  comprar pão  '), ['comprar pão'])
  assert.equal(dividirEmItens(Array.from({ length: 80 }, (_, i) => `item ${i}`).join('\n')).length, MAX_ITENS)
})
