// Roda o Gradle do projeto Android em qualquer sistema: gradlew.bat no Windows, ./gradlew no resto.
// Uso: node scripts/gradle.mjs <tarefas...>   (ex.: bundleRelease assembleRelease)
import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { join } from 'node:path'

const tarefas = process.argv.slice(2)
const pasta = join(process.cwd(), 'android')
const windows = process.platform === 'win32'

if (tarefas.some((t) => /release/i.test(t)) && !existsSync(join(pasta, 'keystore.properties')))
  console.warn('Aviso: android/keystore.properties não existe, então o release sai SEM assinatura (não serve para a loja). Ver PRODUCAO.md.')

// Caminho completo: no Windows, o cmd pode estar configurado para não procurar programas na pasta atual.
const gradlew = join(pasta, windows ? 'gradlew.bat' : 'gradlew')
const r = spawnSync(windows ? `"${gradlew}"` : gradlew, [...tarefas, '--console=plain'], {
  cwd: pasta,
  stdio: 'inherit',
  shell: windows,
})
process.exit(r.status ?? 1)
