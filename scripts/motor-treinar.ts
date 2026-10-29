// Treina a rede do motor e grava src/motor/pesos.json (docs/MOTOR.md, parte 2).
// Uso: npm run motor:treinar
//
// 1. Separa 1/4 dos exemplos escritos à mão para validar e treina com o resto + os gerados.
// 2. Mostra o acerto nessa validação (é uma conferência rápida; a trava de verdade é o
//    motor:avaliar, com as suas capturas reais).
// 3. Treina de novo com tudo e grava os pesos. A criação automática volta a ficar desligada
//    até o motor:avaliar medir os pesos novos.
import { readFileSync, writeFileSync } from 'node:fs'
import { CLASSES, gerarExemplos, type ExemploBruto } from '../dados/motor/modelos.ts'
import { caracteristicas, fnv1a, VERSAO_CARACTERISTICAS } from '../src/motor/caracteristicas.ts'
import { geradorComSemente, gravar, novaRede, prever, treinar, type Exemplo, type OpcoesTreino } from '../src/motor/rede.ts'

export const OPCOES: OpcoesTreino = { epocas: 25, lote: 16, taxa: 0.005, l2: 1e-4, dropout: 0.2, semente: 42 }
export const POR_CLASSE = 250

/** Hash de tudo que muda os pesos: um teste compara com o gravado em pesos.json. */
export function hashDosDados() {
  const fontes = ['dados/motor/exemplos.jsonl', 'dados/motor/modelos.ts', 'src/motor/caracteristicas.ts', 'src/motor/rede.ts']
  const tudo = fontes.map((f) => readFileSync(f, 'utf8').replace(/\r\n/g, '\n')).join('\0') + JSON.stringify({ OPCOES, POR_CLASSE, VERSAO_CARACTERISTICAS })
  return fnv1a(tudo).toString(16).padStart(8, '0')
}

export const lerJsonl = (arquivo: string): ExemploBruto[] =>
  readFileSync(arquivo, 'utf8')
    .split(/\r?\n/)
    .filter((l) => l.trim())
    .map((l) => JSON.parse(l) as ExemploBruto)

const paraExemplo = (e: ExemploBruto): Exemplo => {
  const y = CLASSES.indexOf(e.classe)
  if (y < 0) throw new Error(`Classe desconhecida "${e.classe}" em "${e.texto}"`)
  return { x: caracteristicas(e.texto), y }
}

function main() {
  const manuais = lerJsonl('dados/motor/exemplos.jsonl')
  const gerados = gerarExemplos(geradorComSemente(OPCOES.semente), POR_CLASSE)
  const validacao = manuais.filter((e) => fnv1a(e.texto) % 4 === 0)
  const treino = [...manuais.filter((e) => fnv1a(e.texto) % 4 !== 0), ...gerados]
  console.log(`${manuais.length} exemplos escritos à mão, ${gerados.length} gerados; validação: ${validacao.length}`)

  const conferencia = treinar(novaRede(CLASSES, geradorComSemente(OPCOES.semente)), treino.map(paraExemplo), OPCOES)
  const matriz = CLASSES.map(() => CLASSES.map(() => 0))
  for (const e of validacao) {
    const p = prever(conferencia, caracteristicas(e.texto))
    const previsto = p.indexOf(Math.max(...p))
    matriz[CLASSES.indexOf(e.classe)][previsto]++
    if (CLASSES[previsto] !== e.classe) console.log(`  errou: "${e.texto}" → ${CLASSES[previsto]} (era ${e.classe}, ${(p[previsto] * 100).toFixed(0)}%)`)
  }
  const acertos = matriz.reduce((s, linha, i) => s + linha[i], 0)
  console.log(`\nValidação (frases à mão fora do treino): ${acertos}/${validacao.length} = ${((acertos / validacao.length) * 100).toFixed(0)}%`)
  console.log(`\n${'certo \\ previsto'.padEnd(14)}${CLASSES.map((c) => c.slice(0, 6).padStart(8)).join('')}`)
  matriz.forEach((linha, i) => console.log(`${CLASSES[i].padEnd(14)}${linha.map((n) => String(n).padStart(8)).join('')}`))

  const rede = treinar(novaRede(CLASSES, geradorComSemente(OPCOES.semente)), [...manuais, ...gerados].map(paraExemplo), OPCOES)
  const pesos = gravar(rede, { versaoCaracteristicas: VERSAO_CARACTERISTICAS, hashDados: hashDosDados(), automatico: { liberado: false, limiar: 1 } })
  writeFileSync('src/motor/pesos.json', JSON.stringify(pesos) + '\n')
  console.log(`\nPesos gravados em src/motor/pesos.json (hash ${pesos.hashDados}). Rode npm run motor:avaliar para medir com as capturas reais.`)
}

if (import.meta.main) main()
