// Roda com: npm test  (Node 23.6+ executa TypeScript direto)
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { canonico, confirmarEnvio, planejar, type Base, type Locais, type Remota } from '../src/sync/planejar.ts'

/** Servidor falso: guarda a última versão de cada registro, com um relógio que só avança. */
class Servidor {
  relogio = 0
  linhas = new Map<string, Remota & { t: number }>()
  desde(t: number) {
    return [...this.linhas.values()].filter((l) => l.t > t)
  }
  gravar(rs: Remota[]) {
    // Simula o jsonb: devolve objetos com as chaves em outra ordem.
    for (const r of rs) {
      const dados = r.dados && typeof r.dados === 'object' ? Object.fromEntries(Object.entries(r.dados).reverse()) : r.dados
      this.linhas.set(`${r.colecao}/${r.id}`, { ...r, dados, t: ++this.relogio })
    }
  }
}

class Aparelho {
  locais: Locais = {}
  base: Base = {}
  ultimoPull = 0
  enviados = 0
  servidor: Servidor
  constructor(servidor: Servidor) {
    this.servidor = servidor
  }

  pegar(c: string, id: string) {
    const j = this.locais[c]?.[id]
    return j ? JSON.parse(j) : undefined
  }
  por(c: string, id: string, v: unknown) {
    ;(this.locais[c] ??= {})[id] = canonico(v)
  }
  apagar(c: string, id: string) {
    delete this.locais[c]?.[id]
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
    this.enviados = plano.enviar.length
    this.base = confirmarEnvio(plano.base, plano.enviar)
    this.ultimoPull = this.servidor.relogio
  }
}

const doisAparelhos = () => {
  const s = new Servidor()
  return [new Aparelho(s), new Aparelho(s)] as const
}

test('aparelho novo recebe tudo e não sobrescreve dados editados com os de fábrica', () => {
  const [pc, cel] = doisAparelhos()
  // Os dois nascem com a mesma categoria de fábrica; no PC você definiu um limite.
  pc.por('categorias', 'lazer', { nome: 'Lazer', orcamento: 30000 })
  pc.por('passos', 'p1', { texto: 'Escrever README' })
  pc.sincronizar()

  cel.por('categorias', 'lazer', { nome: 'Lazer' })
  cel.por('categorias', 'so-no-celular', { nome: 'Pets' })
  cel.sincronizar()

  assert.deepEqual(cel.pegar('categorias', 'lazer'), { nome: 'Lazer', orcamento: 30000 })
  assert.deepEqual(cel.pegar('passos', 'p1'), { texto: 'Escrever README' })
  pc.sincronizar()
  assert.deepEqual(pc.pegar('categorias', 'so-no-celular'), { nome: 'Pets' })
})

test('mudanças em itens diferentes nos dois aparelhos não se perdem', () => {
  const [pc, cel] = doisAparelhos()
  pc.sincronizar()
  cel.sincronizar()
  pc.por('passos', 'p2', { texto: 'Ligar para o contador' })
  cel.por('transacoes', 't1', { valor: -3590, descricao: 'iFood' })
  pc.sincronizar()
  cel.sincronizar()
  pc.sincronizar()
  for (const a of [pc, cel]) {
    assert.ok(a.pegar('passos', 'p2'))
    assert.ok(a.pegar('transacoes', 't1'))
  }
})

test('mesmo item editado nos dois: vence quem sincroniza por último, e os dois convergem', () => {
  const [pc, cel] = doisAparelhos()
  pc.por('passos', 'p1', { texto: 'original' })
  pc.sincronizar()
  cel.sincronizar()
  pc.por('passos', 'p1', { texto: 'editado no PC' })
  cel.por('passos', 'p1', { texto: 'editado no celular' })
  pc.sincronizar()
  cel.sincronizar()
  pc.sincronizar()
  assert.equal(pc.pegar('passos', 'p1').texto, 'editado no celular')
  assert.equal(cel.pegar('passos', 'p1').texto, 'editado no celular')
})

test('apagar em um aparelho apaga no outro', () => {
  const [pc, cel] = doisAparelhos()
  pc.por('lembretes', 'l1', { texto: 'Remédio' })
  pc.sincronizar()
  cel.sincronizar()
  assert.ok(cel.pegar('lembretes', 'l1'))
  pc.apagar('lembretes', 'l1')
  pc.sincronizar()
  cel.sincronizar()
  assert.equal(cel.pegar('lembretes', 'l1'), undefined)
})

test('apagado num aparelho e editado no outro: a edição mais recente sobrevive', () => {
  const [pc, cel] = doisAparelhos()
  pc.por('passos', 'p1', { texto: 'v1' })
  pc.sincronizar()
  cel.sincronizar()
  pc.apagar('passos', 'p1')
  pc.sincronizar()
  cel.por('passos', 'p1', { texto: 'v2 do celular' })
  cel.sincronizar()
  pc.sincronizar()
  assert.equal(pc.pegar('passos', 'p1').texto, 'v2 do celular')
  assert.equal(cel.pegar('passos', 'p1').texto, 'v2 do celular')
})

test('aparelho novo respeita o que foi apagado no outro', () => {
  const [pc, cel] = doisAparelhos()
  pc.por('categorias', 'lazer', { nome: 'Lazer' })
  pc.sincronizar()
  pc.apagar('categorias', 'lazer')
  pc.sincronizar()
  cel.por('categorias', 'lazer', { nome: 'Lazer' }) // de fábrica
  cel.sincronizar()
  assert.equal(cel.pegar('categorias', 'lazer'), undefined)
})

test('nada mudou → nada é enviado (inclusive com chaves reordenadas pelo servidor)', () => {
  const [pc, cel] = doisAparelhos()
  pc.por('passos', 'p1', { texto: 'a', energia: 2, ordem: 1, criadoEm: 1 })
  pc.sincronizar()
  cel.sincronizar()
  pc.sincronizar()
  cel.sincronizar()
  assert.equal(pc.enviados, 0)
  assert.equal(cel.enviados, 0)
  // Mesmo reprocessando tudo desde o início (janela de segurança), nada muda.
  cel.ultimoPull = 0
  cel.sincronizar()
  assert.equal(cel.enviados, 0)
})

test('canonico ignora ordem das chaves e campos indefinidos', () => {
  assert.equal(canonico({ b: 1, a: { d: 2, c: undefined } }), canonico({ a: { d: 2 }, b: 1 }))
})
