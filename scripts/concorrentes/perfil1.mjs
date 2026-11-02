// Fonte única do cruzamento com o perfil: sinais, tensões, lacunas e a revisão função por função.
export const sinais = {
  U1: ['Escolher o que fazer parece aleatório; priorizar e estimar prazos é o maior desafio.', 'Code 5/10 · chat de agenda 8/9', 'O app decidir e explicar a escolha; estimativa como palpite, nunca como cobrança.'],
  U2: ['Perde a energia perto do fim: no ponto decisivo restam ideias vagas, nada concreto.', 'Code 5/10', 'Transformar o vago num próximo passo físico e proteger a reta final.'],
  U3: ['Rende em horários sem padrão ("varia bastante").', 'chat de agenda 8/9', 'Não presumir manhã ou tarde; ler a energia do momento.'],
  U4: ['Não tem método próprio e pede sugestões prontas; testa e pede outra saída quando uma não serve.', 'chat de agenda 8/9', 'Propor, mostrar o motivo, deixar recusar.'],
  U5: ['Digitar cansa: "muita escrita para criar as tarefas", "digitar R$ é lento, principalmente em celulares com teclado virtual". Já ditou um pedido por áudio (chat de agosto).', 'Code 27/10 e 28/10 · claude.ai ago.', 'Captura com o mínimo de toques: voz, compartilhar, widget, atalhos.'],
  U6: ['Testou Notion, ClickUp, Super Productivity e as suítes do Google e da Microsoft, e "nada funcionou".', 'Code 5/10', 'Nada que exija manter um sistema: poucas telas, poucos campos obrigatórios.'],
  U7: ['Captura de gastos pelas notificações do banco: "o problema com as notificações é a inconsistência" (banco que não avisa, gasto que não aparece, lido errado, duplicado, tudo na Caixa).', 'Code 28/10', 'Mostrar o que funcionou e o que falhou na captura, e ter um caminho que não dependa da notificação.'],
  U8: ['A agenda real é compartilhada com colegas; quer ver só o dia de hoje, na agenda de verdade, e que compromisso vença tarefa solta.', 'chat de agenda 8/9 · Code 6/10', 'Ler a agenda que você usa, inclusive a da equipe.'],
  U9: ['Quer saber quanto tempo gastou em cada coisa.', 'Code 6/10', 'Tempo real por passo e por projeto, comparado com o palpite.'],
  U10: ['Dinheiro em cinco bancos e carteiras (Mercado Pago, PicPay, Next, Inter, Nubank) e registro automático.', 'Code 6/10 e 28/10', 'Captura que funcione sem infraestrutura empresarial.'],
  U11: ['No produto final quer tudo "o mais simplificado possível"; achou a sincronização via Supabase pouco intuitiva para quem usa.', 'Code 6/10', 'Zero configuração para quem usa.'],
  D1: ['Desenvolvedor autônomo, sem CNPJ nem conta de loja: quer algo substancial sem infraestrutura gigante.', 'Code 28/10', 'Dados no aparelho; servidor só onde já existe.'],
  D2: ['Precisa entender cada canto do código: amplo em bancos locais e lógica, com C++ sem bibliotecas e Python básico, sem aprofundar em outras linguagens.', 'Code 6/10', 'Poucas dependências, regras que dê para explicar em voz alta, ordem que siga as trilhas de estudo.'],
  D3: ['Quer publicar na Play Store e na Microsoft Store sem o rótulo de "perigoso".', 'Code 27/10', 'Permissões sensíveis explicadas e com plano B.'],
  D4: ['Confere pelo teste: pede teste no emulador, tira dúvida com um teste, compara os totais de duas versões da mesma consulta, levanta casos de borda (meia-noite contra 23:59:59, item de peso muito baixo) e corrige a hipótese em uma frase.', 'Code 28/10 · chat de trabalho 2/10', 'Cada item com linha de chegada medível e um teste.'],
  D5: ['Quer tudo em um lugar (tarefas, tempo, diário, agenda, finanças, desktop), mas já se perdeu em ferramentas pesadas.', 'Code 5/10', 'Módulos que podem ser desligados.'],
  D6: ['Conversa com o Claude em horário de trabalho (93% das 506 mensagens dos chats entre 6h e 18h, 99% em dia útil) e constrói o MeUsMe à noite (77% das 61 mensagens do Code depois das 18h). Isso mostra quando você escreve, não quando rende (U3 continua sendo o que você disse).', 'claude.ai (fev a out) · Code', 'Tarefas pequenas, que caibam numa noite; o que for de uso diário precisa servir no expediente, onde a agenda da equipe manda.'],
  D7: ['Pensa de forma declarativa: em fevereiro escolheu "o que precisa ser feito, não como fazer" e "resolver problemas de forma declarativa e direta", e disse ter "alto entendimento de lógica" mas faltar a semântica da linguagem.', 'claude.ai fev. · Code 6/10', 'Regras configuráveis que dá para ler (como o motor e o "ensinar o app a ler"), em vez de código escondido.'],
  D8: ['Constrói ferramentas para dados de produção com trava de segurança (registram "backup obrigatório antes de reconstruir", rodam em fases com as triggers desligadas, usam ROLLBACK e gravam uma auditoria da divergência antes da limpeza) e criou um checklist de validação com dados reais.', 'claude.ai jul. a out.', 'Backup antes de qualquer operação destrutiva e verificação com dados reais antes de liberar.'],
  D9: ['Trabalha com SQL todo dia e depura colando código e erro: nas 506 mensagens dos chats, 21% trazem código ou log (30% dos caracteres), sobretudo SQL (Firebird em 61 mensagens, SQL Server em 8), depois Pascal e relatórios (19), PowerShell e BAT (11) e Python (8). Também manda 77 imagens e 55 arquivos de texto. O conteúdo é de ERP fiscal e financeiro (notas, SPED, comissões, estoque), e você exporta para CSV e XLSX e confere no Excel.', 'claude.ai (os 36 chats)', 'Erros copiáveis (já há "Copiar" em Ajustes → Sobre), aceitar imagem e arquivo na captura e uma camada de dados local que seja a parte que você mais domina.'],
  D10: ['No trabalho usa o Claude como executor: 27 dos 36 chats geraram arquivos (cerca de 195 criados e 570 edições de trecho nas respostas), e você testa no seu ambiente e devolve o resultado ou o erro.', 'claude.ai (os 36 chats)', 'No MeUsMe, manter esse ciclo (pedir, testar, colar o erro), mas com você lendo e explicando o que entrou.'],
}

