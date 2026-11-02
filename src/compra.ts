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

/**
 * Compra parcelada (V24 em docs/CONCORRENTES.md): o total vira uma parcela por mês, na mesma data (o dia 31 cai no
 * último dia dos meses curtos). Os centavos que sobram da divisão vão na primeira parcela, para a soma bater.
 */
export function dividirEmParcelas(total: number, parcelas: number, data: string) {
  const base = Math.trunc(total / parcelas)
  const [a, m, d] = data.split('-').map(Number)
  return Array.from({ length: parcelas }, (_, i) => {
    const ultimo = new Date(a, m - 1 + i + 1, 0).getDate()
    const dia = new Date(a, m - 1 + i, Math.min(d, ultimo), 12)
    const iso = `${dia.getFullYear()}-${String(dia.getMonth() + 1).padStart(2, '0')}-${String(dia.getDate()).padStart(2, '0')}`
    return { valor: i === 0 ? total - base * (parcelas - 1) : base, data: iso, sufixo: ` (${i + 1}/${parcelas})` }
  })
}
