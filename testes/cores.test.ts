import assert from 'node:assert/strict'
import { test } from 'node:test'
import { ACENTOS_PRONTOS, ASSINATURA, contraste, derivarAcento, misturar, pareceSemantica, resolverAcento } from '../src/tema/cores.ts'

const SUPERFICIE_CLARO = '#FFFFFF'
const FUNDO_ESCURO = '#0F1620'

test('a assinatura usa os valores exatos do tema.py', () => {
  assert.equal(resolverAcento('assinatura'), ASSINATURA)
  assert.equal(ASSINATURA.claro.acento, '#7D0E0E')
  assert.equal(ASSINATURA.escuro.acento, '#C4302A')
})

test('a derivação reproduz de perto o acento suave da assinatura', () => {
  // tema.py: #F6E7E6 no claro. A mistura a 9% sobre o branco deve chegar perto.
  const suave = derivarAcento('#7D0E0E', '#C4302A').claro.suave
  assert.ok(contraste(suave, '#F6E7E6') < 1.05, `${suave} longe de #F6E7E6`)
})

for (const { nome, acento } of ACENTOS_PRONTOS) {
  test(`${nome}: texto sobre o acento é legível (≥ 4,5:1) nos dois temas`, () => {
    assert.ok(contraste(acento.claro.texto, acento.claro.acento) >= 4.5)
    assert.ok(contraste(acento.escuro.texto, acento.escuro.acento) >= 4.5)
  })
  test(`${nome}: acento se destaca do fundo nos dois temas (≥ 3:1)`, () => {
    assert.ok(contraste(acento.claro.acento, SUPERFICIE_CLARO) >= 3)
    assert.ok(contraste(acento.escuro.acento, FUNDO_ESCURO) >= 3)
  })
}

test('derivar o acento da assinatura para o escuro chega perto do tijolo do tema.py, não de um vermelho de alerta', () => {
  const escuro = derivarAcento('#7D0E0E').escuro.acento
  assert.ok(contraste(escuro, '#C4302A') < 1.25, `${escuro} longe de #C4302A`)
})

test('cor livre muito clara ganha texto escuro por cima', () => {
  const a = derivarAcento('#F5C542')
  assert.notEqual(a.claro.texto, '#FFFFFF')
  assert.ok(contraste(a.claro.texto, a.claro.acento) >= 4.5)
})

test('cor livre escura demais para o tema escuro é clareada até aparecer', () => {
  const a = derivarAcento('#1A1A40')
  assert.ok(contraste(a.escuro.acento, FUNDO_ESCURO) >= 3)
})

test('cores prontas, incluindo a assinatura, não se confundem com erro, aviso ou ok', () => {
  for (const { nome, acento } of ACENTOS_PRONTOS) assert.equal(pareceSemantica(acento), null, nome)
})

test('amarelo parecido com o aviso e vermelho vivo parecido com o erro são detectados', () => {
  assert.equal(pareceSemantica(derivarAcento('#F5C542')), 'aviso')
  assert.equal(pareceSemantica(derivarAcento('#D92D20')), 'erro')
})

test('escolha inválida volta para a assinatura', () => {
  assert.equal(resolverAcento('qualquer-coisa'), ASSINATURA)
})

test('misturar nos extremos devolve as próprias cores', () => {
  assert.equal(misturar('#7D0E0E', '#FFFFFF', 1), '#7D0E0E')
  assert.equal(misturar('#7D0E0E', '#FFFFFF', 0), '#FFFFFF')
})
