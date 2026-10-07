import { invoke } from '@tauri-apps/api/core'
import { disable, enable, isEnabled } from '@tauri-apps/plugin-autostart'
import { ehDesktop } from './plataforma'

/** Funções que só existem no app Windows (src-tauri). */

export interface UsoDeApp {
  dia: string
  app: string
  segundos: number
}

/** Tempo por programa nos últimos `dias` dias (1 = só hoje). */
export const usoDeApps = (dias: number) => (ehDesktop() ? invoke<UsoDeApp[]>('uso_de_apps', { dias }) : Promise.resolve([]))

/** Atalho global que abre a captura, como o Windows aceitou (ex.: "super+ctrl+alt+Space"). */
export const atalhoAtual = () => invoke<string>('atalho_atual')

/** "super+ctrl+alt+Space" → "Win + Ctrl + Alt + Espaço" */
export const atalhoLegivel = (atalho: string) =>
  atalho
    .split('+')
    .map((p) => ({ super: 'Win', ctrl: 'Ctrl', alt: 'Alt', shift: 'Shift', Space: 'Espaço' })[p] ?? p)
    .join(' + ')

export const iniciaComWindows = () => isEnabled()

export const definirIniciaComWindows = (ligar: boolean) => (ligar ? enable() : disable())
