import { useAgenda } from './stores/agenda'
import { paraEventos, type EventoGoogle } from './googleEventos'
import type { Evento } from './types'

/**
 * Google Agenda via Google Identity Services (token client), sem backend.
 * O token expira em ~1 h; renovar exige interação do usuário (popup).
 */

const ESCOPO = 'https://www.googleapis.com/auth/calendar.events'
/** Eventos de uma agenda. Com o escopo calendar.events dá para ler qualquer agenda a que a conta tem acesso, pelo ID. */
const eventosDe = (agenda: string) => `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(agenda)}/events`
const API = eventosDe('primary')
const CHAVE_TOKEN = 'meusme-google-token'

interface RespostaToken {
  access_token?: string
  expires_in?: number
  error?: string
}

interface ClienteToken {
  requestAccessToken: (o?: { prompt?: string }) => void
}

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (c: {
            client_id: string
            scope: string
            callback: (r: RespostaToken) => void
            error_callback?: (e: { type: string }) => void
          }) => ClienteToken
          revoke: (token: string, feito?: () => void) => void
        }
      }
    }
  }
}

export class ErroGoogle extends Error {
  readonly precisaReconectar: boolean
  constructor(mensagem: string, precisaReconectar = false) {
    super(mensagem)
    this.precisaReconectar = precisaReconectar
  }
}

let carregando: Promise<void> | null = null
function carregarScript() {
  if (window.google?.accounts) return Promise.resolve()
  carregando ??= new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.src = 'https://accounts.google.com/gsi/client'
    s.async = true
    s.onload = () => resolve()
    s.onerror = () => {
      carregando = null
      reject(new ErroGoogle('Não consegui carregar o login do Google. Você está sem internet?'))
    }
    document.head.appendChild(s)
  })
  return carregando
}

function lerToken() {
  try {
    const t = JSON.parse(sessionStorage.getItem(CHAVE_TOKEN) ?? 'null') as { valor: string; expira: number } | null
    return t && Date.now() < t.expira - 60_000 ? t.valor : null
  } catch {
    return null
  }
}

export const temToken = () => lerToken() !== null

/** Solicita token. Deve partir de um gesto do usuário, senão o popup é bloqueado. */
export async function conectarGoogle(): Promise<string> {
  const { googleClientId } = useAgenda.getState()
  if (!googleClientId) throw new ErroGoogle('Falta o Client ID do Google. Configure em Ajustes.')
  await carregarScript()
  return new Promise((resolve, reject) => {
    const cliente = window.google!.accounts.oauth2.initTokenClient({
      client_id: googleClientId,
      scope: ESCOPO,
      callback: (r) => {
        if (r.error || !r.access_token) return reject(new ErroGoogle(`O Google recusou: ${r.error ?? 'sem token'}`))
        sessionStorage.setItem(
          CHAVE_TOKEN,
          JSON.stringify({ valor: r.access_token, expira: Date.now() + (r.expires_in ?? 3600) * 1000 }),
        )
        useAgenda.getState().configurarGoogle({ googleConectado: true })
        resolve(r.access_token)
      },
      error_callback: (e) =>
        reject(new ErroGoogle(e.type === 'popup_closed' ? 'A janela do Google foi fechada.' : `Erro no login: ${e.type}`)),
    })
    cliente.requestAccessToken({ prompt: useAgenda.getState().googleConectado ? '' : 'consent' })
  })
}

export function desconectarGoogle() {
  const token = lerToken()
  if (token) window.google?.accounts.oauth2.revoke(token)
  sessionStorage.removeItem(CHAVE_TOKEN)
  const s = useAgenda.getState()
  s.configurarGoogle({ googleConectado: false, ultimaSync: undefined })
  s.substituirGoogle([], -Infinity, Infinity)
}

async function api(url: string, init: RequestInit = {}) {
  const token = lerToken()
  if (!token) throw new ErroGoogle('A conexão com o Google expirou.', true)
  const r = await fetch(url, { ...init, headers: { ...init.headers, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } })
  if (r.status === 401) {
    sessionStorage.removeItem(CHAVE_TOKEN)
    throw new ErroGoogle('A conexão com o Google expirou.', true)
  }
  if (!r.ok) throw new ErroGoogle(`Google respondeu com erro ${r.status}.`)
  return r.status === 204 ? null : r.json()
}

/** Atualiza o cache local com eventos de ontem até +30 dias, da agenda principal e das outras escolhidas em Ajustes. */
export async function sincronizarGoogle() {
  const de = new Date().setHours(0, 0, 0, 0) - 86_400_000
  const ate = de + 32 * 86_400_000
  const params = new URLSearchParams({
    timeMin: new Date(de).toISOString(),
    timeMax: new Date(ate).toISOString(),
    singleEvents: 'true',
    orderBy: 'startTime',
    maxResults: '500',
  })
  const principal = (await api(`${API}?${params}`)) as { items: EventoGoogle[] }
  const eventos = paraEventos(principal.items)
  const falhas: string[] = []
  for (const outra of useAgenda.getState().googleAgendas) {
    try {
      const dados = (await api(`${eventosDe(outra.id)}?${params}`)) as { items: EventoGoogle[] }
      eventos.push(...paraEventos(dados.items, outra))
    } catch (e) {
      if (e instanceof ErroGoogle && e.precisaReconectar) throw e
      falhas.push(outra.nome)
    }
  }
  const agenda = useAgenda.getState()
  agenda.substituirGoogle(eventos, de, ate)
  agenda.configurarGoogle({ ultimaSync: Date.now() })
  // O que deu para ler fica salvo; a agenda que falhou é avisada pelo nome.
  if (falhas.length)
    throw new ErroGoogle(`Não consegui ler ${falhas.join(', ')}. Confira o ID da agenda e se esta conta do Google tem acesso a ela.`)
  return eventos.length
}

export async function criarNoGoogle(e: Pick<Evento, 'titulo' | 'inicio' | 'fim'>) {
  const criado = (await api(API, {
    method: 'POST',
    body: JSON.stringify({
      summary: e.titulo,
      start: { dateTime: new Date(e.inicio).toISOString() },
      end: { dateTime: new Date(e.fim).toISOString() },
      source: { title: 'MeUsMe', url: location.origin },
    }),
  })) as EventoGoogle
  return criado.id
}

export async function removerDoGoogle(googleId: string) {
  await api(`${API}/${encodeURIComponent(googleId)}`, { method: 'DELETE' })
}
