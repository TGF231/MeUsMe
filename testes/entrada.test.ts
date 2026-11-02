import assert from 'node:assert/strict'
import { test } from 'node:test'
import { lerEntrada } from '../src/entrada.ts'

test('compartilhamento do Android vira texto para a Caixa', () => {
  assert.deepEqual(lerEntrada('meusme://captura?texto=' + encodeURIComponent('Comprar pão & café')), { texto: 'Comprar pão & café' })
})

test('atalho "Capturar por voz" abre a captura ouvindo', () => {
  assert.deepEqual(lerEntrada('meusme://captura?voz=1'), { voz: true })
})

test('PWA: título, texto e link sem repetir o link que já está no texto', () => {
  const url = 'https://app.exemplo/?titulo=Receita&texto=' + encodeURIComponent('Veja https://x.y/bolo') + '&link=' + encodeURIComponent('https://x.y/bolo')
  assert.deepEqual(lerEntrada(url), { texto: 'Receita Veja https://x.y/bolo' })
})

test('links que não são de entrada, ou vazios, são ignorados', () => {
  assert.equal(lerEntrada('https://app.exemplo/'), null)
  assert.equal(lerEntrada('meusme://outra?texto=a'), null)
  assert.equal(lerEntrada('meusme://captura'), null)
  assert.equal(lerEntrada('não é url'), null)
})

test('bloco das Configurações rápidas abre a captura sem voz', () => {
  assert.deepEqual(lerEntrada('meusme://captura?abrir=1'), { abrir: true })
})
