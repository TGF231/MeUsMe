// Confere se toda linha de cada tabela markdown tem o mesmo número de colunas do cabeçalho.
const colunas = (l) => l.replace(/\\|/g, '').split('|').length - 2

export function conferirTabelas(nome, texto) {
  const linhas = texto.replace(/\r\n/g, '\n').split('\n')
  const erros = []
  let i = 0
  while (i < linhas.length) {
    if (linhas[i].startsWith('|') && linhas[i + 1] && /^\|[-| ]+\|$/.test(linhas[i + 1])) {
      const n = colunas(linhas[i])
      let j = i + 2
      for (; j < linhas.length && linhas[j].startsWith('|'); j++) {
        if (colunas(linhas[j]) !== n) erros.push(`${nome}, linha ${j + 1}: ${colunas(linhas[j])} colunas, esperava ${n}`)
      }
      i = j
    } else i++
  }
  if (erros.length) throw new Error('tabela fora do padrão\n' + erros.join('\n'))
}
