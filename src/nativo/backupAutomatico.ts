import { App as AppNativo } from '@capacitor/app'
import { montarBackup } from '../backup'
import { useConfig } from '../stores/config'
import { hoje } from '../util'
import { Captura } from './captura'
import { ehAndroid } from './plataforma'

const SEMANA = 7 * 86_400_000

/**
 * Android: uma cópia do backup por semana em Documentos/MeUsMe (D21), ao abrir e ao sair do app. Guarda as 4
 * mais novas; continua lá se o app for desinstalado. Falha não atrapalha nada: tenta de novo na próxima vez.
 */
export function manterBackupAutomatico() {
  if (!ehAndroid()) return () => {}
  let gravando = false
  const talvez = async () => {
    if (gravando || Date.now() - useConfig.getState().ultimoBackupAuto < SEMANA) return
    gravando = true
    try {
      const r = await Captura.salvarBackup({ nome: `meusme-backup-${hoje()}.json`, conteudo: montarBackup((k) => localStorage.getItem(k)) })
      if (r.ok) useConfig.getState().ajustar({ ultimoBackupAuto: Date.now() })
    } catch {
      // Sem espaço ou sem acesso: fica para a próxima abertura.
    } finally {
      gravando = false
    }
  }
  void talvez()
  const ouvinte = AppNativo.addListener('pause', () => void talvez())
  return () => void ouvinte.then((o) => o.remove())
}
