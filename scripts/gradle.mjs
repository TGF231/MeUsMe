// Executa o Gradle do projeto Android (gradlew.bat no Windows, ./gradlew nos demais).
// Uso: node scripts/gradle.mjs <tarefas...>
import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { join } from 'node:path'

const tarefas = process.argv.slice(2)
const pasta = join(process.cwd(), 'android')
const windows = process.platform === 'win32'

if (tarefas.some((t) => /release/i.test(t)) && !existsSync(join(pasta, 'keystore.properties')))
  console.warn('Aviso: android/keystore.properties não existe, então o release sai SEM assinatura (não serve para a loja). Ver PRODUCAO.md.')

// Caminho absoluto: o cmd pode estar configurado para não buscar executáveis no diretório atual.
const gradlew = join(pasta, windows ? 'gradlew.bat' : 'gradlew')
const r = spawnSync(windows ? `"${gradlew}"` : gradlew, [...tarefas, '--console=plain'], {
  cwd: pasta,
  stdio: 'inherit',
  shell: windows,
})
process.exit(r.status ?? 1)
