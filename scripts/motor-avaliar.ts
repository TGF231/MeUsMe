// Mede o motor com capturas reais e decide se a rede pode criar sozinha (docs/MOTOR.md).
// Uso: npm run motor:avaliar
//
// Lê dados/motor/avaliacao.jsonl: frases reais, do jeito que foram escritas, com a classe
// certa. Elas nunca entram no treino. O script:
//   1. compara só regras × regras + rede no acerto do tipo (a rede tem que ganhar);
//   2. procura a menor certeza em que o que a rede criaria sozinha erra no máximo 2%;
//   3. se achar, e houver frases suficientes, libera a criação automática em pesos.json.
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { CLASSES, type ExemploBruto } from '../dados/motor/modelos.ts'
import { decidir, palpite, type MotorRede } from '../src/motor/interpretar.ts'
import { ler, type PesosGravados, type Rede } from '../src/motor/rede.ts'
import { aplicarRegras, type Interpretacao } from '../src/motor/regras.ts'
import { hashDosDados, lerJsonl } from './motor-treinar.ts'

const ARQUIVO = 'dados/motor/avaliacao.jsonl'
const MINIMO_DE_FRASES = 50
const MINIMO_CRIADAS = 10
const ERRO_MAXIMO = 0.02
const LIMIARES = [0.6, 0.65, 0.7, 0.75, 0.8, 0.85, 0.9, 0.95, 0.97, 0.99]

interface Candidata {
  certeza: number
  certo: boolean
}

const pct = (n: number, d: number) => `${n}/${d} = ${d ? ((n / d) * 100).toFixed(0) : 0}%`

/** O que a rede criaria sozinha se liberada: a direção de um valor sem sinal, ou tarefa solta sem regra. */
function candidataDe(rede: Rede, f: ExemploBruto, r: Interpretacao | null): Candidata | null {
  if (r?.falta === 'direcao') {
    const p = palpite(rede, f.texto, ['despesa', 'receita'])
    return { certeza: p.certeza, certo: p.classe === f.classe }
  }
  if (r) return null
  const p = palpite(rede, f.texto)
  return p.classe === 'passo' ? { certeza: p.certeza, certo: f.classe === 'passo' } : null
}

/** Acerto do tipo só com regras e com regras + rede, e as candidatas à criação automática. */
function medir(rede: Rede, frases: ExemploBruto[]) {
  // As regras de hora e data precisam de um "agora"; o tipo não depende de qual.
  const agora = new Date()
  const semTrava: MotorRede = { rede, liberado: false, limiar: 1 }
  let soRegras = 0
  let comRede = 0
  const candidatas: Candidata[] = []
  for (const f of frases) {
    const r = aplicarRegras(f.texto, agora)
    if (r?.classe === f.classe) soRegras++
    const d = decidir(f.texto, agora, { rede: semTrava })
    const tipo = 'criar' in d ? d.criar.classe : d.sugestao
    if (tipo === f.classe) comRede++
    else console.log(`  errou: "${f.texto}" → ${tipo ?? 'Caixa sem sugestão'} (era ${f.classe})`)
    const c = candidataDe(rede, f, r)
    if (c) candidatas.push(c)
  }
  return { soRegras, comRede, candidatas }
}

/** A menor certeza em que o que seria criado sozinho erra no máximo ERRO_MAXIMO, com pelo menos MINIMO_CRIADAS itens. */
function escolherLimiar(candidatas: Candidata[]): number | null {
  console.log('certeza  criaria  erradas')
  let escolhido: number | null = null
  for (const limiar of LIMIARES) {
    const criadas = candidatas.filter((c) => c.certeza >= limiar)
    const erradas = criadas.filter((c) => !c.certo)
    console.log(`${String(Math.round(limiar * 100)).padStart(6)}%  ${String(criadas.length).padStart(7)}  ${pct(erradas.length, criadas.length)}`)
    if (escolhido === null && criadas.length >= MINIMO_CRIADAS && erradas.length / criadas.length <= ERRO_MAXIMO) escolhido = limiar
  }
  return escolhido
}

function lerFrases(): ExemploBruto[] | null {
  if (!existsSync(ARQUIVO)) {
    console.log(`Falta ${ARQUIVO}. Uma frase real por linha, com a classe certa, por exemplo:`)
    console.log(`{"texto":"ver o negocio do carro","classe":"passo"}`)
    console.log(`Classes: ${CLASSES.join(', ')}. Pelo menos ${MINIMO_DE_FRASES} frases; veja dados/motor/LEIA-ME.md.`)
    return null
  }
  const frases = lerJsonl(ARQUIVO)
  for (const f of frases) if (!CLASSES.includes(f.classe)) throw new Error(`Classe desconhecida "${f.classe}" em "${f.texto}"`)
  return frases
}

function main() {
  const frases = lerFrases()
  if (!frases) return
  const pesos = JSON.parse(readFileSync('src/motor/pesos.json', 'utf8')) as PesosGravados
  if (pesos.hashDados !== hashDosDados()) throw new Error('Os pesos estão desatualizados: rode npm run motor:treinar antes.')

  const { soRegras, comRede, candidatas } = medir(ler(pesos), frases)
  console.log(`\nTipo certo, só regras:     ${pct(soRegras, frases.length)}`)
  console.log(`Tipo certo, regras + rede: ${pct(comRede, frases.length)}`)
  console.log(`\nCriação automática pela rede (tarefa solta e direção de valor):`)
  const escolhido = escolherLimiar(candidatas)

  const motivos: string[] = []
  if (frases.length < MINIMO_DE_FRASES) motivos.push(`só ${frases.length} frases (mínimo ${MINIMO_DE_FRASES})`)
  if (comRede <= soRegras) motivos.push('a rede não acerta mais tipos que as regras sozinhas')
  if (escolhido === null) motivos.push(`nenhuma certeza cria pelo menos ${MINIMO_CRIADAS} itens com até ${ERRO_MAXIMO * 100}% de erro`)

  const medidoEm = new Date().toISOString().slice(0, 10)
  pesos.automatico = motivos.length || escolhido === null ? { liberado: false, limiar: 1, medidoEm } : { liberado: true, limiar: escolhido, medidoEm }
  writeFileSync('src/motor/pesos.json', JSON.stringify(pesos) + '\n')
  console.log(
    pesos.automatico.liberado
      ? `\nCriação automática pela rede: LIGADA a partir de ${Math.round(pesos.automatico.limiar * 100)}% de certeza.`
      : `\nCriação automática pela rede: DESLIGADA (${motivos.join('; ')}). A rede continua sugerindo na Caixa.`,
  )
}

if (import.meta.main) main()
