import { Capacitor } from '@capacitor/core'

/** Rodando dentro do app Android (Capacitor), e não no navegador. */
export const ehNativo = () => Capacitor.isNativePlatform()

export const ehAndroid = () => Capacitor.getPlatform() === 'android'
