/**
 * Geradores de variações para o treino da rede (docs/MOTOR.md, parte 2). Complementam
 * exemplos.jsonl: cobrem combinações (evento × dia × hora, valor × lugar…) sem escrever todas.
 * Exemplos gerados deixam a rede confiante demais: por isso a avaliação usa só frases reais.
 */

export interface ExemploBruto {
  texto: string
  classe: string
}

type Sorteio = () => number

const um = <T>(s: Sorteio, lista: readonly T[]) => lista[Math.floor(s() * lista.length)]
const talvez = (s: Sorteio, p: number, texto: string) => (s() < p ? texto : '')

const EVENTOS = ['dentista', 'reunião', 'consulta', 'médico', 'aula de inglês', 'entrevista', 'barbeiro', 'manicure', 'call com o cliente', 'exame', 'psicóloga', 'fisioterapia', 'aula de violão', 'jantar com a Ana', 'almoço com o Pedro', 'reunião de equipe', 'nutricionista', 'pilates', 'vistoria', 'audiência', 'treino', 'culto', 'festa', 'aniversário do Lucas', 'happy hour', 'mentoria', 'retorno no médico', 'reunião da escola']
const DIAS = ['hoje', 'amanhã', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado', 'domingo', 'dia 15', 'dia 3', 'semana que vem', 'na sexta', '12/11', 'depois de amanhã']
const HORAS = ['13:00', '15h', '9h', '10:30', 'às 14h', 'às 3 da tarde', '18h30', '8:00', '19h', 'meio-dia', '16:45', '7h']

const ACOES = ['pagar a luz', 'ligar pro banco', 'tomar o remédio', 'mandar o relatório', 'buscar as crianças', 'renovar o documento', 'trocar o gás', 'regar as plantas', 'levar o lixo', 'responder a Carla', 'tirar a roupa do varal', 'pagar o boleto', 'devolver o livro', 'cancelar a assinatura', 'beber água', 'levar o guarda-chuva', 'fazer o backup', 'ligar pra mãe', 'agendar a revisão do carro', 'separar os documentos']
const LEMBRAR = ['lembrar de', 'não esquecer de', 'nao esquecer de', 'me lembra de', 'lembrete:', 'lembrar:', 'lembra de', 'não esquece de']

const GASTOS = ['almoço', 'uber', 'mercado', 'padaria', 'farmácia', 'gasolina', 'ifood', 'café', 'cinema', 'estacionamento', 'lanche', 'pizza', 'açougue', 'luz', 'água', 'internet', 'aluguel', 'condomínio', 'academia', 'remédio', 'presente', 'roupa', 'cabeleireiro', 'pet shop', 'ônibus', 'pedágio', 'feira', 'sorvete', 'livro', 'spotify']
const ENTRADAS = ['salário', 'freela', 'venda da tv', 'pix do João', 'reembolso', 'bônus', 'comissão', 'aula particular', 'venda no mercado livre', 'aluguel recebido', 'cashback', 'estorno', 'rendimento', 'venda de bolo', 'pagamento do cliente', 'venda do celular', 'corrida extra', 'consultoria', 'décimo terceiro', 'pix da Maria']
const VERBOS_SAIDA = ['paguei', 'gastei', 'comprei', '']
const VERBOS_ENTRADA = ['recebi', 'vendi', 'ganhei', 'entrou', 'caiu', '']

const TAREFAS = ['ligar para o banco', 'mandar email pro chefe', 'lavar a louça', 'arrumar o quarto', 'estudar pra prova', 'fazer o relatório', 'levar o carro na revisão', 'trocar a lâmpada', 'imprimir o boleto', 'marcar consulta', 'atualizar o currículo', 'responder o WhatsApp da Bia', 'organizar a planilha', 'enviar o contrato', 'ir ao correio', 'falar com o síndico', 'limpar a geladeira', 'terminar os slides', 'pedir orçamento do pintor', 'consertar a torneira', 'passar roupa', 'comprar pão', 'comprar ração', 'fazer a declaração do IR', 'tirar xerox', 'separar roupa pra doar', 'estender a roupa', 'agendar o dentista', 'revisar o texto', 'baixar os extratos', 'pagar a fatura', 'cortar o cabelo', 'devolver a furadeira', 'ver o horário do ônibus', 'instalar a impressora']
const PREFIXOS_TAREFA = ['', '', '', 'preciso ', 'tenho que ', 'hoje: ', 'fazer: ']

const IDEIAS = ['app de receitas', 'podcast sobre finanças', 'canal sobre plantas', 'loja de artesanato', 'livro sobre a família', 'clube do livro', 'horta na varanda', 'viajar pro sul', 'aprender violão', 'curso de fotografia', 'mudar de carreira', 'vender bolos', 'blog de viagens', 'jogo de tabuleiro', 'pintar a parede de verde', 'newsletter semanal', 'brechó online', 'aprender japonês', 'festa surpresa pra Ana', 'mochilão pela América do Sul']
const PREFIXOS_IDEIA = ['ideia: ', 'ideia ', 'e se ', 'talvez ', 'seria legal ', 'pensar em ', 'quem sabe ', 'um dia ', 'algum dia ', '']

const DESEJOS = ['fone novo', 'bicicleta', 'kindle', 'notebook', 'cadeira gamer', 'air fryer', 'relógio', 'tênis de corrida', 'monitor', 'celular novo', 'jaqueta', 'cafeteira', 'tablet', 'teclado mecânico', 'sofá novo', 'videogame', 'câmera', 'smartwatch', 'mochila', 'perfume importado']
const PREFIXOS_COMPRA = ['quero comprar um ', 'quero um ', 'queria um ', 'vontade de comprar ', 'ver preço de ', 'pensando em comprar ', 'desejo: ', '']

const valor = (s: Sorteio) => {
  const n = um(s, [7, 12, 18, 25, 35, 42, 50, 60, 89, 120, 150, 200, 350, 500, 1200, 2500])
  return um(s, [`${n}`, `${n},00`, `${n},90`, `${n} reais`, `R$ ${n}`, `R$${n}`])
}

/** Variações de digitação apressada: sem acento, minúsculas, letra a menos. */
function baguncar(s: Sorteio, texto: string) {
  let t = texto
  if (s() < 0.5) t = t.normalize('NFD').replace(/[̀-ͯ]/g, '')
  if (s() < 0.3) t = t.toLowerCase()
  if (s() < 0.1 && t.length > 6) {
    const i = 2 + Math.floor(s() * (t.length - 4))
    t = t.slice(0, i) + t.slice(i + 1)
  }
  return t.replace(/\s+/g, ' ').trim()
}

const GERADORES: Record<string, (s: Sorteio) => string> = {
  compromisso: (s) => um(s, [
    () => `${um(s, EVENTOS)} ${um(s, HORAS)}`,
    () => `${um(s, EVENTOS)} ${um(s, DIAS)} ${um(s, HORAS)}`,
    () => `${um(s, EVENTOS)} ${um(s, DIAS)}`,
    () => `${um(s, DIAS)} ${um(s, HORAS)} ${um(s, EVENTOS)}`,
  ])(),
  lembrete: (s) => `${um(s, LEMBRAR)} ${um(s, ACOES)}${talvez(s, 0.5, ' ' + um(s, DIAS))}${talvez(s, 0.2, ' ' + um(s, HORAS))}`,
  despesa: (s) => um(s, [
    () => `-${um(s, [12, 35, 50, 89, 120, 300])} ${um(s, GASTOS)}`,
    () => `${um(s, VERBOS_SAIDA)} ${valor(s)} ${talvez(s, 0.4, um(s, ['no ', 'na ', 'de ', 'com ']))}${um(s, GASTOS)}`,
    () => `${um(s, GASTOS)} ${valor(s)}`,
  ])(),
  receita: (s) => um(s, [
    () => `+${um(s, [50, 100, 200, 450, 1000, 2500])} ${um(s, ENTRADAS)}`,
    () => `${um(s, VERBOS_ENTRADA)} ${valor(s)} ${talvez(s, 0.3, um(s, ['de ', 'do ', 'da ']))}${um(s, ENTRADAS)}`,
    () => `${um(s, ENTRADAS)} ${valor(s)}`,
  ])(),
  passo: (s) => `${um(s, PREFIXOS_TAREFA)}${um(s, TAREFAS)}`,
  ideia: (s) => `${um(s, PREFIXOS_IDEIA)}${um(s, IDEIAS)}`,
  compra: (s) => `${um(s, PREFIXOS_COMPRA)}${um(s, DESEJOS)}`,
}

export const CLASSES = Object.keys(GERADORES)

/** `porClasse` exemplos de cada classe, sem repetir texto. */
export function gerarExemplos(s: Sorteio, porClasse: number): ExemploBruto[] {
  const lista: ExemploBruto[] = []
  for (const classe of CLASSES) {
    const vistos = new Set<string>()
    for (let tentativas = 0; vistos.size < porClasse && tentativas < porClasse * 20; tentativas++) {
      const texto = baguncar(s, GERADORES[classe](s))
      if (vistos.has(texto)) continue
      vistos.add(texto)
      lista.push({ texto, classe })
    }
  }
  return lista
}
