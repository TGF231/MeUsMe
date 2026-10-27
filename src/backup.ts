/** Backup em arquivo JSON (testes em testes/backup.test.ts). */

export const CHAVES_BACKUP = ['meusme', 'meusme-financas', 'meusme-agenda', 'meusme-config']
const VERSAO = 1

/** Monta o arquivo a partir de uma função de leitura (localStorage.getItem, no app). */
export function montarBackup(ler: (chave: string) => string | null) {
  const dados = Object.fromEntries(CHAVES_BACKUP.map((k) => [k, ler(k)]))
  return JSON.stringify({ app: 'MeUsMe', versao: VERSAO, dados }, null, 2)
}

/**
 * Lê e valida o arquivo inteiro antes de qualquer gravação: um arquivo pela metade não pode deixar
 * dados pela metade. Retorna só as chaves presentes, prontas para gravar; lança Error com mensagem para a pessoa.
 */
export function lerBackup(texto: string): Record<string, string> {
  let backup: { app?: unknown; versao?: unknown; dados?: Record<string, unknown> }
  try {
    backup = JSON.parse(texto)
  } catch {
    throw new Error('O arquivo não é um backup válido. Nada foi alterado.')
  }
  if (!backup || backup.app !== 'MeUsMe') throw new Error('Este arquivo não é um backup do MeUsMe.')
  if (typeof backup.versao === 'number' && backup.versao > VERSAO)
    throw new Error('Este backup é de uma versão mais nova do MeUsMe. Atualize o app e tente de novo.')

  const saida: Record<string, string> = {}
  for (const k of CHAVES_BACKUP) {
    const v = backup.dados?.[k]
    if (typeof v !== 'string') continue
    let conteudo: { state?: unknown }
    try {
      conteudo = JSON.parse(v)
    } catch {
      throw new Error('O backup está danificado. Nada foi alterado.')
    }
    if (!conteudo || typeof conteudo.state !== 'object' || conteudo.state === null) throw new Error('O backup está danificado. Nada foi alterado.')
    saida[k] = v
  }
  if (Object.keys(saida).length === 0) throw new Error('O backup está vazio. Nada foi alterado.')
  return saida
}
