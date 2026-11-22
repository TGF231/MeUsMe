/**
 * "O que mudou" (D16 em docs/CONCORRENTES.md): aparece uma vez depois de atualizar, com as versões que este
 * aparelho ainda não viu. A cada versão nova (npm run versao), escreva aqui no topo, em poucas linhas, o que
 * muda para quem usa. Versão sem entrada não abre nada.
 */
export const NOVIDADES: { versao: string; itens: string[] }[] = [
  {
    versao: '0.9.14',
    itens: [
      'Próximo passo sem nada na fila: some a escolha de energia e aparece o botão Capturar, com a explicação de como seguir.',
      'Ajustes tem um índice no topo, com um atalho para cada seção.',
      'No celular, Ajustes aparece com o nome no canto de cima, e fica marcado enquanto está aberto.',
      'O aviso de pronto para usar sem internet saiu: ele cobria a introdução no celular.',
    ],
  },
  {
    versao: '0.9.13',
    itens: [
      'No navegador, dá para instalar o MeUsMe como app: Ajustes → Instalar o app (no iPhone, pelo Compartilhar do Safari).',
      'Instalado, o toque longo no ícone abre Capturar ou Capturar por voz.',
      'Versão nova não recarrega mais sozinha: o app avisa e atualiza quando você tocar em Atualizar.',
    ],
  },
  {
    versao: '0.9.12',
    itens: [
      'Visual unificado com a página inicial: abas em pílula, cartões com o título dentro e as mesmas cores e fontes.',
      'Histórico mostra Como está indo: passos feitos por semana e a situação dos projetos, para comparar as semanas.',
      'Abre mais rápido, e se uma tela der erro, só ela mostra o aviso: o resto do app continua funcionando.',
      'Se o espaço do aparelho acabar, o app avisa que não conseguiu salvar e leva aos Ajustes para exportar um backup.',
    ],
  },
  {
    versao: '0.9.11',
    itens: [
      'Visual da mesma família da página inicial: botões arredondados, a ação principal com brilho e o botão + redondo.',
      'Cartões com cantos mais suaves; no computador, o que se clica inteiro sobe um pouco ao passar o mouse.',
    ],
  },
  {
    versao: '0.9.10',
    itens: ['No computador, os cartões ficam iguais aos do celular: com fundo, título dentro e o mesmo espaço em todas as telas.'],
  },
  {
    versao: '0.9.9',
    itens: ['Ajustes em colunas: cada cartão fica logo abaixo do anterior, sem vãos entre eles.'],
  },
  {
    versao: '0.9.8',
    itens: [
      'Energia com cinco níveis, como o humor: Baixa, Média-baixa, Média, Média-alta e Alta. O que você já tinha foi convertido.',
      'Em espera organiza um item por vez, com as escolhas agrupadas e explicadas, sempre no mesmo lugar. A sugestão do app aparece marcada.',
      'Planejar e Agenda com os mesmos cartões e espaçamentos das outras telas, e o Próximo passo com o brilho da cor principal.',
      'Janela encaixada lado a lado ou tela dividida: o layout não fica trocando, e o botão + encolhe em janela baixa.',
    ],
  },
  {
    versao: '0.9.7',
    itens: [
      'Fonte nova, mais limpa: Inter no texto e JetBrains Mono nos números.',
      'No celular, a aba aberta da barra de baixo ganhou a cor de destaque e não parece mais cortada embaixo.',
      'No computador, Próximo passo usa a tela toda: à esquerda o resto do dia, à direita o que vem a seguir e o que está em espera.',
    ],
  },
  {
    versao: '0.9.6',
    itens: [
      'Visual renovado: cinzas neutros no lugar dos azulados, nos temas claro e escuro.',
      'Cantos mais arredondados em botões, campos e cartões.',
      'Cartões com uma sombra leve, e janelas mais destacadas do fundo.',
    ],
  },
  {
    versao: '0.9.5',
    itens: [
      '"Agora não" pede quando voltar: um horário livre, daqui a 30 min, 1, 2 ou 4 horas, ou qualquer dia e hora. Na hora marcada, o passo aparece primeiro.',
      'Passo adiado 3 vezes ganha "Diminuir": troque por uma versão menor, que já conta como feita. A revisão da semana mostra o que foi feito assim.',
      'Passos podem ter lugar, trabalho ou casa. Em Próximo passo, diga onde está: o que é do outro lugar sai da vez, e ao chegar aparece o que foi anotado para ali.',
      'Projeto pode ser encerrado com o que ele já deu, em uma frase, sem contar como abandonado.',
      'Captura entende intervalos com horas escritas de jeitos diferentes, como "das 14h às 16:30".',
    ],
  },
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
