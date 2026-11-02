/**
 * Entradas de fora do app (V03 e A1 em docs/CONCORRENTES.md):
 * - Android: "Compartilhar com o MeUsMe" e o atalho "Capturar por voz" chegam como meusme://captura?texto=…&voz=1
 *   (a MainActivity converte o compartilhamento nesse link).
 * - Web instalada (PWA): o compartilhar do sistema abre /?titulo=…&texto=…&link=… (share_target no vite.config.ts).
 */

export interface Entrada {
  /** Texto a guardar na Caixa. */
  texto?: string
  /** Abrir a captura já ouvindo. */
  voz?: boolean
  /** Abrir a captura rápida (bloco das Configurações rápidas, V02). */
  abrir?: boolean
}

/** Junta título, texto e link do compartilhamento sem repetir: muitos apps mandam o link dentro do texto. */
function juntar(partes: (string | null)[]) {
  const unicas: string[] = []
  for (const p of partes.map((x) => x?.trim()).filter(Boolean) as string[]) if (!unicas.some((u) => u.includes(p))) unicas.push(p)
  return unicas.join(' ').slice(0, 2000)
}

export function lerEntrada(url: string): Entrada | null {
  let u: URL
  try {
    u = new URL(url)
  } catch {
    return null
  }
  const q = u.searchParams
  const doApp = u.protocol === 'meusme:' && (u.hostname === 'captura' || u.pathname.replace(/^\/+/, '') === 'captura')
  const daWeb = u.protocol.startsWith('http') && ['titulo', 'texto', 'link'].some((p) => q.has(p))
  if (!doApp && !daWeb) return null
  const texto = juntar([q.get('titulo'), q.get('texto'), q.get('link')])
  const entrada: Entrada = {}
  if (texto) entrada.texto = texto
  if (q.get('voz') === '1') entrada.voz = true
  if (q.get('abrir') === '1') entrada.abrir = true
  return entrada.texto || entrada.voz || entrada.abrir ? entrada : null
}
