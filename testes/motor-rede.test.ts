import assert from 'node:assert/strict'
import { test } from 'node:test'
import { caracteristicas, DIMENSAO } from '../src/motor/caracteristicas.ts'
import { ESCONDIDA, geradorComSemente, gradientes, gravar, ler, novaRede, prever, quantizar, treinar, type Exemplo, type Rede } from '../src/motor/rede.ts'

const CLASSES = ['a', 'b', 'c']
const perda = (rede: Rede, ex: Exemplo) => -Math.log(prever(rede, ex.x)[ex.y])

test('características: determinísticas, normalizadas e com as marcas', () => {
  const a = caracteristicas('Dentista 13:00')
  assert.deepEqual(caracteristicas('dentista 13:00'), a, 'maiúsculas não mudam nada')
  assert.ok(a.indices.every((i) => i >= 0 && i < DIMENSAO))
  const norma = a.indices.reduce((s, i, k) => (i < DIMENSAO - 11 ? s + a.valores[k] ** 2 : s), 0)
  assert.ok(Math.abs(norma - 1) < 1e-9, `parte do hashing com comprimento 1 (deu ${norma})`)
  assert.ok(a.indices.includes(DIMENSAO - 11), 'marca tem_hora')
})

test('checagem de gradiente: retropropagação bate com a diferença numérica', () => {
  const rede = novaRede(CLASSES, geradorComSemente(7))
  const ex: Exemplo = { x: caracteristicas('ligar para o banco amanhã'), y: 1 }
  const g = gradientes(rede, ex)
  const h = 1e-2
  const conferir = (param: Float32Array, i: number, analitico: number, nome: string) => {
    const original = param[i]
    param[i] = original + h
    const mais = perda(rede, ex)
    param[i] = original - h
    const menos = perda(rede, ex)
    param[i] = original
    const numerico = (mais - menos) / (2 * h)
    const erro = Math.abs(numerico - analitico) / Math.max(1e-3, Math.abs(numerico) + Math.abs(analitico))
    assert.ok(erro < 2e-2, `${nome}: numérico ${numerico}, analítico ${analitico}`)
  }
  for (let k = 0; k < 6; k++) conferir(rede.w2, k * 5, g.w2[k * 5], `w2[${k * 5}]`)
  for (let k = 0; k < CLASSES.length; k++) conferir(rede.b2, k, g.b2[k], `b2[${k}]`)
  for (let j = 0; j < ESCONDIDA; j += 7) conferir(rede.b1, j, g.b1[j], `b1[${j}]`)
  for (const linha of ex.x.indices.slice(0, 4))
    for (let j = 0; j < ESCONDIDA; j += 11) conferir(rede.w1, linha * ESCONDIDA + j, g.w1.get(linha)![j], `w1[${linha}][${j}]`)
})

test('treino separa classes simples', () => {
  const dados: [string, number][] = [
    ['ligar para o banco', 0], ['mandar email pro chefe', 0], ['lavar a louça', 0], ['pagar a conta de luz', 0],
    ['ideia: app de receitas', 1], ['e se o app tivesse modo escuro', 1], ['ideia pro blog', 1], ['talvez um podcast', 1],
    ['quero um fone novo', 2], ['queria uma bicicleta', 2], ['quero comprar um tênis', 2], ['vontade de um relógio', 2],
  ]
  const exemplos = dados.map(([t, y]) => ({ x: caracteristicas(t), y }))
  const rede = treinar(novaRede(CLASSES, geradorComSemente(1)), exemplos, { epocas: 60, lote: 4, taxa: 0.01, l2: 1e-4, dropout: 0, semente: 1 })
  for (const ex of exemplos) {
    const p = prever(rede, ex.x)
    assert.equal(p.indexOf(Math.max(...p)), ex.y)
  }
})

test('int8: erro de cada peso até meia escala e probabilidades quase iguais', () => {
  const rede = novaRede(CLASSES, geradorComSemente(3))
  const { q, escalas } = quantizar(rede.w1)
  for (let i = 0; i < 2000; i++) assert.ok(Math.abs(q[i] * escalas[Math.floor(i / ESCONDIDA)] - rede.w1[i]) <= escalas[Math.floor(i / ESCONDIDA)] / 2 + 1e-9)
  const lida = ler(gravar(rede, { versaoCaracteristicas: 1, hashDados: 'x', automatico: { liberado: false, limiar: 1 }, revisao: [] }))
  const x = caracteristicas('reunião com o João amanhã')
  const [p, pl] = [prever(rede, x), prever(lida, x)]
  for (let k = 0; k < CLASSES.length; k++) assert.ok(Math.abs(p[k] - pl[k]) < 0.02, `classe ${k}: ${p[k]} × ${pl[k]}`)
})
