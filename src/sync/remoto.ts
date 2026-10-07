import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Remota } from './planejar'

/**
 * Cliente Supabase.
 *
 * Servidor embutido no build (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY) ou servidor próprio
 * salvo neste aparelho, que tem precedência.
 * A chave anon é pública por design; o isolamento entre usuários vem do RLS (supabase/esquema.sql).
 */

const CHAVE = 'meusme-sync-config'
const TABELA = 'registros'

export interface ConfigSync {
  url: string
  chave: string
}

const EMBUTIDO: ConfigSync | null =
  import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY
    ? { url: import.meta.env.VITE_SUPABASE_URL, chave: import.meta.env.VITE_SUPABASE_ANON_KEY }
    : null

/** Build com servidor embutido. */
export const temServidorEmbutido = () => EMBUTIDO !== null

function lerServidorProprio(): ConfigSync | null {
  try {
    return JSON.parse(localStorage.getItem(CHAVE) ?? 'null')
  } catch {
    return null
  }
}

export const usandoServidorProprio = () => lerServidorProprio() !== null

export function lerConfigSync(): ConfigSync | null {
  return lerServidorProprio() ?? EMBUTIDO
}

export function salvarConfigSync(c: ConfigSync) {
  localStorage.setItem(CHAVE, JSON.stringify({ url: c.url.trim().replace(/\/+$/, ''), chave: c.chave.trim() }))
  cliente = null
}

/** Remove o servidor próprio (volta ao embutido, se houver). */
export function apagarConfigSync() {
  localStorage.removeItem(CHAVE)
  cliente = null
}

/** Código de configuração para outros aparelhos (URL e chave pública). Só para servidor próprio. */
export const codigoDeConfiguracao = (c: ConfigSync) => btoa(JSON.stringify(c))

export function lerCodigoDeConfiguracao(codigo: string): ConfigSync | null {
  try {
    const c = JSON.parse(atob(codigo.trim())) as ConfigSync
    return c.url && c.chave ? c : null
  } catch {
    return null
  }
}

let cliente: SupabaseClient | null = null

export function obterCliente() {
  const cfg = lerConfigSync()
  if (!cfg) return null
  cliente ??= createClient(cfg.url, cfg.chave, {
    auth: { persistSession: true, autoRefreshToken: true, storageKey: 'meusme-sync-sessao' },
  })
  return cliente
}

function exigirCliente() {
  const c = obterCliente()
  if (!c) throw new Error('Sincronização não configurada.')
  return c
}

/** Converte erros do Supabase em mensagens para o usuário. */
function explicar(erro: { message?: string; code?: string } | null): Error {
  const msg = erro?.message ?? 'erro desconhecido'
  if (erro?.code === 'PGRST205' || erro?.code === '42P01' || (/registros/.test(msg) && /not find|does not exist/i.test(msg)))
    return new Error('O servidor ainda não foi preparado: falta rodar o script supabase/esquema.sql.')
  if (/token has expired|invalid|otp/i.test(msg) && /token|otp/i.test(msg)) return new Error('Código errado ou vencido. Peça um novo.')
  if (/rate limit|security purposes|only request this after/i.test(msg))
    return new Error('Muitos pedidos de código seguidos. Espere um minuto e tente de novo.')
  if (/Signups not allowed/i.test(msg)) return new Error('Novas contas estão desativadas neste servidor.')
  if (/Failed to fetch|NetworkError|Load failed/i.test(msg))
    return new Error('Sem conexão com o servidor agora. Confira a internet; nada do que está neste aparelho se perde.')
  if (/JWT|apikey|Invalid API key/i.test(msg)) return new Error('Endereço ou chave do servidor inválidos.')
  return new Error(msg)
}

export async function usuarioAtual() {
  const c = obterCliente()
  if (!c) return null
  const { data } = await c.auth.getSession()
  const u = data.session?.user
  return u ? { id: u.id, email: u.email ?? '' } : null
}

/** Login por OTP de e-mail (cria a conta no primeiro acesso). Não depende de deep links. */
export async function enviarCodigo(email: string) {
  const { error } = await exigirCliente().auth.signInWithOtp({ email, options: { shouldCreateUser: true } })
  if (error) throw explicar(error)
}

export async function confirmarCodigo(email: string, codigo: string) {
  const { error } = await exigirCliente().auth.verifyOtp({ email, token: codigo.replace(/\D/g, ''), type: 'email' })
  if (error) throw explicar(error)
}

export async function sair() {
  await obterCliente()?.auth.signOut()
}

/** Remove a conta e os dados no servidor (RPC apagar_minha_conta). Os dados locais permanecem. */
export async function apagarConta() {
  const c = exigirCliente()
  const { error } = await c.rpc('apagar_minha_conta')
  if (error) throw explicar(error)
  await c.auth.signOut()
}

/** Emite o id do usuário a cada evento de auth, inclusive renovação de token. */
export function aoMudarLogin(ouvinte: (usuario: string | null) => void) {
  const c = obterCliente()
  if (!c) return () => {}
  const { data } = c.auth.onAuthStateChange((_evento, sessao) => ouvinte(sessao?.user.id ?? null))
  return () => data.subscription.unsubscribe()
}

export interface LinhaServidor extends Remota {
  atualizado_em: string
}

/** Linhas alteradas desde `desde` (ISO), paginadas de 1000 em 1000. */
export async function baixar(desde: string | null): Promise<LinhaServidor[]> {
  const c = exigirCliente()
  const linhas: LinhaServidor[] = []
  for (let de = 0; ; de += 1000) {
    let q = c.from(TABELA).select('colecao,id,dados,apagado,atualizado_em').order('atualizado_em').range(de, de + 999)
    if (desde) q = q.gt('atualizado_em', desde)
    const { data, error } = await q
    if (error) throw explicar(error)
    linhas.push(...(data as LinhaServidor[]))
    if (data.length < 1000) return linhas
  }
}

/** Upsert em lotes; retorna o maior atualizado_em gravado. */
export async function enviar(usuario: string, registros: Remota[]): Promise<string | null> {
  const c = exigirCliente()
  let maior: string | null = null
  for (let i = 0; i < registros.length; i += 500) {
    const lote = registros.slice(i, i + 500).map((r) => ({ usuario, colecao: r.colecao, id: r.id, dados: r.apagado ? null : r.dados, apagado: r.apagado }))
    const { data, error } = await c.from(TABELA).upsert(lote, { onConflict: 'usuario,colecao,id' }).select('atualizado_em')
    if (error) throw explicar(error)
    for (const l of data as { atualizado_em: string }[]) if (!maior || l.atualizado_em > maior) maior = l.atualizado_em
  }
  return maior
}

/** Assinatura do Realtime para mudanças do usuário. */
export function ouvirServidor(usuario: string, ouvinte: () => void) {
  const c = obterCliente()
  if (!c) return () => {}
  const canal = c
    .channel(`registros-${usuario}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: TABELA, filter: `usuario=eq.${usuario}` }, () => ouvinte())
    .subscribe()
  return () => void c.removeChannel(canal)
}