export const tensoes = [
  ['Tudo em um lugar × me perco em ferramenta pesada', 'D5, U6', 'Módulos que se desligam e perfis prontos (D14, D13): o app cresce por trás, a tela não.'],
  ['Quero sugestões × quero controle', 'U4, U1', 'Propor, dizer o motivo e nunca mover sozinho (D03).'],
  ['Entender cada canto do código × lançar logo', 'D2, D3', 'Ordenar pelas trilhas do guia de estudo: primeiro TypeScript e React, depois Android, depois Rust.'],
  ['Sem infraestrutura × sincronizar e compartilhar', 'D1', 'Servidor só o que já existe (Supabase, e-mail e código); compartilhar com outras pessoas fica para depois.'],
  ['Digitar menos × regras que eu consiga explicar', 'U5, D2', 'Voz, compartilhar e widget entram pelo mesmo motor de regras, que tem tutorial curto.'],
  ['Construo à noite × o app vale mais durante o expediente', 'D6, U8', 'Hipótese a conferir na fase 1: dar prioridade ao que serve no trabalho (agenda da equipe, captura rápida) e quebrar o resto em tarefas de uma noite.'],
  ['Regras declarativas que eu leio × rede que aprende sozinha', 'D7, D2', 'A rede sugere e só cria sozinha depois de medida (README); capacidade nova entra primeiro como regra legível (D26, V28).'],
  ['Delego código no trabalho × quero entender cada canto do MeUsMe', 'D10, D2', 'Cada item entra como tarefa pequena, com teste, e você explica o que entrou antes de dar por pronto (modo "você escreve, eu reviso" de TAREFAS.md).'],
]

