/**
 * "O que mudou" (D16 em docs/CONCORRENTES.md): aparece uma vez depois de atualizar, com as versões que este
 * aparelho ainda não viu. A cada versão nova (npm run versao), escreva aqui no topo, em poucas linhas, o que
 * muda para quem usa. Versão sem entrada não abre nada.
 */
export const NOVIDADES: { versao: string; itens: string[] }[] = [
  {
    versao: '0.9.4',
    itens: [
      'Visual mais limpo: campos preenchidos sem contorno, botões secundários só com contorno e a tela aberta marcada por um fundo, sem linha vermelha.',
      'Notificações do banco: propaganda com valor, compra recusada e avisos de limite ou saldo não viram mais gasto.',
      'Cofrinho, caixinha e porquinho: guardar e resgatar entram como transferência; o que voltar a mais que o guardado entra como rendimento.',
      'Rotinas sempre se repetem, e as de projetos concluídos saem da lista.',
    ],
  },
  {
    versao: '0.9.3',
    itens: [
      'Em espera ganhou Tarefas e Rotinas: o que ainda não tem forma fica em Para organizar; o que já foi definido, aqui.',
      'Rotinas reúne o que se repete, por dia, semana e mês, com quantas vezes foi feito nas últimas 4 semanas.',
      'Projetos mostra só os projetos: as tarefas fora deles foram para Tarefas.',
    ],
  },
  {
    versao: '0.9.2',
    itens: [
      'Planejar virou tela, ao lado de Próximo passo. O número no botão diz quantas coisas pedem decisão hoje.',
      'Menus e sub-abas ocupam a largura toda e quebram em linhas quando não cabem: tudo à vista, sem rolar para o lado.',
      'Celular: a aba aberta sobe para fora da barra de baixo, como um marcador, e o botão + fica mais longe da barra.',
    ],
  },
  {
    versao: '0.9.1',
    itens: [
      'Em ação: "Planejar o dia" fica no topo, e o passo da vez no meio da tela.',
      'Celular: botão + e aba selecionada maiores, menus centralizados e sem a barra de rolagem embaixo das abas de Finanças.',
    ],
  },
  {
    versao: '0.9.0',
    itens: [
      'Só três abas: Em ação, Em espera e Finanças. Agenda e Histórico ficam no menu de Em ação; Projetos, no de Em espera.',
      'A Caixa agora se chama Em espera: o que você capturou fica ali até você decidir o que fazer.',
      'Em ação mostra só o próximo passo; montar e refazer o dia ficam em "Planejar o dia".',
      'Para marcar compromissos e lembretes, use Capturar. A Agenda fica para consultar.',
      'Lembretes com nota, como já acontecia com os passos.',
    ],
  },
  {
    versao: '0.7.0',
    itens: [
      'Passos com nota: link, endereço ou o que não esquecer, junto do passo, no Agora e na busca.',
      'Histórico: rotinas com a contagem das últimas 4 semanas ("2 de 4 semanas"), sem sequência para quebrar.',
      'Visual: fonte mono nova nos valores, botões e barras de progresso no mesmo desenho dos outros programas da família.',
      'Ajustes: menu só com texto, sem os ícones das seções.',
    ],
  },
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
