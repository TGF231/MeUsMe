import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Remota } from './planejar'

/**
 * Servidor de sincronização: um projeto Supabase seu (plano gratuito).
 * A chave "anon"/"publishable" pode ficar no app: quem protege os dados é a regra de segurança
 * do banco (cada usuário só lê e escreve as próprias linhas), criada pelo script supabase/esquema.sql.
 */

const CHAVE = 'meusme-sync-config'
const TABELA = 'registros'

export interface ConfigSync {
  url: string
  chave: string
}

export function lerConfigSync(): ConfigSync | null {
  try {
    return JSON.parse(localStorage.getItem(CHAVE) ?? 'null')
  } catch {
    return null
  }
}

export function salvarConfigSync(c: ConfigSync) {
  localStorage.setItem(CHAVE, JSON.stringify({ url: c.url.trim().replace(/\/+$/, ''), chave: c.chave.trim() }))
  cliente = null
}

export function apagarConfigSync() {
  localStorage.removeItem(CHAVE)
  cliente = null
}

/** Código para colar no outro aparelho (endereço + chave pública, nada secreto). */
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

/** Traduz os erros mais comuns para algo que dá para agir. */
function explicar(erro: { message?: string; code?: string } | null): Error {
  const msg = erro?.message ?? 'erro desconhecido'
  if (erro?.code === 'PGRST205' || erro?.code === '42P01' || (/registros/.test(msg) && /not find|does not exist/i.test(msg)))
    return new Error('A tabela de sincronização não existe. Rode o script de configuração no SQL Editor do Supabase.')
  if (/Invalid login credentials/i.test(msg)) return new Error('E-mail ou senha incorretos.')
  if (/Email not confirmed/i.test(msg)) return new Error('Confirme o e-mail pelo link que o Supabase enviou e tente entrar de novo.')
  if (/User already registered/i.test(msg)) return new Error('Já existe uma conta com este e-mail. Use "Entrar".')
  if (/Failed to fetch|NetworkError|Load failed/i.test(msg)) return new Error('Sem conexão com o servidor. As mudanças ficam guardadas e sobem quando a internet voltar.')
  if (/JWT|apikey|Invalid API key/i.test(msg)) return new Error('Endereço ou chave do Supabase inválidos. Confira em Ajustes.')
  return new Error(msg)
}

export async function usuarioAtual() {
  const c = obterCliente()
  if (!c) return null
  const { data } = await c.auth.getSession()
  const u = data.session?.user
  return u ? { id: u.id, email: u.email ?? '' } : null
}

export async function entrar(email: string, senha: string) {
  const { error } = await exigirCliente().auth.signInWithPassword({ email, password: senha })
  if (error) throw explicar(error)
}

/** Devolve true se o Supabase pediu confirmação por e-mail antes do primeiro login. */
export async function criarConta(email: string, senha: string) {
  const { data, error } = await exigirCliente().auth.signUp({ email, password: senha })
  if (error) throw explicar(error)
  return !data.session
}

export async function sair() {
  await obterCliente()?.auth.signOut()
}

/** Avisa com o id do usuário logado (ou null) a cada evento de login; inclui renovação de token. */
export function aoMudarLogin(ouvinte: (usuario: string | null) => void) {
  const c = obterCliente()
  if (!c) return () => {}
  const { data } = c.auth.onAuthStateChange((_evento, sessao) => ouvinte(sessao?.user.id ?? null))
  return () => data.subscription.unsubscribe()
}

export interface LinhaServidor extends Remota {
  atualizado_em: string
}

/** Tudo o que mudou no servidor desde `desde` (ISO), em páginas de 1000. */
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

/** Envia mudanças em lotes. Devolve o maior carimbo de tempo gravado pelo servidor. */
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

/** Tempo real: avisa quando outro aparelho grava algo. */
export function ouvirServidor(usuario: string, ouvinte: () => void) {
  const c = obterCliente()
  if (!c) return () => {}
  const canal = c
    .channel(`registros-${usuario}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: TABELA, filter: `usuario=eq.${usuario}` }, () => ouvinte())
    .subscribe()
  return () => void c.removeChannel(canal)
}
