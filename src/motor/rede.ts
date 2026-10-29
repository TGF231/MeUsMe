import { DIMENSAO, type Esparso } from './caracteristicas.ts'

/**
 * Rede neural pequena do motor (docs/MOTOR.md, parte 2), em TypeScript puro:
 *
 *   entrada esparsa (DIMENSAO) ──► ESCONDIDA neurônios (ReLU) ──► classes (softmax)
 *
 * A entrada tem só 30 a 80 posições ativas, então a primeira camada é somar as linhas ativas
 * de W1 multiplicadas pelos valores. Os pesos de W1 são guardados em int8 (ver quantizar).
 */

export const ESCONDIDA = 32

export interface Rede {
  classes: string[]
  /** W1: DIMENSAO linhas × ESCONDIDA colunas, linha por linha. */
  w1: Float32Array
  b1: Float32Array
  /** W2: ESCONDIDA linhas × classes colunas. */
  w2: Float32Array
  b2: Float32Array
}

export function novaRede(classes: string[], sortear: () => number): Rede {
  const c = classes.length
  // Inicialização de He: variância 2/n_entrada, boa para ReLU.
  const normal = () => Math.sqrt(-2 * Math.log(sortear() || 1e-12)) * Math.cos(2 * Math.PI * sortear())
  const w1 = new Float32Array(DIMENSAO * ESCONDIDA).map(() => normal() * Math.sqrt(2 / 64))
  const w2 = new Float32Array(ESCONDIDA * c).map(() => normal() * Math.sqrt(2 / ESCONDIDA))
  return { classes, w1, b1: new Float32Array(ESCONDIDA), w2, b2: new Float32Array(c) }
}

