/**
 * Cálculo de cores do tema (sem dependências; testes em testes/cores.test.ts).
 *
 * Paleta base compartilhada com os apps desktop (PySide6); só o acento varia. Variantes:
 * - hover: mais escuro no tema claro, mais claro no escuro;
 * - suave: acento misturado à superfície (fundo de seleção);
 * - texto: branco ou escuro, o que tiver contraste >= 4,5:1;
 * - versão escura: clareada e levemente dessaturada até contraste >= 3:1 com o fundo.
 */

export interface VariantesAcento {
  acento: string
  hover: string
  suave: string
  texto: string
}

export interface Acento {
  claro: VariantesAcento
  escuro: VariantesAcento
}

/** Valores da paleta usados nos cálculos de contraste e mistura. */
const SUPERFICIE_CLARO = '#FFFFFF'
const SUPERFICIE_ESCURO = '#18212C'
const FUNDO_ESCURO = '#0F1620'
const TEXTO_CLARO = '#16202A'
const TEXTO_ESCURO = '#0F1620'

type Rgb = [number, number, number]

export function hexParaRgb(hex: string): Rgb {
  const h = hex.replace('#', '')
  const cheio = h.length === 3 ? [...h].map((c) => c + c).join('') : h
  return [0, 2, 4].map((i) => Number.parseInt(cheio.slice(i, i + 2), 16)) as Rgb
}

export const rgbParaHex = (rgb: Rgb) =>
  `#${rgb.map((v) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, '0')).join('').toUpperCase()}`

/** Mistura `peso` de `a` com o resto de `b` (0..1). */
export function misturar(a: string, b: string, peso: number) {
  const [x, y] = [hexParaRgb(a), hexParaRgb(b)]
  return rgbParaHex(x.map((v, i) => v * peso + y[i] * (1 - peso)) as Rgb)
}

function luminancia(hex: string) {
  const canal = (v: number) => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }
  const [r, g, b] = hexParaRgb(hex).map(canal)
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/** Contraste WCAG entre duas cores (1 a 21). */
export function contraste(a: string, b: string) {
  const [l1, l2] = [luminancia(a), luminancia(b)].sort((x, y) => y - x)
  return (l1 + 0.05) / (l2 + 0.05)
}

function rgbParaHsl([r, g, b]: Rgb): [number, number, number] {
  const [rr, gg, bb] = [r / 255, g / 255, b / 255]
  const max = Math.max(rr, gg, bb)
  const min = Math.min(rr, gg, bb)
  const l = (max + min) / 2
  if (max === min) return [0, 0, l]
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  const h = max === rr ? (gg - bb) / d + (gg < bb ? 6 : 0) : max === gg ? (bb - rr) / d + 2 : (rr - gg) / d + 4
  return [h * 60, s, l]
}

function hslParaRgb([h, s, l]: [number, number, number]): Rgb {
  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = l - c / 2
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x]
  return [(r + m) * 255, (g + m) * 255, (b + m) * 255]
}

/** Clareia (delta > 0) ou escurece (delta < 0); `saturacao` multiplica a saturação. */
export function ajustarLuz(hex: string, delta: number, saturacao = 1) {
  const [h, s, l] = rgbParaHsl(hexParaRgb(hex))
  return rgbParaHex(hslParaRgb([h, Math.min(1, s * saturacao), Math.min(1, Math.max(0, l + delta))]))
}

const textoSobre = (acento: string, escuro: string) => (contraste('#FFFFFF', acento) >= 4.5 ? '#FFFFFF' : escuro)

/** Variante para o tema escuro: clareia e dessatura até contraste >= 3,2:1 com o fundo. */
export function acentoParaEscuro(claro: string) {
  let cor = claro
  for (let i = 0; i < 40 && contraste(cor, FUNDO_ESCURO) < 3.2; i++) cor = ajustarLuz(cor, 0.02, 0.98)
  return cor
}

/** Deriva as variantes de uma cor (opcionalmente com a versão escura já definida). */
export function derivarAcento(claro: string, escuro = acentoParaEscuro(claro)): Acento {
  return {
    claro: {
      acento: claro.toUpperCase(),
      hover: ajustarLuz(claro, -0.07),
      suave: misturar(claro, SUPERFICIE_CLARO, 0.09),
      texto: textoSobre(claro, TEXTO_CLARO),
    },
    escuro: {
      acento: escuro.toUpperCase(),
      hover: ajustarLuz(escuro, 0.07),
      suave: misturar(escuro, SUPERFICIE_ESCURO, 0.14),
      texto: textoSobre(escuro, TEXTO_ESCURO),
    },
  }
}

/** Acento padrão (mesmos valores da paleta desktop). */
export const ASSINATURA: Acento = {
  claro: { acento: '#7D0E0E', hover: '#5C0A0A', suave: '#F6E7E6', texto: '#FFFFFF' },
  escuro: { acento: '#C4302A', hover: '#DC4A42', suave: '#2E1616', texto: '#FFFFFF' },
}

/** Acentos predefinidos, distantes das cores de estado. */
export const ACENTOS_PRONTOS: { id: string; nome: string; acento: Acento }[] = [
  { id: 'assinatura', nome: 'Assinatura', acento: ASSINATURA },
  { id: 'petroleo', nome: 'Petróleo', acento: derivarAcento('#1F5F5B', '#4FB3AA') },
  { id: 'azul', nome: 'Azul', acento: derivarAcento('#1D4E89', '#5B9BE6') },
  { id: 'roxo', nome: 'Roxo', acento: derivarAcento('#5B2A86', '#A47BD6') },
  { id: 'grafite', nome: 'Grafite', acento: derivarAcento('#37474F', '#90A4AE') },
]

/** Cores de estado (claro, escuro) que o acento não deve imitar. */
const SEMANTICAS = {
  erro: ['#D92D20', '#FF8A8A'],
  aviso: ['#A16207', '#FBBF24'],
  ok: ['#15803D', '#4ADE80'],
} as const

/**
 * Indica se o acento se confunde com uma cor de estado (matiz e luminosidade próximos).
 * O acento padrão passa porque difere do erro em luminosidade.
 */
export function pareceSemantica(a: Acento): keyof typeof SEMANTICAS | null {
  for (const [nome, cores] of Object.entries(SEMANTICAS) as [keyof typeof SEMANTICAS, readonly string[]][]) {
    for (const [i, cor] of cores.entries()) {
      const [h1, s1, l1] = rgbParaHsl(hexParaRgb(i === 0 ? a.claro.acento : a.escuro.acento))
      const [h2, , l2] = rgbParaHsl(hexParaRgb(cor))
      const distancia = Math.min(Math.abs(h1 - h2), 360 - Math.abs(h1 - h2))
      if (s1 > 0.3 && distancia < 18 && Math.abs(l1 - l2) < 0.12) return nome
    }
  }
  return null
}

/** Resolve o acento salvo: id predefinido ou cor livre "#RRGGBB"; inválido volta ao padrão. */
export function resolverAcento(escolha: string): Acento {
  const pronto = ACENTOS_PRONTOS.find((a) => a.id === escolha)
  if (pronto) return pronto.acento
  return /^#[0-9a-f]{6}$/i.test(escolha) ? derivarAcento(escolha) : ASSINATURA
}
