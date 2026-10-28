import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { ACENTOS_PRONTOS, ASSINATURA, PALETA, SEMANTICAS, contraste, derivarAcento, misturar, pareceSemantica, resolverAcento } from '../src/tema/cores.ts'

/** Lê as variáveis --megui-* de um bloco do megui.css gerado. */
function megui(seletor: string) {
  const css = readFileSync(new URL('../src/tema/megui.css', import.meta.url), 'utf8')
  const bloco = css.slice(css.indexOf(`${seletor} {`)).split('}')[0]
  return Object.fromEntries([...bloco.matchAll(/--megui-([\w-]+):\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]))
}
const CLARO = megui(':root')
const ESCURO = megui('[data-tema="escuro"]')

test('a assinatura e a paleta usada nos cálculos batem com o megui.css', () => {
  for (const [modo, p] of [['claro', CLARO], ['escuro', ESCURO]] as const) {
    const a = ASSINATURA[modo]
    assert.deepEqual(
      [a.acento, a.hover, a.linha, a.suave, a.texto],
      [p.accent, p['accent-hover'], p['accent-linha'], p['accent-soft'], p['on-accent']],
      modo,
    )
  }
  assert.equal(PALETA.superficieClaro, CLARO.surface)
  assert.equal(PALETA.superficieEscuro, ESCURO.surface)
  assert.equal(PALETA.textoClaro, CLARO.ink)
  assert.deepEqual(SEMANTICAS.erro, [CLARO.bad, ESCURO.bad])
  assert.deepEqual(SEMANTICAS.aviso, [CLARO.warn, ESCURO.warn])
  assert.deepEqual(SEMANTICAS.ok, [CLARO.ok, ESCURO.ok])
})

test('a cópia do megui.css usada pelas páginas de privacidade e termos é a mesma do app', () => {
  const ler = (caminho: string) => readFileSync(new URL(caminho, import.meta.url), 'utf8').replace(/\r\n/g, '\n')
  assert.equal(ler('../public/megui.css'), ler('../src/tema/megui.css'))
})

test('a assinatura é o acento padrão', () => {
  assert.equal(resolverAcento('assinatura'), ASSINATURA)
})

test('a derivação reproduz de perto o acento suave da assinatura', () => {
  const a = derivarAcento('#7D0E0E', '#DC4A42')
  assert.ok(contraste(a.claro.suave, ASSINATURA.claro.suave) < 1.05, `${a.claro.suave} longe de ${ASSINATURA.claro.suave}`)
  assert.ok(contraste(a.escuro.suave, ASSINATURA.escuro.suave) < 1.05, `${a.escuro.suave} longe de ${ASSINATURA.escuro.suave}`)
})

for (const { nome, acento } of [{ nome: 'Assinatura', acento: ASSINATURA }, ...ACENTOS_PRONTOS]) {
  test(`${nome}: texto sobre o acento é legível (≥ 4,5:1) nos dois temas`, () => {
    assert.ok(contraste(acento.claro.texto, acento.claro.acento) >= 4.5)
    assert.ok(contraste(acento.escuro.texto, acento.escuro.acento) >= 4.5)
  })
  test(`${nome}: a linha se destaca da superfície nos dois temas (≥ 3:1)`, () => {
    assert.ok(contraste(acento.claro.linha, PALETA.superficieClaro) >= 3)
    assert.ok(contraste(acento.escuro.linha, PALETA.superficieEscuro) >= 3)
  })
  test(`${nome}: as três tintas continuam legíveis sobre o acento suave (≥ 4,5:1)`, () => {
    for (const tinta of ['ink', 'ink2', 'ink3']) {
      assert.ok(contraste(CLARO[tinta], acento.claro.suave) >= 4.5, `claro ${tinta}`)
      assert.ok(contraste(ESCURO[tinta], acento.escuro.suave) >= 4.5, `escuro ${tinta}`)
    }
  })
}

test('como no MegUI, o preenchimento é o mesmo nos dois temas', () => {
  const a = derivarAcento('#1D4E89')
  assert.equal(a.escuro.acento, a.claro.acento)
})

test('derivar a linha escura da assinatura chega perto da do megui.css, não de um vermelho de alerta', () => {
  const linha = derivarAcento('#7D0E0E').escuro.linha
  assert.ok(contraste(linha, ASSINATURA.escuro.linha) < 1.25, `${linha} longe de ${ASSINATURA.escuro.linha}`)
})

test('cor livre muito clara ganha texto escuro por cima e linha escurecida no tema claro', () => {
  const a = derivarAcento('#F5C542')
  assert.notEqual(a.claro.texto, '#FFFFFF')
  assert.ok(contraste(a.claro.texto, a.claro.acento) >= 4.5)
  assert.ok(contraste(a.claro.linha, PALETA.superficieClaro) >= 3)
})

test('cor livre escura demais para o tema escuro tem a linha clareada até aparecer', () => {
  const a = derivarAcento('#1A1A40')
  assert.ok(contraste(a.escuro.linha, PALETA.superficieEscuro) >= 3)
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
