// Muda a versão do app em um lugar só.
// Uso: npm run versao -- patch | minor | major | 1.2.3
//
// O package.json é a única fonte: o Android (android/app/build.gradle) e o Windows
// (src-tauri/tauri.conf.json) leem a versão de lá. Aqui só acertamos o Cargo.toml, que aparece
// nas propriedades do executável do Windows.
import { execSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'

const pedido = process.argv[2]
if (!pedido) {
  console.error('Uso: npm run versao -- patch | minor | major | 1.2.3')
  process.exit(1)
}

execSync(`npm version ${pedido} --no-git-tag-version --allow-same-version`, { stdio: 'ignore' })
const { version } = JSON.parse(readFileSync('package.json', 'utf8'))

const cargo = readFileSync('src-tauri/Cargo.toml', 'utf8')
writeFileSync('src-tauri/Cargo.toml', cargo.replace(/^version = ".*"$/m, `version = "${version}"`))

const [maior, menor, correcao] = version.split('.').map((n) => Number.parseInt(n, 10))
console.log(`Versão ${version}`)
console.log(`  Android: versionName ${version}, versionCode ${maior * 10000 + menor * 100 + correcao}`)
console.log(`  Windows: ${version}`)
console.log('Depois: npm run android:release e npm run windows:release')
