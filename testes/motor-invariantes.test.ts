import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { gerarExemplos } from '../dados/motor/modelos.ts'
import { decidir, type MotorRede } from '../src/motor/interpretar.ts'
import { geradorComSemente, ler, type PesosGravados } from '../src/motor/rede.ts'

// Milhares de frases pelo motor inteiro (regras + rede liberada + memória): o que quer que ele
// decida, o resultado tem que ser criável sem quebrar a Agenda, as Finanças ou a tela Agora.

const AGORA = new Date(2026, 9, 28, 10, 0)
const DIA = 86_400_000
const pesos = JSON.parse(readFileSync('src/motor/pesos.json', 'utf8')) as PesosGravados
const rede: MotorRede = { rede: ler(pesos), liberado: true, limiar: 0.5 }
const manuais = readFileSync('dados/motor/exemplos.jsonl', 'utf8')
  .split(/\r?\n/)
  .filter(Boolean)
  .map((l) => (JSON.parse(l) as { texto: string }).texto)

/** Misturas aleatórias de pedaços reais: o tipo de texto que ninguém escreveria num teste à mão. */
function misturas(n: number) {
  const sortear = geradorComSemente(99)
  const pedacos = [...manuais.join(' ').split(/\s+/), '-', '+', 'R$', '13:00', 'às', 'das', 'até', 'todo', 'dia', 'lembrar', ':', '15h', '-35', '+1000', 'ontem', 'mil']
  return Array.from({ length: n }, () => Array.from({ length: 1 + Math.floor(sortear() * 8) }, () => pedacos[Math.floor(sortear() * pedacos.length)]).join(' '))
}

/** Intervalos e repetições sorteados, com horas e dias que não existem ("das 25h", "todo dia 31"). */
function variacoes(n: number) {
  const s = geradorComSemente(5)
  const um = <T>(l: T[]) => l[Math.floor(s() * l.length)]
  const h = () => String(Math.floor(s() * 27))
  const formas = [
    () => `reunião das ${h()}h às ${h()}h`,
    () => `plantão ${h()}:${um(['00', '30', '59', '61'])} - ${h()}h`,
    () => `aula ${h()}h às ${h()}`,
    () => `academia toda ${um(['segunda', 'terça', 'sexta', 'sábado', 'domingo'])} ${um(['', `${h()}h`, 'de manhã', 'à noite'])}`,
    () => `lembrar de pagar ${um(['o aluguel', 'a luz', ''])} todo dia ${Math.floor(s() * 33)}`,
    () => `${um(['tomar água', 'remédio', 'alongar'])} todo dia ${um(['', `${h()}h`, 'cedo'])}`,
    () => `regar as plantas todas as ${um(['segundas', 'sextas', 'semanas'])}`,
    () => `${um(['-', '+'])}${Math.floor(s() * 5000)} ${um(['almoço', 'freela', 'tv'])} ${um(['ontem', 'anteontem', ''])}`,
    () => `lembrar de ${um(['ligar', 'pagar'])} ${um(['amanhã', 'hoje', 'sexta', 'dia 30', '31/02', 'fim de semana', 'daqui a 3 dias'])} ${um(['de manhã', 'à tarde', '', `${h()}h`])}`,
  ]
  return Array.from({ length: n }, () => um(formas)())
}

const frases = [...manuais, ...gerarExemplos(geradorComSemente(7), 150).map((e) => e.texto), ...misturas(3000), ...variacoes(2000)]

test(`invariantes do motor em ${frases.length} frases`, () => {
  const memoria = new Map([['comprar pao', 'passo' as const]])
  for (const texto of frases) {
    for (const automatico of [true, false]) {
      const d = decidir(texto, AGORA, { rede, memoria, automatico, projetos: [{ id: 'p', titulo: 'Site' }] })
      if ('caixa' in d) continue
      assert.ok(automatico, `"${texto}": criou com o interruptor desligado`)
      const r = d.criar
      const onde = `"${texto}" → ${JSON.stringify(r)}`
      assert.ok(r.titulo.trim() || r.classe === 'despesa' || r.classe === 'receita', `título vazio: ${onde}`)
      if (r.classe === 'compromisso' || r.classe === 'lembrete') {
        assert.ok(Number.isFinite(r.quando), `sem quando: ${onde}`)
        assert.ok(r.quando! > AGORA.getTime() - 3 * DIA && r.quando! < AGORA.getTime() + 400 * DIA, `quando fora do razoável: ${onde}`)
        if (r.fim !== undefined) assert.ok(r.fim > r.quando! && r.fim - r.quando! <= DIA, `fim inválido: ${onde}`)
      }
      if (r.classe === 'despesa' || r.classe === 'receita') {
        assert.ok(Number.isInteger(r.valor) && r.valor !== 0, `valor inválido: ${onde}`)
        assert.equal(Math.sign(r.valor!), r.classe === 'receita' ? 1 : -1, `sinal trocado: ${onde}`)
        if (r.data) assert.match(r.data, /^\d{4}-\d{2}-\d{2}$/, onde)
      }
      assert.ok(['compromisso', 'lembrete', 'despesa', 'receita', 'passo'].includes(r.classe), `classe que não se cria sozinha: ${onde}`)
    }
  }
})

test('nas frases rotuladas à mão, o que as regras criam sozinhas tem sempre o tipo certo', () => {
  const rotuladas = readFileSync('dados/motor/exemplos.jsonl', 'utf8')
    .split(/\r?\n/)
    .filter(Boolean)
    .map((l) => JSON.parse(l) as { texto: string; classe: string })
  let criadas = 0
  for (const e of rotuladas) {
    const d = decidir(e.texto, AGORA)
    if (!('criar' in d)) continue
    criadas++
    assert.equal(d.criar.classe, e.classe, `"${e.texto}" foi criado como ${d.criar.classe}`)
  }
  // Se as regras pararem de criar quase tudo, o teste deixa de provar alguma coisa.
  assert.ok(criadas >= 40, `só ${criadas} criadas pelas regras`)
})
