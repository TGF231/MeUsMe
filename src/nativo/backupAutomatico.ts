import { App as AppNativo } from '@capacitor/app'
import { montarBackup } from '../backup'
import { useConfig } from '../stores/config'
import { hoje } from '../util'
import { Captura } from './captura'
import { salvarBackupNoWindows } from './desktop'
import { ehAndroid, ehDesktop } from './plataforma'

const SEMANA = 7 * 86_400_000

/**
 * Android e Windows: uma cópia do backup por semana em Documentos/MeUsMe (D21), ao abrir o app e, no Android, ao
 * sair dele. Guarda as 4 mais novas; continua lá se o app for desinstalado. Falha não atrapalha nada: tenta de novo na próxima vez.
 */
export function manterBackupAutomatico() {
  if (!ehAndroid() && !ehDesktop()) return () => {}
  let gravando = false
  const talvez = async () => {
    if (gravando || Date.now() - useConfig.getState().ultimoBackupAuto < SEMANA) return
    gravando = true
    try {
      const nome = `meusme-backup-${hoje()}.json`
      const conteudo = montarBackup((k) => localStorage.getItem(k))
      const ok = ehDesktop() ? Boolean(await salvarBackupNoWindows(nome, conteudo)) : (await Captura.salvarBackup({ nome, conteudo })).ok
      if (ok) useConfig.getState().ajustar({ ultimoBackupAuto: Date.now() })
    } catch {
      // Sem espaço ou sem acesso: fica para a próxima abertura.
    } finally {
      gravando = false
    }
  }
  void talvez()
  // No Windows o app fica aberto na bandeja por dias: confere de novo a cada 6 horas.
  if (ehDesktop()) {
    const t = setInterval(() => void talvez(), 6 * 3_600_000)
    return () => clearInterval(t)
  }
  const ouvinte = AppNativo.addListener('pause', () => void talvez())
  return () => void ouvinte.then((o) => o.remove())
}
