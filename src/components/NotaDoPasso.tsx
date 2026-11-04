/** Nota do passo (V10), com as quebras de linha que a pessoa escreveu. É span porque também vai dentro de linhas. Sem nota, nada. */
export function NotaDoPasso({ nota }: { nota?: string }) {
  return nota ? <span className="motivo nota-passo">{nota}</span> : null
}
