import { Capacitor } from '@capacitor/core'

/** Executando no app nativo (Capacitor). */
export const ehNativo = () => Capacitor.isNativePlatform()

export const ehAndroid = () => Capacitor.getPlatform() === 'android'

/** Executando no app Windows (Tauri). */
export const ehDesktop = () => typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
