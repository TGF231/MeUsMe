import type { MotorRede } from './interpretar'
import { ler, type PesosGravados } from './rede'

let carregando: Promise<MotorRede | null> | null = null

/**
 * Os pesos (~200 KB) ficam fora do pacote inicial: são buscados na primeira captura e
 * guardados para as próximas. Sem eles (erro de rede no navegador, por exemplo), o motor
 * continua só com as regras.
 */
export function carregarRede(): Promise<MotorRede | null> {
  carregando ??= import('./pesos.json')
    .then(({ default: p }) => {
      const pesos = p as PesosGravados
      return { rede: ler(pesos), liberado: pesos.automatico.liberado, limiar: pesos.automatico.limiar }
    })
    .catch(() => {
      carregando = null
      return null
    })
  return carregando
}
