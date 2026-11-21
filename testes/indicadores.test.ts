// Executar com npm test.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { passosPorSemana, situacaoDosProjetos } from '../src/indicadores.ts'

const DIA = 86_400_000
const agora = Date.UTC(2026, 10, 21, 12)

test('passos por semana: janelas de 7 dias, da mais antiga para a atual', () => {
  const passos = [
    { feitoEm: agora - 1 * DIA }, // semana atual
    { feitoEm: agora - 6 * DIA }, // semana atual
    { feitoEm: agora - 8 * DIA }, // semana passada
    { feitoEm: agora - 50 * DIA }, // fora das 6 semanas
    { feitoEm: undefined }, // não feito
    { feitoEm: agora + DIA }, // no futuro (relógio errado): não conta
  ]
  assert.deepEqual(passosPorSemana(passos, agora), [0, 0, 0, 0, 1, 2])
  assert.deepEqual(passosPorSemana([], agora, 3), [0, 0, 0])
})

test('situação dos projetos: concluído, encerrado com aprendizado, andando e parado há 30 dias', () => {
  const projetos = [
    { id: 'c', titulo: 'C', chegada: '', criadoEm: agora - 90 * DIA, concluidoEm: agora - 2 * DIA },
    { id: 'e', titulo: 'E', chegada: '', criadoEm: agora - 90 * DIA, concluidoEm: agora - 2 * DIA, aprendizado: 'Testei o jeito' },
    { id: 'a', titulo: 'A', chegada: '', criadoEm: agora - 90 * DIA },
    { id: 'p', titulo: 'P', chegada: '', criadoEm: agora - 90 * DIA },
    { id: 'n', titulo: 'Novo', chegada: '', criadoEm: agora - 3 * DIA },
  ]
  const passos = [
    { projetoId: 'a', feitoEm: agora - 5 * DIA },
    { projetoId: 'p', feitoEm: agora - 45 * DIA },
    { projetoId: null, feitoEm: agora - DIA },
  ]
  assert.deepEqual(situacaoDosProjetos(projetos, passos, agora), { concluidos: 1, encerrados: 1, andando: 2, parados: 1 })
})
