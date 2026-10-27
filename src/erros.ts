import { create } from 'zustand'

/**
 * Registro local de erros: os 20 últimos, só neste aparelho (não sincroniza nem entra no backup).
 * Guarda mensagem, pilha, versão e tela; nunca o conteúdo do usuário.
 */

const CHAVE = 'meusme-erros'
const LIMITE = 20
const TAMANHO_MAX = 600

export interface ErroRegistrado {
  quando: number
  mensagem: string
  pilha?: string
  origem: string
  versao: string
}

function ler(): ErroRegistrado[] {
  try {
    return JSON.parse(localStorage.getItem(CHAVE) ?? '[]') as ErroRegistrado[]
  } catch {
    return []
  }
}

export const useErros = create<{ lista: ErroRegistrado[]; limpar: () => void }>()((set) => ({
  lista: ler(),
  limpar: () => {
    localStorage.removeItem(CHAVE)
    set({ lista: [] })
  },
}))

let registrando = false

export function registrarErro(erro: unknown, origem: string) {
  // Um erro ao registrar não pode gerar outro registro.
  if (registrando) return
  registrando = true
  try {
    const e = erro instanceof Error ? erro : new Error(String(erro))
    const item: ErroRegistrado = {
      quando: Date.now(),
      mensagem: e.message.slice(0, TAMANHO_MAX),
      pilha: e.stack?.slice(0, TAMANHO_MAX * 3),
      origem,
      versao: __VERSAO__,
    }
    const lista = [item, ...ler()].slice(0, LIMITE)
    localStorage.setItem(CHAVE, JSON.stringify(lista))
    useErros.setState({ lista })
  } catch {
    /* sem armazenamento: nada a fazer */
  } finally {
    registrando = false
  }
}

/** Limite prático do localStorage (~5 MB por site); o texto ocupa 2 bytes por caractere. */
const LIMITE_BYTES = 5 * 1024 * 1024

/** Fração do espaço do localStorage em uso (0 a 1). Perto de 1, gravações começam a falhar. */
export function usoDoArmazenamento() {
  let bytes = 0
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i) ?? ''
      bytes += (k.length + (localStorage.getItem(k)?.length ?? 0)) * 2
    }
  } catch {
    return 0
  }
  return bytes / LIMITE_BYTES
}

export function capturarErrosGlobais() {
  window.addEventListener('error', (e) => registrarErro(e.error ?? e.message, 'janela'))
  window.addEventListener('unhandledrejection', (e) => registrarErro(e.reason, 'promessa'))
}
