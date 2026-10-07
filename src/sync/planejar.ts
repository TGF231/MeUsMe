/**
 * Mesclagem de sincronização (sem dependências; testes em testes/sincronizacao.test.ts).
 *
 * Três versões por registro: local, base (hash da última versão sincronizada) e remota.
 * - Mudou só de um lado: esse lado prevalece.
 * - Mudou dos dois lados: prevalece o local.
 * - Registro nunca sincronizado neste aparelho: prevalece o servidor, para um aparelho novo
 *   não sobrescrever dados existentes com valores padrão.
 */

/** JSON com chaves ordenadas: o jsonb do Postgres não preserva a ordem das chaves. */
export function canonico(v: unknown): string {
  if (v === undefined) return 'null'
  if (v === null || typeof v !== 'object') return JSON.stringify(v)
  if (Array.isArray(v)) return `[${v.map(canonico).join(',')}]`
  const obj = v as Record<string, unknown>
  const chaves = Object.keys(obj).filter((k) => obj[k] !== undefined).sort()
  return `{${chaves.map((k) => `${JSON.stringify(k)}:${canonico(obj[k])}`).join(',')}}`
}

/** Hash curto (cyrb53) para a base não duplicar os dados no localStorage. */
export function hash(texto: string): string {
  let h1 = 0xdeadbeef
  let h2 = 0x41c6ce57
  for (let i = 0; i < texto.length; i++) {
    const c = texto.charCodeAt(i)
    h1 = Math.imul(h1 ^ c, 2654435761)
    h2 = Math.imul(h2 ^ c, 1597334677)
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909)
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909)
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36)
}

/** Por coleção e id: JSON canônico do registro (ausente = removido). */
export type Locais = Record<string, Record<string, string>>
/** Por coleção e id: hash da última versão sincronizada. */
export type Base = Record<string, Record<string, string>>

export interface Remota {
  colecao: string
  id: string
  dados: unknown
  apagado: boolean
}

export interface Plano {
  /** Mudanças remotas a aplicar: JSON canônico, ou null para remover. */
  aplicar: Record<string, Record<string, string | null>>
  /** Mudanças locais para enviar. */
  enviar: Remota[]
  /** Base após aplicar as remotas; as enviadas entram só após confirmação (confirmarEnvio). */
  base: Base
}

export function planejar(locais: Locais, base: Base, remotas: Remota[]): Plano {
  const novaBase: Base = Object.fromEntries(Object.entries(base).map(([c, m]) => [c, { ...m }]))
  const aplicar: Plano['aplicar'] = {}
  const depois: Locais = Object.fromEntries(Object.entries(locais).map(([c, m]) => [c, { ...m }]))

  for (const r of remotas) {
    const json = r.apagado ? null : canonico(r.dados)
    const local = locais[r.colecao]?.[r.id] ?? null
    const baseHash = base[r.colecao]?.[r.id] ?? null
    novaBase[r.colecao] ??= {}

    if (json === local) {
      // Já iguais: só atualiza a base.
      if (json === null) delete novaBase[r.colecao][r.id]
      else novaBase[r.colecao][r.id] = hash(json)
      continue
    }
    const localMudou = (local === null ? null : hash(local)) !== baseHash
    const servidorVence = !localMudou || baseHash === null
    if (!servidorVence) continue

    ;(aplicar[r.colecao] ??= {})[r.id] = json
    depois[r.colecao] ??= {}
    if (json === null) {
      delete depois[r.colecao][r.id]
      delete novaBase[r.colecao][r.id]
    } else {
      depois[r.colecao][r.id] = json
      novaBase[r.colecao][r.id] = hash(json)
    }
  }

  // Diferenças restantes em relação à base são mudanças locais.
  const enviar: Remota[] = []
  const colecoes = new Set([...Object.keys(depois), ...Object.keys(novaBase)])
  for (const c of colecoes) {
    const loc = depois[c] ?? {}
    const bas = novaBase[c] ?? {}
    for (const [id, json] of Object.entries(loc)) {
      if (hash(json) !== bas[id]) enviar.push({ colecao: c, id, dados: JSON.parse(json), apagado: false })
    }
    for (const id of Object.keys(bas)) {
      if (!(id in loc)) enviar.push({ colecao: c, id, dados: null, apagado: true })
    }
  }

  return { aplicar, enviar, base: novaBase }
}

/** Atualiza a base com os registros confirmados pelo servidor. */
export function confirmarEnvio(base: Base, enviados: Remota[]): Base {
  const nova: Base = Object.fromEntries(Object.entries(base).map(([c, m]) => [c, { ...m }]))
  for (const r of enviados) {
    nova[r.colecao] ??= {}
    if (r.apagado) delete nova[r.colecao][r.id]
    else nova[r.colecao][r.id] = hash(canonico(r.dados))
  }
  return nova
}
