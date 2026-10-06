import { useAgenda } from './stores/agenda'
import type { Evento } from './types'

/**
 * Integração com o Google Agenda direto do navegador (sem servidor), via Google Identity Services.
 * O token dura ~1 hora; quando vence, um clique em "Sincronizar" pede outro (normalmente sem nova tela de consentimento).
 */

const ESCOPO = 'https://www.googleapis.com/auth/calendar.events'
const API = 'https://www.googleapis.com/calendar/v3/calendars/primary/events'
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

/** Abre o login do Google. Precisa ser chamado a partir de um clique (senão o navegador bloqueia o pop-up). */
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

interface EventoGoogle {
  id: string
  summary?: string
  status?: string
  start: { dateTime?: string; date?: string }
  end: { dateTime?: string; date?: string }
}

const paraMs = (p: { dateTime?: string; date?: string }) =>
  p.dateTime ? new Date(p.dateTime).getTime() : new Date(`${p.date}T00:00:00`).getTime()

/** Baixa do Google os eventos de ontem até daqui a 30 dias e atualiza o cache local. */
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
  const dados = (await api(`${API}?${params}`)) as { items: EventoGoogle[] }
  const eventos: Omit<Evento, 'id'>[] = dados.items
    .filter((e) => e.status !== 'cancelled')
    .map((e) => ({
      titulo: e.summary ?? '(sem título)',
      inicio: paraMs(e.start),
      fim: paraMs(e.end),
      diaInteiro: !e.start.dateTime,
      origem: 'google',
      googleId: e.id,
    }))
  const agenda = useAgenda.getState()
  agenda.substituirGoogle(eventos, de, ate)
  agenda.configurarGoogle({ ultimaSync: Date.now() })
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
