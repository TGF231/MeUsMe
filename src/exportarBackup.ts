import { montarBackup } from './backup'
import { diasDesde } from './calculos'
import { useConfig } from './stores/config'
import { baixarArquivo, hoje } from './util'

/** Baixa o backup completo e anota quando foi (D21: o app lembra na revisão da semana se passar de 30 dias). */
export function exportarBackup() {
  baixarArquivo(`meusme-backup-${hoje()}.json`, montarBackup((k) => localStorage.getItem(k)))
  useConfig.getState().ajustar({ ultimoBackup: Date.now() })
}

/** "há 3 dias", "hoje" ou "nunca neste aparelho". */
export function quandoFoiOBackup(ultimo: number, agora = Date.now()) {
  if (!ultimo) return 'nunca neste aparelho'
  const d = diasDesde(ultimo, agora)
  return d === 0 ? 'hoje' : d === 1 ? 'ontem' : `há ${d} dias`
}
