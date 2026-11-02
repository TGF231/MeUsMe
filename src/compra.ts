/**
 * "E se eu comprar isso?" (D27 em docs/CONCORRENTES.md): o efeito de uma compra da lista de espera no "livre por dia"
 * até o fim do mês, antes de decidir. Valores em centavos.
 */
export function efeitoDaCompra(previsao: { livre: number; diasRestantes: number; porDia: number }, valor: number) {
  const porDiaDepois = Math.floor((previsao.livre - valor) / previsao.diasRestantes)
  return {
    porDiaAntes: previsao.porDia,
    porDiaDepois,
    /** Quantos dias do "livre por dia" de hoje a compra consome (null se não há livre por dia positivo). */
    diasDeLivre: previsao.porDia > 0 ? Math.round((valor / previsao.porDia) * 10) / 10 : null,
    /** Quanto passaria do que está livre no mês (0 se cabe). */
    falta: Math.max(0, valor - previsao.livre),
  }
}
