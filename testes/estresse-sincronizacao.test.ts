// Estresse da sincronização: três aparelhos, operações sorteadas, sincronizações em ordem aleatória.
// Cada semente é reproduzível; se falhar, a mensagem diz qual.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { canonico, confirmarEnvio, planejar, type Base, type Locais, type Remota } from '../src/sync/planejar.ts'

/** Gerador com semente (mulberry32): a mesma semente repete a mesma sequência. */
function sorteador(semente: number) {
  let a = semente >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

class Servidor {
  relogio = 0
  linhas = new Map<string, Remota & { t: number }>()
  desde(t: number) {
    return [...this.linhas.values()].filter((l) => l.t > t)
  }
  gravar(rs: Remota[]) {
    for (const r of rs) this.linhas.set(`${r.colecao}/${r.id}`, { ...r, t: ++this.relogio })
  }
  vivos() {
    const m: Record<string, string> = {}
    for (const l of this.linhas.values()) if (!l.apagado) m[`${l.colecao}/${l.id}`] = canonico(l.dados)
    return m
  }
}

class Aparelho {
  locais: Locais = {}
  base: Base = {}
  ultimoPull = 0
  servidor: Servidor
  constructor(servidor: Servidor) {
    this.servidor = servidor
  }
  sincronizar() {
    const plano = planejar(this.locais, this.base, this.servidor.desde(this.ultimoPull))
    for (const [c, m] of Object.entries(plano.aplicar))
      for (const [id, json] of Object.entries(m)) {
        this.locais[c] ??= {}
        if (json === null) delete this.locais[c][id]
        else this.locais[c][id] = json
      }
    this.servidor.gravar(plano.enviar)
    this.base = confirmarEnvio(plano.base, plano.enviar)
    this.ultimoPull = this.servidor.relogio
  }
  achatar() {
    const m: Record<string, string> = {}
    for (const [c, itens] of Object.entries(this.locais)) for (const [id, json] of Object.entries(itens)) m[`${c}/${id}`] = json
    return m
  }
}

const COLECOES = ['passos', 'transacoes']
const IDS = ['a', 'b', 'c', 'd', 'e', 'f']

function rodar(semente: number) {
  const r = sorteador(semente)
  const escolher = <T,>(lista: T[]) => lista[Math.floor(r() * lista.length)]
  const servidor = new Servidor()
  const aparelhos = [new Aparelho(servidor), new Aparelho(servidor), new Aparelho(servidor)]
  const apagadosAlgumaVez = new Set<string>()
  const criados = new Set<string>()

  for (let i = 0; i < 300; i++) {
    const ap = escolher(aparelhos)
    const c = escolher(COLECOES)
    const id = escolher(IDS)
    const sorte = r()
    if (sorte < 0.45) {
      ;(ap.locais[c] ??= {})[id] = canonico({ texto: `v${i}`, n: i })
      criados.add(`${c}/${id}`)
    } else if (sorte < 0.6) {
      if (ap.locais[c]?.[id]) apagadosAlgumaVez.add(`${c}/${id}`)
      delete ap.locais[c]?.[id]
    } else ap.sincronizar()
  }

  // Sem novas edições, duas voltas completas: na primeira, o último a sincronizar ainda pode enviar algo que os outros não viram.
  for (let volta = 0; volta < 2; volta++) for (const ap of aparelhos) ap.sincronizar()

  const [a, b, c] = aparelhos.map((ap) => ap.achatar())
  assert.deepEqual(b, a, `semente ${semente}: aparelhos 1 e 2 diferentes`)
  assert.deepEqual(c, a, `semente ${semente}: aparelhos 1 e 3 diferentes`)
  assert.deepEqual(servidor.vivos(), a, `semente ${semente}: servidor diferente dos aparelhos`)
  for (const chave of criados)
    if (!apagadosAlgumaVez.has(chave)) assert.ok(chave in a, `semente ${semente}: ${chave} sumiu sem ninguém apagar`)
}

test('três aparelhos convergem e nada some sem ser apagado (200 sementes)', () => {
  for (let semente = 1; semente <= 200; semente++) rodar(semente)
})
