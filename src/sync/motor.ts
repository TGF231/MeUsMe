import { useEffect } from 'react'
import { create } from 'zustand'
import { aoMudarLocalmente, aplicarRemotas, lerLocais } from './colecoes'
import { confirmarEnvio, planejar, type Base } from './planejar'
import { aoMudarLogin, baixar, enviar, lerConfigSync, ouvirServidor, usuarioAtual } from './remoto'

const CHAVE_ESTADO = 'meusme-sync-estado'
/** Janela de segurança: relê alguns segundos para trás, caso uma gravação concorrente tenha chegado fora de ordem. */
const MARGEM_MS = 10_000

interface EstadoSalvo {
  usuario: string
  base: Base
  ultimoPull: string | null
}

function lerEstado(usuario: string): EstadoSalvo {
  try {
    const e = JSON.parse(localStorage.getItem(CHAVE_ESTADO) ?? 'null') as EstadoSalvo | null
    // Outra conta neste aparelho: começa do zero (o servidor vence na primeira vez, como num aparelho novo).
    if (e && e.usuario === usuario) return e
  } catch {
    /* estado corrompido: recomeça */
  }
  return { usuario, base: {}, ultimoPull: null }
}

const salvarEstado = (e: EstadoSalvo) => localStorage.setItem(CHAVE_ESTADO, JSON.stringify(e))

export const esquecerEstadoDeSincronizacao = () => localStorage.removeItem(CHAVE_ESTADO)

export interface StatusSync {
  situacao: 'desligada' | 'sem-login' | 'ociosa' | 'sincronizando' | 'erro'
  email?: string
  ultima?: number
  erro?: string
  /** Muda quando a configuração ou o login mudam, para o motor se reiniciar. */
  versao: number
  reiniciar: () => void
}

export const useStatusSync = create<StatusSync>()((set) => ({
  situacao: 'desligada',
  versao: 0,
  reiniciar: () => set((s) => ({ versao: s.versao + 1 })),
}))

/** Usuário visto no último evento de login; undefined = ainda não sabemos. */
let usuarioConhecido: string | null | undefined

let emAndamento: Promise<void> | null = null
let deNovo = false

/** Sincroniza agora. Chamadas durante uma sincronização em curso viram uma rodada extra logo depois. */
export function sincronizarAgora(): Promise<void> {
  if (emAndamento) {
    deNovo = true
    return emAndamento
  }
  emAndamento = (async () => {
    try {
      do {
        deNovo = false
        await rodada()
      } while (deNovo)
    } finally {
      emAndamento = null
    }
  })()
  return emAndamento
}

async function rodada() {
  const status = useStatusSync.setState
  if (!lerConfigSync()) return status({ situacao: 'desligada' })
  const usuario = await usuarioAtual()
  if (!usuario) return status({ situacao: 'sem-login', email: undefined })
  status({ situacao: 'sincronizando', email: usuario.email })

  try {
    const estado = lerEstado(usuario.id)
    const desde = estado.ultimoPull ? new Date(new Date(estado.ultimoPull).getTime() - MARGEM_MS).toISOString() : null
    const remotas = await baixar(desde)

    const plano = planejar(lerLocais(), estado.base, remotas)
    aplicarRemotas(plano.aplicar)
    const carimbo = await enviar(usuario.id, plano.enviar)

    const maiores = [estado.ultimoPull, carimbo, ...remotas.map((r) => r.atualizado_em)].filter(Boolean) as string[]
    salvarEstado({
      usuario: usuario.id,
      base: confirmarEnvio(plano.base, plano.enviar),
      ultimoPull: maiores.length ? maiores.reduce((a, b) => (a > b ? a : b)) : null,
    })
    status({ situacao: 'ociosa', ultima: Date.now(), erro: undefined })
  } catch (e) {
    status({ situacao: 'erro', erro: (e as Error).message })
  }
}

/** Liga a sincronização automática enquanto o app estiver aberto. */
export function useSincronizacao() {
  const versao = useStatusSync((s) => s.versao)

  useEffect(() => {
    if (!lerConfigSync()) {
      useStatusSync.setState({ situacao: 'desligada' })
      return
    }
    let ativo = true
    let espera: ReturnType<typeof setTimeout> | undefined
    const logo = (ms: number) => {
      clearTimeout(espera)
      espera = setTimeout(() => ativo && void sincronizarAgora(), ms)
    }

    // Mudança feita aqui: espera 2 s de calma (para juntar várias edições) e envia.
    const pararLocal = aoMudarLocalmente(() => logo(2000))
    // Sessão expirou ou trocou de conta: reinicia. Renovação de token (mesmo usuário) não conta.
    const pararLogin = aoMudarLogin((id) => {
      const mudou = usuarioConhecido !== undefined && id !== usuarioConhecido
      usuarioConhecido = id
      if (mudou) useStatusSync.getState().reiniciar()
    })
    // Outro aparelho gravou algo: busca já.
    let pararServidor = () => {}
    void usuarioAtual().then((u) => {
      if (u && ativo) pararServidor = ouvirServidor(u.id, () => logo(300))
    })

    const aoVoltar = () => document.visibilityState === 'visible' && logo(200)
    document.addEventListener('visibilitychange', aoVoltar)
    window.addEventListener('online', aoVoltar)
    // Rede de segurança caso o tempo real caia.
    const periodico = setInterval(() => document.visibilityState === 'visible' && void sincronizarAgora(), 60_000)

    void sincronizarAgora()

    return () => {
      ativo = false
      clearTimeout(espera)
      clearInterval(periodico)
      pararLocal()
      pararLogin()
      pararServidor()
      document.removeEventListener('visibilitychange', aoVoltar)
      window.removeEventListener('online', aoVoltar)
    }
  }, [versao])
}
