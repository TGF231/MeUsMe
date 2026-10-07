// Cria a chave de assinatura do Android (uma vez) e a envia para os segredos do repositório no GitHub,
// de onde o fluxo de release (.github/workflows/release.yml) assina o APK e o AAB.
// Uso: npm run android:chave
// Se android/keystore.properties já existir, reaproveita a chave e só reenvia os segredos.
import { spawnSync } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

const pasta = join(process.cwd(), 'android')
const propriedades = join(pasta, 'keystore.properties')
const windows = process.platform === 'win32'

/** Primeiro caminho que existir; senão o nome puro, buscado no PATH. */
const achar = (nome, caminhos) => caminhos.find((c) => c && existsSync(c)) ?? nome

function rodar(exe, args, opcoes = {}) {
  const r = spawnSync(exe, args, { stdio: ['pipe', 'inherit', 'inherit'], ...opcoes })
  if (r.error || r.status !== 0) {
    console.error(`Falhou: ${exe} ${args[0]}`, r.error?.message ?? '')
    process.exit(1)
  }
}

if (!existsSync(propriedades)) {
  const keytool = achar('keytool', [
    process.env.JAVA_HOME && join(process.env.JAVA_HOME, 'bin', windows ? 'keytool.exe' : 'keytool'),
    windows && 'C:\\Program Files\\Android\\Android Studio\\jbr\\bin\\keytool.exe',
  ])
  const senha = randomBytes(24).toString('base64url')
  // PKCS12 usa a mesma senha para o arquivo e para a chave. A senha vai por variável de ambiente, fora da linha de comando.
  rodar(
    keytool,
    ['-genkeypair', '-keystore', join(pasta, 'meusme-upload.jks'), '-storetype', 'PKCS12', '-alias', 'meusme',
      '-keyalg', 'RSA', '-keysize', '2048', '-validity', '10000', '-dname', 'CN=MeUsMe',
      '-storepass:env', 'MEUSME_SENHA', '-keypass:env', 'MEUSME_SENHA'],
    { env: { ...process.env, MEUSME_SENHA: senha } },
  )
  writeFileSync(propriedades, `storeFile=meusme-upload.jks\nstorePassword=${senha}\nkeyAlias=meusme\nkeyPassword=${senha}\n`)
  console.log('Chave criada em android/meusme-upload.jks; a senha está em android/keystore.properties.')
}

const p = Object.fromEntries(
  readFileSync(propriedades, 'utf8')
    .split(/\r?\n/)
    .filter((l) => l.includes('='))
    .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]),
)

const gh = achar('gh', [windows && 'C:\\Program Files\\GitHub CLI\\gh.exe'])
const segredos = {
  ANDROID_KEYSTORE_BASE64: readFileSync(resolve(pasta, p.storeFile)).toString('base64'),
  ANDROID_KEYSTORE_PASSWORD: p.storePassword,
  ANDROID_KEY_ALIAS: p.keyAlias,
  ANDROID_KEY_PASSWORD: p.keyPassword,
}
// Sem --body, o gh lê o valor da entrada padrão.
for (const [nome, valor] of Object.entries(segredos)) rodar(gh, ['secret', 'set', nome], { input: valor })

console.log('\nSegredos enviados ao GitHub.')
console.log('Guarde uma cópia de android/meusme-upload.jks e android/keystore.properties fora deste computador:')
console.log('sem eles, um app já instalado não aceita a próxima versão.')
