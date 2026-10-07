import { Capacitor } from '@capacitor/core'

/** Rodando dentro do app Android (Capacitor), e não no navegador. */
export const ehNativo = () => Capacitor.isNativePlatform()

export const ehAndroid = () => Capacitor.getPlatform() === 'android'

/** Rodando dentro do app Windows (Tauri). */
export const ehDesktop = () => typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
