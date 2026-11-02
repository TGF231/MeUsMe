import { invoke } from '@tauri-apps/api/core'
import { disable, enable, isEnabled } from '@tauri-apps/plugin-autostart'
import { ehDesktop } from './plataforma'

/** Comandos do app Windows (src-tauri). */

export interface UsoDeApp {
  dia: string
  app: string
  segundos: number
}

/** Uso por programa nos últimos `dias` dias (1 = hoje). */
export const usoDeApps = (dias: number) => (ehDesktop() ? invoke<UsoDeApp[]>('uso_de_apps', { dias }) : Promise.resolve([]))

/** Atalho global registrado, no formato do Tauri (ex.: "super+ctrl+alt+Space"). */
export const atalhoAtual = () => invoke<string>('atalho_atual')

/** Formata o atalho para exibição (ex.: "Win + Ctrl + Alt + Espaço"). */
export const atalhoLegivel = (atalho: string) =>
  atalho
    .split('+')
    .map((p) => ({ super: 'Win', ctrl: 'Ctrl', alt: 'Alt', shift: 'Shift', Space: 'Espaço' })[p] ?? p)
    .join(' + ')

/** Cópia automática do backup em Documentos\MeUsMe (D21, src-tauri/src/backup.rs); devolve o caminho. */
export const salvarBackupNoWindows = (nome: string, conteudo: string) => invoke<string>('salvar_backup', { nome, conteudo })

export const iniciaComWindows = () => isEnabled()

export const definirIniciaComWindows = (ligar: boolean) => (ligar ? enable() : disable())