/** Gerador pseudoaleatório com semente (mulberry32): o mesmo treino dá sempre os mesmos pesos. */
export function geradorComSemente(semente: number) {
  let a = semente >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function softmax(z: Float32Array): Float32Array {
  const max = Math.max(...z)
  const e = z.map((v) => Math.exp(v - max))
  const soma = e.reduce((a, b) => a + b, 0)
  return e.map((v) => v / soma)
}

/** Camada escondida: h = ReLU(b1 + Σ xᵢ·W1[i]). */
export function escondida(rede: Rede, x: Esparso): Float32Array {
  const h = Float32Array.from(rede.b1)
  for (let k = 0; k < x.indices.length; k++) {
    const linha = x.indices[k] * ESCONDIDA
    const v = x.valores[k]
    for (let j = 0; j < ESCONDIDA; j++) h[j] += v * rede.w1[linha + j]
  }
  for (let j = 0; j < ESCONDIDA; j++) if (h[j] < 0) h[j] = 0
  return h
}

/** Saída antes do softmax: z = b2 + hᵀ·W2. */
export function saida(rede: Rede, h: Float32Array): Float32Array {
  const c = rede.classes.length
  const z = Float32Array.from(rede.b2)
  for (let j = 0; j < ESCONDIDA; j++) {
    if (h[j] === 0) continue
    for (let k = 0; k < c; k++) z[k] += h[j] * rede.w2[j * c + k]
  }
  return z
}

export function prever(rede: Rede, x: Esparso): Float32Array {
  return softmax(saida(rede, escondida(rede, x)))
}

export interface Exemplo {
  x: Esparso
  /** Índice da classe certa. */
  y: number
}

export interface Gradientes {
  /** Só as linhas de W1 que a entrada usou: índice da linha → gradiente da linha. */
  w1: Map<number, Float32Array>
  b1: Float32Array
  w2: Float32Array
  b2: Float32Array
  perda: number
}

/**
 * Retropropagação de um exemplo, com perda de entropia cruzada. `mascara` é o dropout da camada
 * escondida (0 desliga o neurônio, 1/(1-p) mantém): sem ela, é o gradiente exato. `suavizar` é
 * a suavização de rótulos: a classe certa vale 1 - suavizar e o resto se divide entre as outras,
 * para a rede não empurrar tudo para 99% de certeza.
 */
export function gradientes(rede: Rede, ex: Exemplo, mascara?: Float32Array, suavizar = 0): Gradientes {
  const c = rede.classes.length
  const h = escondida(rede, ex.x)
  if (mascara) for (let j = 0; j < ESCONDIDA; j++) h[j] *= mascara[j]
  const p = softmax(saida(rede, h))

  // dPerda/dz = p - alvo (softmax + entropia cruzada); sem suavizar, o alvo é 1 na classe certa.
  const alvo = Float32Array.from({ length: c }, (_, k) => (k === ex.y ? 1 - suavizar : suavizar / (c - 1)))
  const dz = p.map((v, k) => v - alvo[k])

  const w2 = new Float32Array(ESCONDIDA * c)
  const dh = new Float32Array(ESCONDIDA)
  for (let j = 0; j < ESCONDIDA; j++) {
    for (let k = 0; k < c; k++) {
      w2[j * c + k] = h[j] * dz[k]
      dh[j] += rede.w2[j * c + k] * dz[k]
    }
    // ReLU (e dropout): só passa gradiente onde o neurônio estava ativo.
    if (h[j] <= 0) dh[j] = 0
    else if (mascara) dh[j] *= mascara[j]
  }

  const w1 = new Map<number, Float32Array>()
  for (let k = 0; k < ex.x.indices.length; k++) {
    const linha = w1.get(ex.x.indices[k]) ?? new Float32Array(ESCONDIDA)
    for (let j = 0; j < ESCONDIDA; j++) linha[j] += ex.x.valores[k] * dh[j]
    w1.set(ex.x.indices[k], linha)
  }
  const perda = -alvo.reduce((s, a, k) => s + (a ? a * Math.log(Math.max(p[k], 1e-12)) : 0), 0)
  return { w1, b1: dh, w2, b2: dz, perda }
}

export interface OpcoesTreino {
  epocas: number
  lote: number
  taxa: number
  /** Decaimento de peso (L2 desacoplado, como no AdamW). */
  l2: number
  dropout: number
  /** Suavização de rótulos (0 desliga). */
  suavizar?: number
  semente: number
  /** Treina só W2 e b2 (aprendizado com as correções, fase 3). */
  soUltimaCamada?: boolean
  /**
   * Com âncora, o L2 puxa W2 e b2 de volta para estes valores (os de fábrica) em vez de zero:
   * a rede aprende as suas correções sem esquecer o que sabia das classes que você não corrigiu.
   */
  ancora?: { w2: Float32Array; b2: Float32Array }
  aoTerminarEpoca?: (epoca: number, perdaMedia: number) => void
}

/** Treino com Adam em minilotes. A primeira camada só atualiza as linhas usadas no lote. */
export function treinar(rede: Rede, exemplos: Exemplo[], o: OpcoesTreino) {
  const sortear = geradorComSemente(o.semente)
  const [beta1, beta2, eps] = [0.9, 0.999, 1e-8]
  const momentos = (n: number) => ({ m: new Float32Array(n), v: new Float32Array(n) })
  const adam = { w1: momentos(rede.w1.length), b1: momentos(ESCONDIDA), w2: momentos(rede.w2.length), b2: momentos(rede.b2.length) }
  let t = 0

  /** Adam em `grad.length` parâmetros a partir de `deslocamento`; `decai` aplica o L2 (em direção à âncora, se houver). */
  const passo = (param: Float32Array, mom: { m: Float32Array; v: Float32Array }, deslocamento: number, grad: Float32Array, decai: boolean, ancora?: Float32Array) => {
    const c1 = 1 - beta1 ** t
    const c2 = 1 - beta2 ** t
    for (let i = 0; i < grad.length; i++) {
      const g = grad[i]
      const k = deslocamento + i
      mom.m[k] = beta1 * mom.m[k] + (1 - beta1) * g
      mom.v[k] = beta2 * mom.v[k] + (1 - beta2) * g * g
      param[k] -= o.taxa * (mom.m[k] / c1 / (Math.sqrt(mom.v[k] / c2) + eps) + (decai ? o.l2 * (param[k] - (ancora?.[k] ?? 0)) : 0))
    }
  }

  const ordem = exemplos.map((_, i) => i)
  for (let epoca = 0; epoca < o.epocas; epoca++) {
    // Embaralha (Fisher-Yates) com a semente.
    for (let i = ordem.length - 1; i > 0; i--) {
      const j = Math.floor(sortear() * (i + 1))
      ;[ordem[i], ordem[j]] = [ordem[j], ordem[i]]
    }
    let perdaTotal = 0
    for (let inicio = 0; inicio < ordem.length; inicio += o.lote) {
      const lote = ordem.slice(inicio, inicio + o.lote)
      const soma = { w1: new Map<number, Float32Array>(), b1: new Float32Array(ESCONDIDA), w2: new Float32Array(rede.w2.length), b2: new Float32Array(rede.b2.length) }
      for (const i of lote) {
        const mascara = o.dropout > 0 ? Float32Array.from({ length: ESCONDIDA }, () => (sortear() < o.dropout ? 0 : 1 / (1 - o.dropout))) : undefined
        const g = gradientes(rede, exemplos[i], mascara, o.suavizar)
        perdaTotal += g.perda
        for (const [linha, gl] of g.w1) {
          const acc = soma.w1.get(linha) ?? new Float32Array(ESCONDIDA)
          for (let j = 0; j < ESCONDIDA; j++) acc[j] += gl[j] / lote.length
          soma.w1.set(linha, acc)
        }
        for (let j = 0; j < ESCONDIDA; j++) soma.b1[j] += g.b1[j] / lote.length
        for (let k = 0; k < g.w2.length; k++) soma.w2[k] += g.w2[k] / lote.length
        for (let k = 0; k < g.b2.length; k++) soma.b2[k] += g.b2[k] / lote.length
      }
      t++
      passo(rede.w2, adam.w2, 0, soma.w2, true, o.ancora?.w2)
      passo(rede.b2, adam.b2, 0, soma.b2, !!o.ancora, o.ancora?.b2)
      if (o.soUltimaCamada) continue
      passo(rede.b1, adam.b1, 0, soma.b1, false)
      // Atualização preguiçosa: só as linhas de W1 que o lote usou.
      for (const [linha, gl] of soma.w1) passo(rede.w1, adam.w1, linha * ESCONDIDA, gl, true)
    }
    o.aoTerminarEpoca?.(epoca, perdaTotal / exemplos.length)
  }
  return rede
}

/**
 * W1 em int8 com uma escala por linha: valor ≈ int8 × escala. Divide o tamanho por 4
 * (com 2.048 posições, de ~260 KB para ~66 KB) e muda as probabilidades só na terceira casa.
 */
export function quantizar(w1: Float32Array): { q: Int8Array; escalas: Float32Array } {
  const linhas = w1.length / ESCONDIDA
  const q = new Int8Array(w1.length)
  const escalas = new Float32Array(linhas)
  for (let l = 0; l < linhas; l++) {
    let max = 0
    for (let j = 0; j < ESCONDIDA; j++) max = Math.max(max, Math.abs(w1[l * ESCONDIDA + j]))
    const escala = max / 127 || 1
    escalas[l] = escala
    for (let j = 0; j < ESCONDIDA; j++) q[l * ESCONDIDA + j] = Math.round(w1[l * ESCONDIDA + j] / escala)
  }
  return { q, escalas }
}

export function desquantizar(q: Int8Array, escalas: Float32Array): Float32Array {
  const w1 = new Float32Array(q.length)
  for (let i = 0; i < q.length; i++) w1[i] = q[i] * escalas[Math.floor(i / ESCONDIDA)]
  return w1
}

/** O que vai para src/motor/pesos.json. */
export interface PesosGravados {
  versaoCaracteristicas: number
  /** Hash dos dados de treino: um teste falha se os dados mudarem sem retreinar. */
  hashDados: string
  classes: string[]
  escondida: number
  /** base64 de Int8Array. */
  w1: string
  /** base64 de Float32Array. */
  escalas: string
  b1: number[]
  w2: number[]
  b2: number[]
  /** Escrito por scripts/motor-avaliar.ts com as capturas reais; até lá, a rede só sugere. */
  automatico: { liberado: boolean; limiar: number; medidoEm?: string }
  /**
   * Amostra do treino (algumas frases por classe) misturada aos seus exemplos no retreino da
   * última camada: sem ela, 20 vendas seguidas ensinariam que todo valor é entrada.
   */
  revisao: { texto: string; classe: string }[]
}

const paraBase64 = (bytes: Uint8Array) => {
  let s = ''
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(s)
}
const deBase64 = (b64: string) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))

export function gravar(rede: Rede, meta: Pick<PesosGravados, 'versaoCaracteristicas' | 'hashDados' | 'automatico' | 'revisao'>): PesosGravados {
  const { q, escalas } = quantizar(rede.w1)
  const arredondar = (a: Float32Array) => Array.from(a, (v) => Math.round(v * 1e5) / 1e5)
  return {
    ...meta,
    classes: rede.classes,
    escondida: ESCONDIDA,
    w1: paraBase64(new Uint8Array(q.buffer)),
    escalas: paraBase64(new Uint8Array(escalas.buffer)),
    b1: arredondar(rede.b1),
    w2: arredondar(rede.w2),
    b2: arredondar(rede.b2),
  }
}

export function ler(p: PesosGravados): Rede {
  if (p.escondida !== ESCONDIDA) throw new Error('Pesos de outra arquitetura: retreine (npm run motor:treinar).')
  const q = new Int8Array(deBase64(p.w1).buffer)
  const escalas = new Float32Array(deBase64(p.escalas).buffer)
  return { classes: p.classes, w1: desquantizar(q, escalas), b1: Float32Array.from(p.b1), w2: Float32Array.from(p.w2), b2: Float32Array.from(p.b2) }
}
