/**
 * "O que mudou" (D16 em docs/CONCORRENTES.md): aparece uma vez depois de atualizar, com as versões que este
 * aparelho ainda não viu. A cada versão nova (npm run versao), escreva aqui no topo, em poucas linhas, o que
 * muda para quem usa. Versão sem entrada não abre nada.
 */
export const NOVIDADES: { versao: string; itens: string[] }[] = [
  {
    versao: '0.6.0',
    itens: [
      'Agora: "Montar meu dia" sugere passos com horário no tempo livre, e "Refazer o resto do dia" reencaixa o que ficou para trás.',
      'Passos com prazo, "só a partir de" e repetição; "Quebrar" divide um passo grande; "Agendar" propõe horários livres.',
      'Busca em tudo: a lupa no topo ou Ctrl+K.',
      'Caixa: colar um texto separa em itens, e o que fica parado 30 dias volta com uma pergunta.',
      'Android: capturar pelo Compartilhar, pelo bloco nas Configurações rápidas, pelo atalho de voz e pelo widget; lembretes com "Feito" e "Daqui a 10 min" na notificação.',
      'Finanças: extrato OFX, compras parceladas, regras de categoria e aviso quando um banco para de mandar notificações.',
      'Ajustes: seções que se desligam e exportação em Markdown, CSV e .ics.',
    ],
  },
]

/** -1, 0 ou 1, comparando número a número ("0.10.0" vem depois de "0.9.0"). */
export function compararVersoes(a: string, b: string) {
  const pa = a.split('.').map(Number)
  const pb = b.split('.').map(Number)
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0)
    if (d) return Math.sign(d)
  }
  return 0
}

/** Entradas depois da versão vista e até a atual, da mais nova para a mais antiga. */
export const novidadesEntre = (vista: string, atual: string) =>
  NOVIDADES.filter((n) => compararVersoes(n.versao, vista) > 0 && compararVersoes(n.versao, atual) <= 0)

/** Versão vista quando o campo ainda não existia: quem já usava o app vem da 0.5.0. */
const ANTES_DO_CAMPO = '0.5.0'

/** Versões que este aparelho ainda não viu; quem acabou de instalar (sem introdução vista) não recebe a lista. */
export function novidadesPendentes(versaoVista: string, introducaoVista: boolean, atual: string) {
  return novidadesEntre(versaoVista || (introducaoVista ? ANTES_DO_CAMPO : atual), atual)
}
