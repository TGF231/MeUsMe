// Gera os ícones PNG do PWA a partir das formas de public/icone.svg (quadrado arredondado, anel e ponto), sem
// dependências: desenha com 4x4 amostras por pixel (borda suave) e codifica o PNG com o zlib do Node.
// Uso: node scripts/icones-png.mjs   (escreve em public/icones/)
import { mkdirSync, writeFileSync } from 'node:fs'
import { deflateSync } from 'node:zlib'

const FUNDO = [0x7d, 0x0e, 0x0e]
const BRANCO = [0xff, 0xff, 0xff]

/**
 * Cor de um ponto (x, y) no desenho de 512×512 do icone.svg.
 * modo 'any': quadrado de cantos 112 e o resto transparente; 'cheio': fundo em toda a área (o sistema recorta).
 * escala: tamanho do desenho dentro da área (a zona segura do ícone maskable é 80%).
 */
function amostra(x, y, modo, escala) {
  const c = 256
  const u = c + (x - c) / escala
  const v = c + (y - c) / escala
  const r = Math.hypot(u - c, v - c)
  if (r <= 58) return [...BRANCO, 255]
  if (r >= 150 - 18 && r <= 150 + 18) return [...BRANCO, 255]
  if (modo === 'cheio') return [...FUNDO, 255]
  // quadrado de 512 com cantos de raio 112
  const qx = Math.max(112 - x, 0, x - (512 - 112))
  const qy = Math.max(112 - y, 0, y - (512 - 112))
  return Math.hypot(qx, qy) <= 112 ? [...FUNDO, 255] : [0, 0, 0, 0]
}

function desenhar(tam, modo, escala) {
  const px = Buffer.alloc(tam * tam * 4)
  const n = 4
  for (let j = 0; j < tam; j++)
    for (let i = 0; i < tam; i++) {
      let r = 0, g = 0, b = 0, a = 0
      for (let sy = 0; sy < n; sy++)
        for (let sx = 0; sx < n; sx++) {
          const [cr, cg, cb, ca] = amostra(((i + (sx + 0.5) / n) * 512) / tam, ((j + (sy + 0.5) / n) * 512) / tam, modo, escala)
          r += cr * ca; g += cg * ca; b += cb * ca; a += ca
        }
      const o = (j * tam + i) * 4
      px[o] = a ? Math.round(r / a) : 0
      px[o + 1] = a ? Math.round(g / a) : 0
      px[o + 2] = a ? Math.round(b / a) : 0
      px[o + 3] = Math.round(a / (n * n))
    }
  return px
}

const TABELA = new Uint32Array(256).map((_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})
const crc = (buf) => {
  let c = 0xffffffff
  for (const byte of buf) c = TABELA[(c ^ byte) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}
function pedaco(tipo, dados) {
  const t = Buffer.from(tipo, 'ascii')
  const tam = Buffer.alloc(4)
  tam.writeUInt32BE(dados.length)
  const soma = Buffer.alloc(4)
  soma.writeUInt32BE(crc(Buffer.concat([t, dados])))
  return Buffer.concat([tam, t, dados, soma])
}
function png(tam, px) {
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(tam, 0)
  ihdr.writeUInt32BE(tam, 4)
  ihdr[8] = 8 // bits por canal
  ihdr[9] = 6 // RGBA
  const linhas = Buffer.alloc(tam * (tam * 4 + 1))
  for (let j = 0; j < tam; j++) px.copy(linhas, j * (tam * 4 + 1) + 1, j * tam * 4, (j + 1) * tam * 4)
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), pedaco('IHDR', ihdr), pedaco('IDAT', deflateSync(linhas, { level: 9 })), pedaco('IEND', Buffer.alloc(0))])
}

const pasta = new URL('../public/icones/', import.meta.url)
mkdirSync(pasta, { recursive: true })
const ICONES = [
  ['icone-192.png', 192, 'any', 1],
  ['icone-512.png', 512, 'any', 1],
  // Android recorta o ícone maskable em círculo ou gota: o desenho fica nos 80% do meio, o fundo vai até a borda.
  ['icone-maskable-512.png', 512, 'cheio', 0.8],
  // iPhone arredonda sozinho e não aceita transparência.
  ['apple-touch-icon.png', 180, 'cheio', 0.92],
]
for (const [nome, tam, modo, escala] of ICONES) {
  writeFileSync(new URL(nome, pasta), png(tam, desenhar(tam, modo, escala)))
  console.log('escrito public/icones/' + nome)
}
