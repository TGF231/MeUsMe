import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { test } from 'node:test'

// Varre o JSX atrás do que o axe (auditoria automática) não pega: estado que só aparece na cor e símbolo lido em voz alta.
// O que foi verificado à mão, e como, está em docs/ACESSIBILIDADE.md.

const andar = (pasta: string): string[] =>
  readdirSync(pasta, { withFileTypes: true }).flatMap((f) => {
    const caminho = join(pasta, f.name)
    return f.isDirectory() ? andar(caminho) : f.name.endsWith('.tsx') ? [caminho] : []
  })
const arquivos = andar('src').map((caminho) => ({ caminho, linhas: readFileSync(caminho, 'utf8').split(/\r?\n/) }))

test('botão aceso pela classe "ativo" diz ao leitor de tela que está escolhido', () => {
  const faltando: string[] = []
  for (const { caminho, linhas } of arquivos)
    linhas.forEach((linha, i) => {
      if (!/\? 'ativo' : ''/.test(linha)) return
      // O elemento inteiro: da abertura da tag até o fim dela.
      const inicio = linhas.slice(0, i + 1).findLastIndex((l) => /<\w/.test(l))
      const tag = linhas.slice(inicio, i + 8).join('\n')
      if (!/^\s*<button/.test(linhas[inicio]) && !/<button/.test(tag.split('\n')[0])) return
      if (!/aria-(pressed|checked|selected|current)=/.test(tag)) faltando.push(`${caminho}:${i + 1}`)
    })
  assert.deepEqual(faltando, [], 'use aria-pressed (escolha), aria-checked (role="radio") ou aria-current (navegação)')
})

// ✓ vira "marca de seleção", ★ "estrela preta", 📅 "calendário"...
const SIMBOLOS = /[✓★☆⏰⏱📅💸🎙■↺●○]/u

test('símbolo no texto passa pelo Simbolo ou fica escondido do leitor de tela', () => {
  const soltos: string[] = []
  for (const { caminho, linhas } of arquivos)
    linhas.forEach((linha, i) => {
      if (!SIMBOLOS.test(linha) || linha.trim().startsWith('//') || linha.trim().startsWith('*')) return
      const perto = linhas.slice(Math.max(0, i - 4), i + 1).join('\n')
      if (/<Simbolo|aria-hidden|aria-label=/.test(perto)) return
      soltos.push(`${caminho}:${i + 1}: ${linha.trim()}`)
    })
  assert.deepEqual(soltos, [], 'use <Simbolo c="✓" diz="Feito" /> (components/Icone.tsx)')
})

/** Fim de uma tag JSX: o primeiro ">" fora de chaves (o "=>" de um onChange não conta). */
function fimDaTag(texto: string, i: number) {
  for (let chaves = 0; i < texto.length; i++) {
    if (texto[i] === '{') chaves++
    else if (texto[i] === '}') chaves--
    else if (texto[i] === '>' && chaves === 0) return i
  }
  return i
}

test('todo campo tem nome: aria-label, id ligado a um <label htmlFor> ou dentro do <label>', () => {
  // Placeholder não basta: some ao digitar e a WebView do Android não o entrega como nome.
  const semNome: string[] = []
  for (const { caminho, linhas } of arquivos) {
    const texto = linhas.join('\n')
    for (const m of texto.matchAll(/<(input|select|textarea)\b/g)) {
      const tag = texto.slice(m.index, fimDaTag(texto, m.index) + 1)
      if (/aria-label|aria-labelledby|\bid=|type="hidden"/.test(tag)) continue
      const antes = texto.slice(0, m.index)
      if (antes.lastIndexOf('<label') > antes.lastIndexOf('</label>')) continue
      semNome.push(`${caminho}:${antes.split('\n').length}`)
    }
  }
  assert.deepEqual(semNome, [])
})

test('grupo de botões de escolha tem nome', () => {
  const semNome: string[] = []
  for (const { caminho, linhas } of arquivos)
    linhas.forEach((linha, i) => {
      if (/className="(segmentado|chips)"/.test(linha) && !/aria-label(ledby)?=/.test(linha)) semNome.push(`${caminho}:${i + 1}`)
    })
  assert.deepEqual(semNome, [], 'role="group" aria-label="…" com o mesmo texto do rótulo visível')
})