export const lacunas = [
  ['L1', 'A agenda da equipe não chega ao app', 'No chat de 8/9 você disse que a sua agenda é compartilhada com colegas e a pessoal estava vazia: os compromissos ficavam na agenda da equipe. O app lê só a agenda principal (`calendars/primary` em src/google.ts).', 'Ler as agendas que você escolher ou um .ics (D08). Confira antes se você administra a agenda da equipe: o endereço .ics secreto só aparece para quem tem essa permissão.'],
  ['L2', 'Organização de desktop', 'Estava na primeira mensagem (5/10). Hoje o app só mede o tempo por programa (Windows); não organiza nada na área de trabalho.', 'Decidir: entra (ex.: abrir de uma vez os programas e arquivos de um projeto) ou sai da visão do produto. Não foi pesquisado.'],
  ['L3', 'Diário (journaling)', 'Também estava na primeira mensagem. Hoje o check-in de 30 segundos guarda humor, energia e uma frase.', 'Decidir: manter leve (combina com U5 e U6) ou criar uma tela de diário.'],
]

// [função, ajuda você porque, custa ou arrisca, veredicto]
export const funcoes = [
  ['Agora: um passo só, escolhido pela energia', 'Responde ao "prioridades aleatórias" (U1): o app escolhe e mostra o motivo; compromisso vence tarefa solta (U8); usa energia, não hora do dia (U3).', 'Só escolhe entre o que você cadastrou. Passo não tem prazo, então o que é urgente de verdade não pesa; o esforço quem marca é você.', 'Manter e destacar. O que falta é o prazo (V09).'],
  ['Combinado de 5 minutos, anel de foco e palpite de tempo', 'Atacam o começar e o estimar sem bloquear nada (U1, U2).', 'O palpite é opcional: no começo há pouco dado, e a capacidade do dia (V14) só funciona com palpites.', 'Manter. Meça no uso real quantos passos têm palpite.'],
  ['Recepção sem cobrança e revisão da semana', 'Volta ao app sem pilha de culpa (U2, U6).', 'Depende de você abrir o app ou de o aviso da revisão tocar (só testado no emulador).', 'Manter. Liga ao diagnóstico de lembretes (D23).'],
  ['Projetos com linha de chegada', 'Define o "pronto" antes e mostra só o próximo passo (U2).', 'É um campo obrigatório a mais na criação (U6) e passos sem projeto ficam soltos. Dá para editar depois, o que cobre o seu hábito de corrigir o pedido no meio do caminho (aparece em 14 dos 36 chats).', 'Manter. Avaliar sugerir a linha de chegada em vez de exigir.'],
  ['Caixa: captura em 1 segundo, regras e rede neural local', 'Tira da cabeça com pouca digitação (U5), com regras que dão para explicar (D2) e tutorial curto.', 'Sem revisão do que fica parado (D09) e sem entrada vinda de outros apps (V03): o que o motor não entende acumula.', 'Manter e acrescentar V03 e D09.'],
  ['Voz que já salva a nota', 'Pedido seu em 28/10 (U5).', 'Qualidade depende do reconhecimento de voz do aparelho; foi testado só no emulador.', 'Manter. Testar no celular real na fase 1.'],
  ['Captura global do Windows (Win + Ctrl + Alt + Espaço)', 'Atalho que você escolheu (6/10) e que cobre o "widget" no PC (U5).', 'São quatro teclas; se o Windows recusar, vale o reserva Ctrl + Alt + Espaço.', 'Manter.'],
  ['Agenda e Google Agenda', 'Compromissos ao lado dos passos e tempo livre entre eventos (U8).', 'Lê só a agenda principal: a da equipe não aparece. Exige OAuth próprio e verificação do Google (D1) e no Windows o login pode nem funcionar (nunca testado).', 'Rever agora: ler as agendas que você escolher (D08, lacuna L1).'],
  ['Lembretes e notificações', 'Ficam agendados no sistema e tocam com o app fechado no Android (testado no emulador).', 'No navegador só tocam com o app aberto, e sem diagnóstico não dá para saber por que um lembrete falhou. Não vi queixa sua sobre lembretes; só foram testados no emulador.', 'Manter. Testar no celular real na fase 1; se algum lembrete falhar, diagnóstico (D23) e ações na notificação (V18).'],
  ['Finanças: livre por dia, contas fixas, limites', 'O "livre por dia" responde sem exigir método de orçamento (U6, U10).', 'Sem cartão com fatura nem parcelas: compra no cartão e pagamento da fatura podem contar duas vezes. Só barras por categoria.', 'Manter. Confirmar a contagem dupla no uso real antes de construir V23.'],
  ['Captura de notificações do banco (Android)', 'Registro automático sem servidor (U10, D1).', 'Depende do texto de cada banco e a Play pode recusar a permissão (D3). Você já viu as falhas: banco sem aviso, gasto que não aparece, lido errado, duplicado, tudo na Caixa (U7).', 'Manter com plano B: OFX (V27), saúde da conexão (D25) e ensinar o app a ler (D26).'],
  ['Open Finance (Meu Pluggy)', 'Dado oficial que substitui o provisório.', 'Só uso pessoal; o plano comercial exige a infraestrutura que você disse não querer (D1). Nunca testado com conta real.', 'Manter só no seu build. Em 28/10 você disse que ele exige robustez empresarial e que quer evitar infraestrutura gigante.'],
  ['Importação de extrato CSV', 'Funciona hoje sem permissão e sem servidor (Nubank, Inter, Wallet).', 'É manual, e cada banco tem o seu formato.', 'Manter e somar OFX (V27).'],
  ['Antes de comprar (lista de espera)', 'Segura o impulso sem proibir.', 'Só funciona se você lembrar de usar; não mostra o efeito da compra no mês (D27).', 'Manter.'],
  ['Histórico e check-in de 30 segundos', 'Tempo real por passo e por projeto, palpite × real (U9).', 'O "diário" do pedido original ficou em humor, energia e uma frase (lacuna L3).', 'Manter. Decidir sobre o diário.'],
  ['Tempo por programa (Windows)', 'A sua ideia de saber onde o tempo do computador vai; guarda só o nome do programa.', 'Só Windows. Mede, mas não organiza a área de trabalho (lacuna L2).', 'Manter. Decidir sobre L2.'],
  ['Sincronização (Supabase, e-mail e código)', 'Sem senha e sem configuração para quem usa (U11); cada item sincroniza separado.', 'O servidor é seu e é o maior risco do roadmap: nunca foi testado de verdade (D1). O conflito é por registro inteiro (dívida 2).', 'Manter. Fase 1 antes de qualquer função que dependa dele (D19, V22).'],
  ['Backup e restauração', 'O arquivo é seu e não depende do servidor (D1, D2).', 'É manual: se você esquecer de exportar, não há cópia. O localStorage tem cerca de 5 MB.', 'Manter. Backup automático (D21) na fase 2.'],
  ['Tema MegUI, acento e acessibilidade', 'É a sua identidade visual; teclado e leitor de tela foram verificados.', 'Cada preferência a mais é um ajuste a manter; densidade e ícones (D17) ficam para depois.', 'Manter.'],
  ['Introdução de 4 telas e "Como escrever rápido"', 'O tutorial das regras do motor que você pediu em 28/10 (U11, D2).', 'Quatro telas antes de usar atrapalham quem já sabe; não há perfis prontos (D13).', 'Manter. Perfis prontos (D13).'],
]

export const ondasPerfil = {
  1: 'Agora: responde a algo que você já escreveu, com esforço pequeno ou médio e sem depender de item posterior. No máximo três itens de Android juntos.',
  2: 'Depois: encaixe alto que depende de itens da onda 1, pede esforço grande, melhora algo que já funciona ou é ganho de longo prazo; ou encaixe médio com ganho claro.',
  3: 'Só se o uso real pedir: sem sinal no seu uso, ou custo alto para o ganho.',
}

export const trilhas = { 2: 'TypeScript', 3: 'HTML e CSS', 4: 'React', 5: 'Estado e dados locais', 7: 'Supabase', 8: 'Sincronização', 9: 'Integrações e OAuth', 10: 'Android', 11: 'Windows e Rust', 12: 'Qualidade e publicação' }
export const infras = { aparelho: 'só no aparelho', android: 'Android nativo', windows: 'Windows nativo', servidor: 'precisa de servidor', google: 'depende do Google', decisao: 'decisão sua' }
export const esforcos = { P: 'pequeno (dias)', M: 'médio (1 a 2 semanas)', G: 'grande (mais de 2 semanas)' }
export const encaixes = { alto: 'alto', medio: 'médio', baixo: 'baixo' }
