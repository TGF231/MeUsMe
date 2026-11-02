# Roadmap do MeUsMe até a produção

Do app que funciona para você até um app que outras pessoas podem baixar numa loja. Cada fase tem uma **linha de chegada** verificável, como no próprio MeUsMe, e indica quais trilhas do [guia de estudo](GUIA-DE-ESTUDO.md) você precisa ter feito antes.

Sugestão: crie no MeUsMe um projeto para cada fase, com a linha de chegada abaixo. O app foi feito para isso.

As fases 1 e 2 já estão quebradas em tarefas pequenas, com energia e linha de chegada, em [TAREFAS.md](TAREFAS.md).

Ideias de produto vindas de uma pesquisa com 30 vantagens e 30 desvantagens de concorrentes (só o que o MeUsMe ainda não tem), em ondas e cruzadas com o seu perfil (seção [Seu perfil e o que ele muda](#seu-perfil-e-o-que-ele-muda)): [CONCORRENTES.md](CONCORRENTES.md) e o [mapa mental](mapa-concorrentes.html).

---

## Onde estamos (retrato honesto)

**Funciona e tem teste automático (44 testes):** mesclagem da sincronização, leitor de notificações de banco, cálculo das cores do tema, progresso, calibração do tempo e revisão semanal.

**Revisão pela pesquisa sobre TDAH (outubro de 2026):** cada função foi conferida contra a evidência, e entraram introdução, progresso, combinado de 5 minutos, anel de foco, palpite × real, revisão da semana, recepção sem culpa e lista de espera de compras. Detalhes em [PESQUISA-TDAH.md](PESQUISA-TDAH.md).

**Funciona e foi testado à mão:** todas as telas na web; app Android no emulador (captura de notificação, lembrete com app em segundo plano, tema); app Windows (atalho global, bandeja, tempo por programa).

**Nunca foi testado com o serviço real:**

| Item | Por quê | Risco |
|---|---|---|
| Sincronização com Supabase | servidor ainda não existe | alto: é onde mora o risco de perder dados |
| Open Finance (Pluggy) | só com respostas simuladas | médio |
| Google Agenda | sem Client ID | médio; no Windows o login pode nem funcionar. A leitura de outras agendas pelo ID (D08) também só foi conferida com dados simulados |
| Notificações reais dos 5 bancos | textos de exemplo, não reais | médio: o que não for entendido vai para a Caixa |
| Login por código | só com servidor simulado | médio |
| Barra de título do Windows acompanhando o tema | não foi aberto depois da mudança | baixo |

**Dívidas técnicas conhecidas:**

1. **localStorage tem limite de ~5 MB** e é síncrono. Com anos de lançamentos e sessões, pode encher. Plano: migrar para IndexedDB antes de ter usuários com muito histórico.
2. **Conflito de sincronização é por registro inteiro.** Se o mesmo passo for editado em dois aparelhos offline, vence a última edição inteira; não há mescla campo a campo.
3. **Os testes cobrem só funções puras.** Não há testes de tela (componentes) nem de ponta a ponta.
4. **Erros em produção ficam só no aparelho.** Há tela de erro e registro local (Ajustes → Sobre); ainda não são enviados a um painel.
5. ~~Biblioteca do Supabase no pacote inicial.~~ Resolvido: carregada só por quem entra na sincronização.
6. **Fuso horário:** datas usam o fuso do aparelho. Viajar ou ter aparelhos em fusos diferentes pode deslocar um dia no histórico.
7. **A captura depende do texto de cada banco:** se um banco mudar o formato da notificação, o gasto deixa de ser reconhecido (vai para a Caixa) até o leitor ser ajustado.

---

<!-- perfil:início -->
## Seu perfil e o que ele muda

Leitura de 31/10/2026 do que você escreveu e decidiu, usada para conferir cada função do app e cada ideia de [CONCORRENTES.md](CONCORRENTES.md) e escolher o que fazer primeiro. Não é uma avaliação sobre você.

**De onde vem.** As 61 mensagens suas e as 7 respostas de múltipla escolha da sessão do Code (5 a 31/10, no horário de Brasília; é a única sessão guardada neste computador), as memórias do projeto, os 36 chats do claude.ai (as abas Arquivado e Compartilhadas estão vazias) e a tarefa do Cowork "Design system", que li por inteiro e só confirma o que o projeto já registra: o MegUI como fonte única do visual. Dos chats, três eu li por inteiro: agenda e tarefas (setembro), marca pessoal e uma ferramenta de trabalho, esta só para ver como você pede e confere, sem usar o conteúdo. Os outros 33 são trabalho técnico (bancos de dados, Delphi, Windows): li a prosa das suas mensagens e o código e os logs que você colou, com segredos, endereços, números longos e textos entre aspas trocados por marcadores; os anexos, as imagens e as ferramentas que o Claude usou eu analisei por contagem. Credenciais e nomes de cliente eu não li, porque não ajudam o perfil e a ferramenta os bloqueia; nada disso foi copiado para estes documentos. Também não analisei o texto das respostas do Claude: o perfil é seu, e delas usei só a contagem de ferramentas. Não há conteúdo de organização pessoal ali (a busca por agenda, prioridade, rotina e foco só achou falsos positivos, como o "Agendador de Tarefas" do Windows), mas há traços de como você trabalha, usados em D6 a D10, e números de uso (horário, tamanho). A sessão do Code é a única no disco; o Cowork não tem sessões locais. Não vi outros computadores.

### Sinais, com a evidência

Como você usa (U) e como você constrói (D). Os códigos aparecem nas tabelas de [CONCORRENTES.md](CONCORRENTES.md#cruzamento-com-o-seu-perfil).

| # | O que você disse ou fez | Fonte | O que isso pede do app |
|---|---|---|---|
| U1 | Escolher o que fazer parece aleatório; priorizar e estimar prazos é o maior desafio. | Code 5/10 · chat de agenda 8/9 | O app decidir e explicar a escolha; estimativa como palpite, nunca como cobrança. |
| U2 | Perde a energia perto do fim: no ponto decisivo restam ideias vagas, nada concreto. | Code 5/10 | Transformar o vago num próximo passo físico e proteger a reta final. |
| U3 | Rende em horários sem padrão ("varia bastante"). | chat de agenda 8/9 | Não presumir manhã ou tarde; ler a energia do momento. |
| U4 | Não tem método próprio e pede sugestões prontas; testa e pede outra saída quando uma não serve. | chat de agenda 8/9 | Propor, mostrar o motivo, deixar recusar. |
| U5 | Digitar cansa: "muita escrita para criar as tarefas", "digitar R$ é lento, principalmente em celulares com teclado virtual". Já ditou um pedido por áudio (chat de agosto). | Code 27/10 e 28/10 · claude.ai ago. | Captura com o mínimo de toques: voz, compartilhar, widget, atalhos. |
| U6 | Testou Notion, ClickUp, Super Productivity e as suítes do Google e da Microsoft, e "nada funcionou". | Code 5/10 | Nada que exija manter um sistema: poucas telas, poucos campos obrigatórios. |
| U7 | Captura de gastos pelas notificações do banco: "o problema com as notificações é a inconsistência" (banco que não avisa, gasto que não aparece, lido errado, duplicado, tudo na Caixa). | Code 28/10 | Mostrar o que funcionou e o que falhou na captura, e ter um caminho que não dependa da notificação. |
| U8 | A agenda real é compartilhada com colegas; quer ver só o dia de hoje, na agenda de verdade, e que compromisso vença tarefa solta. | chat de agenda 8/9 · Code 6/10 | Ler a agenda que você usa, inclusive a da equipe. |
| U9 | Quer saber quanto tempo gastou em cada coisa. | Code 6/10 | Tempo real por passo e por projeto, comparado com o palpite. |
| U10 | Dinheiro em cinco bancos e carteiras (Mercado Pago, PicPay, Next, Inter, Nubank) e registro automático. | Code 6/10 e 28/10 | Captura que funcione sem infraestrutura empresarial. |
| U11 | No produto final quer tudo "o mais simplificado possível"; achou a sincronização via Supabase pouco intuitiva para quem usa. | Code 6/10 | Zero configuração para quem usa. |
| D1 | Desenvolvedor autônomo, sem CNPJ nem conta de loja: quer algo substancial sem infraestrutura gigante. | Code 28/10 | Dados no aparelho; servidor só onde já existe. |
| D2 | Precisa entender cada canto do código: amplo em bancos locais e lógica, com C++ sem bibliotecas e Python básico, sem aprofundar em outras linguagens. | Code 6/10 | Poucas dependências, regras que dê para explicar em voz alta, ordem que siga as trilhas de estudo. |
| D3 | Quer publicar na Play Store e na Microsoft Store sem o rótulo de "perigoso". | Code 27/10 | Permissões sensíveis explicadas e com plano B. |
| D4 | Confere pelo teste: pede teste no emulador, tira dúvida com um teste, compara os totais de duas versões da mesma consulta, levanta casos de borda (meia-noite contra 23:59:59, item de peso muito baixo) e corrige a hipótese em uma frase. | Code 28/10 · chat de trabalho 2/10 | Cada item com linha de chegada medível e um teste. |
| D5 | Quer tudo em um lugar (tarefas, tempo, diário, agenda, finanças, desktop), mas já se perdeu em ferramentas pesadas. | Code 5/10 | Módulos que podem ser desligados. |
| D6 | Conversa com o Claude em horário de trabalho (93% das 506 mensagens dos chats entre 6h e 18h, 99% em dia útil) e constrói o MeUsMe à noite (77% das 61 mensagens do Code depois das 18h). Isso mostra quando você escreve, não quando rende (U3 continua sendo o que você disse). | claude.ai (fev a out) · Code | Tarefas pequenas, que caibam numa noite; o que for de uso diário precisa servir no expediente, onde a agenda da equipe manda. |
| D7 | Pensa de forma declarativa: em fevereiro escolheu "o que precisa ser feito, não como fazer" e "resolver problemas de forma declarativa e direta", e disse ter "alto entendimento de lógica" mas faltar a semântica da linguagem. | claude.ai fev. · Code 6/10 | Regras configuráveis que dá para ler (como o motor e o "ensinar o app a ler"), em vez de código escondido. |
| D8 | Constrói ferramentas para dados de produção com trava de segurança (registram "backup obrigatório antes de reconstruir", rodam em fases com as triggers desligadas, usam ROLLBACK e gravam uma auditoria da divergência antes da limpeza) e criou um checklist de validação com dados reais. | claude.ai jul. a out. | Backup antes de qualquer operação destrutiva e verificação com dados reais antes de liberar. |
| D9 | Trabalha com SQL todo dia e depura colando código e erro: nas 506 mensagens dos chats, 21% trazem código ou log (30% dos caracteres), sobretudo SQL (Firebird em 61 mensagens, SQL Server em 8), depois Pascal e relatórios (19), PowerShell e BAT (11) e Python (8). Também manda 77 imagens e 55 arquivos de texto. O conteúdo é de ERP fiscal e financeiro (notas, SPED, comissões, estoque), e você exporta para CSV e XLSX e confere no Excel. | claude.ai (os 36 chats) | Erros copiáveis (já há "Copiar" em Ajustes → Sobre), aceitar imagem e arquivo na captura e uma camada de dados local que seja a parte que você mais domina. |
| D10 | No trabalho usa o Claude como executor: 27 dos 36 chats geraram arquivos (cerca de 195 criados e 570 edições de trecho nas respostas), e você testa no seu ambiente e devolve o resultado ou o erro. | claude.ai (os 36 chats) | No MeUsMe, manter esse ciclo (pedir, testar, colar o erro), mas com você lendo e explicando o que entrou. |

### Tensões a decidir

| Tensão | Sinais | Como o roadmap trata |
|---|---|---|
| Tudo em um lugar × me perco em ferramenta pesada | D5, U6 | Módulos que se desligam e perfis prontos (D14, D13): o app cresce por trás, a tela não. |
| Quero sugestões × quero controle | U4, U1 | Propor, dizer o motivo e nunca mover sozinho (D03). |
| Entender cada canto do código × lançar logo | D2, D3 | Ordenar pelas trilhas do guia de estudo: primeiro TypeScript e React, depois Android, depois Rust. |
| Sem infraestrutura × sincronizar e compartilhar | D1 | Servidor só o que já existe (Supabase, e-mail e código); compartilhar com outras pessoas fica para depois. |
| Digitar menos × regras que eu consiga explicar | U5, D2 | Voz, compartilhar e widget entram pelo mesmo motor de regras, que tem tutorial curto. |
| Construo à noite × o app vale mais durante o expediente | D6, U8 | Hipótese a conferir na fase 1: dar prioridade ao que serve no trabalho (agenda da equipe, captura rápida) e quebrar o resto em tarefas de uma noite. |
| Regras declarativas que eu leio × rede que aprende sozinha | D7, D2 | A rede sugere e só cria sozinha depois de medida (README); capacidade nova entra primeiro como regra legível (D26, V28). |
| Delego código no trabalho × quero entender cada canto do MeUsMe | D10, D2 | Cada item entra como tarefa pequena, com teste, e você explica o que entrou antes de dar por pronto (modo "você escreve, eu reviso" de TAREFAS.md). |

### Lacunas que nenhum concorrente cobre

- **L1 · A agenda da equipe não chega ao app.** No chat de 8/9 você disse que a sua agenda é compartilhada com colegas e a pessoal estava vazia: os compromissos ficavam na agenda da equipe. O app lê só a agenda principal (`calendars/primary` em src/google.ts). Ler as agendas que você escolher ou um .ics (D08). Confira antes se você administra a agenda da equipe: o endereço .ics secreto só aparece para quem tem essa permissão.
- **L2 · Organização de desktop.** Estava na primeira mensagem (5/10). Hoje o app só mede o tempo por programa (Windows); não organiza nada na área de trabalho. Decidir: entra (ex.: abrir de uma vez os programas e arquivos de um projeto) ou sai da visão do produto. Não foi pesquisado.
- **L3 · Diário (journaling).** Também estava na primeira mensagem. Hoje o check-in de 30 segundos guarda humor, energia e uma frase. Decidir: manter leve (combina com U5 e U6) ou criar uma tela de diário.

### Função por função: vantagens e desvantagens para você

O que o app já tem, visto pelo seu perfil. Quando o item citado é de [CONCORRENTES.md](CONCORRENTES.md), a tabela dele diz ganho, custo e esforço.

| Função | Ajuda você porque | Custa ou arrisca | Veredicto |
|---|---|---|---|
| **Agora: um passo só, escolhido pela energia** | Responde ao "prioridades aleatórias" (U1): o app escolhe e mostra o motivo; compromisso vence tarefa solta (U8); usa energia, não hora do dia (U3). | Só escolhe entre o que você cadastrou. Passo não tem prazo, então o que é urgente de verdade não pesa; o esforço quem marca é você. | Manter e destacar. O que falta é o prazo (V09). |
| **Combinado de 5 minutos, anel de foco e palpite de tempo** | Atacam o começar e o estimar sem bloquear nada (U1, U2). | O palpite é opcional: no começo há pouco dado, e a capacidade do dia (V14) só funciona com palpites. | Manter. Meça no uso real quantos passos têm palpite. |
| **Recepção sem cobrança e revisão da semana** | Volta ao app sem pilha de culpa (U2, U6). | Depende de você abrir o app ou de o aviso da revisão tocar (só testado no emulador). | Manter. Liga ao diagnóstico de lembretes (D23). |
| **Projetos com linha de chegada** | Define o "pronto" antes e mostra só o próximo passo (U2). | É um campo obrigatório a mais na criação (U6) e passos sem projeto ficam soltos. Dá para editar depois, o que cobre o seu hábito de corrigir o pedido no meio do caminho (aparece em 14 dos 36 chats). | Manter. Avaliar sugerir a linha de chegada em vez de exigir. |
| **Caixa: captura em 1 segundo, regras e rede neural local** | Tira da cabeça com pouca digitação (U5), com regras que dão para explicar (D2) e tutorial curto. | Sem revisão do que fica parado (D09) e sem entrada vinda de outros apps (V03): o que o motor não entende acumula. | Manter e acrescentar V03 e D09. |
| **Voz que já salva a nota** | Pedido seu em 28/10 (U5). | Qualidade depende do reconhecimento de voz do aparelho; foi testado só no emulador. | Manter. Testar no celular real na fase 1. |
| **Captura global do Windows (Win + Ctrl + Alt + Espaço)** | Atalho que você escolheu (6/10) e que cobre o "widget" no PC (U5). | São quatro teclas; se o Windows recusar, vale o reserva Ctrl + Alt + Espaço. | Manter. |
| **Agenda e Google Agenda** | Compromissos ao lado dos passos e tempo livre entre eventos (U8). | Lê só a agenda principal: a da equipe não aparece. Exige OAuth próprio e verificação do Google (D1) e no Windows o login pode nem funcionar (nunca testado). | Rever agora: ler as agendas que você escolher (D08, lacuna L1). |
| **Lembretes e notificações** | Ficam agendados no sistema e tocam com o app fechado no Android (testado no emulador). | No navegador só tocam com o app aberto, e sem diagnóstico não dá para saber por que um lembrete falhou. Não vi queixa sua sobre lembretes; só foram testados no emulador. | Manter. Testar no celular real na fase 1; se algum lembrete falhar, diagnóstico (D23) e ações na notificação (V18). |
| **Finanças: livre por dia, contas fixas, limites** | O "livre por dia" responde sem exigir método de orçamento (U6, U10). | Sem cartão com fatura nem parcelas: compra no cartão e pagamento da fatura podem contar duas vezes. Só barras por categoria. | Manter. Confirmar a contagem dupla no uso real antes de construir V23. |
| **Captura de notificações do banco (Android)** | Registro automático sem servidor (U10, D1). | Depende do texto de cada banco e a Play pode recusar a permissão (D3). Você já viu as falhas: banco sem aviso, gasto que não aparece, lido errado, duplicado, tudo na Caixa (U7). | Manter com plano B: OFX (V27), saúde da conexão (D25) e ensinar o app a ler (D26). |
| **Open Finance (Meu Pluggy)** | Dado oficial que substitui o provisório. | Só uso pessoal; o plano comercial exige a infraestrutura que você disse não querer (D1). Nunca testado com conta real. | Manter só no seu build. Em 28/10 você disse que ele exige robustez empresarial e que quer evitar infraestrutura gigante. |
| **Importação de extrato CSV** | Funciona hoje sem permissão e sem servidor (Nubank, Inter, Wallet). | É manual, e cada banco tem o seu formato. | Manter e somar OFX (V27). |
| **Antes de comprar (lista de espera)** | Segura o impulso sem proibir. | Só funciona se você lembrar de usar; não mostra o efeito da compra no mês (D27). | Manter. |
| **Histórico e check-in de 30 segundos** | Tempo real por passo e por projeto, palpite × real (U9). | O "diário" do pedido original ficou em humor, energia e uma frase (lacuna L3). | Manter. Decidir sobre o diário. |
| **Tempo por programa (Windows)** | A sua ideia de saber onde o tempo do computador vai; guarda só o nome do programa. | Só Windows. Mede, mas não organiza a área de trabalho (lacuna L2). | Manter. Decidir sobre L2. |
| **Sincronização (Supabase, e-mail e código)** | Sem senha e sem configuração para quem usa (U11); cada item sincroniza separado. | O servidor é seu e é o maior risco do roadmap: nunca foi testado de verdade (D1). O conflito é por registro inteiro (dívida 2). | Manter. Fase 1 antes de qualquer função que dependa dele (D19, V22). |
| **Backup e restauração** | O arquivo é seu e não depende do servidor (D1, D2). | É manual: se você esquecer de exportar, não há cópia. O localStorage tem cerca de 5 MB. | Manter. Backup automático (D21) na fase 2. |
| **Tema MegUI, acento e acessibilidade** | É a sua identidade visual; teclado e leitor de tela foram verificados. | Cada preferência a mais é um ajuste a manter; densidade e ícones (D17) ficam para depois. | Manter. |
| **Introdução de 4 telas e "Como escrever rápido"** | O tutorial das regras do motor que você pediu em 28/10 (U11, D2). | Quatro telas antes de usar atrapalham quem já sabe; não há perfis prontos (D13). | Manter. Perfis prontos (D13). |

### O que muda nas fases

- **Fase 1 (uso real).**
  - Conecte a agenda compartilhada de verdade e anote se os compromissos da equipe aparecem: hoje o app lê só a principal (L1).
  - Ao anotar falhas na captura de gastos pelas notificações do banco, use as cinco que você mesmo listou em 28/10: o banco não gerou aviso, o gasto não apareceu, foi lido errado, veio duplicado, foi para a Caixa. Isso alimenta D25 e D26.
  - Confira se a compra no cartão e o pagamento da fatura contam duas vezes no "livre por dia" antes de construir V23.
  - Teste a voz e os lembretes no celular de verdade (hoje só no emulador): se algum lembrete falhar sem aviso, D23 (diagnóstico) sobe para a onda 1.
- **Fase 2 (robustez).** Some D23 (diagnóstico de lembretes), D20 (exportar em formatos abertos), D21 (backup automático) e D24 (desempenho no CI). A mesclagem campo a campo (D19, dívida 2) só se a fase 1 mostrar conflito de verdade. A migração para IndexedDB (dívida 1) é a parte do código mais próxima do que você já domina, bancos locais e consultas (D2, D9): bom candidato para você escrever.
- **Fase 3 (produto para outras pessoas).**
  - Open Finance: em 28/10 você disse que ele exige robustez empresarial e que quer evitar infraestrutura gigante; a recomendação é não contratar o plano comercial e ficar com notificações, OFX ou CSV e saúde da conexão (D25).
  - Google Agenda: decida entre a verificação do Google e o .ics só depois de conferir a sua permissão na agenda da equipe; um .ics não ajuda se você não a administra.
  - Perfis prontos e módulos (D13, D14) antes de convidar outras pessoas, e a decisão do que fica sempre gratuito (D22, decidida: ver [Modelo de preço](#modelo-de-preço)).
- **Captura por assistente de voz** ([CONCORRENTES.md](CONCORRENTES.md#captura-por-assistente-de-voz-gemini-e-siri)).
  - Agora (A1): link e atalho do app "Capturar por voz", para "Hey Google, abrir MeUsMe" cair direto na gravação. Entra junto com V03.
  - Fase 8, iPhone (A3): App Shortcut "Anotar no MeUsMe" com App Intents. O Atalho do iPhone que dita e abre um link (A2) é o degrau mais barato antes disso.
  - Gemini (A4): não está aberto para o MeUsMe hoje. O AppFunctions roda no aparelho e combina com o app; reavaliar quando o Android 17 sair. A Connected Apps Platform fica de fora, porque exige servidor.
  - "Hey MeUsMe" com overlay: no Android, primeiro o MeUsMe como assistente digital padrão (A5, onda 2), que abre a captura por cima de qualquer app pelo gesto, sem microfone sempre aberto. A palavra de ativação sempre ligada (A6 no Android, A7 no Windows) fica opcional, desligada por padrão e na onda 3. No iPhone não dá (A8): o Botão de Ação dispara o atalho de A3.
- **Apps de automação** (Tasker, MacroDroid, Automate, AutoHotkey): só ideia, sem decisão e fora das fases ([CONCORRENTES.md](CONCORRENTES.md#integração-com-apps-de-automação-ideia)). O link meusme://captura já serve a eles hoje (AU1).
- **Feito em 2/11/2026:** toda a onda 1 pelo seu perfil (V09, D04, D25, D14, D13, V27, V20, D03, D08, V03, V02) e o atalho de voz A1; da onda 1 da pesquisa, tudo menos V23, que espera a fase 1 confirmar a contagem dupla; e, da onda 2 pelo perfil, V04, V13, V14, V28, D09, D16, D20 e D21 (plano de saída, lembrete de backup e cópia semanal em Documentos/MeUsMe; no Windows, conferida só pelo teste em Rust, sem abrir o app); da onda 3, V15 (encerrar o dia no check-in), D05 (compromissos colados), V26 (comparar meses), V25 (metas de economia), V29 (assinaturas esquecidas), D10 (ideias com validade de 90 dias), D12 (marcos raros, sem pontos) e a densidade compacta do D17 (falta "ícones ou só texto").
- **Ordem pelo seu nível.** Da onda 1 para você, V09, V20, V27, D04, D13, D14 e D25 são só TypeScript e React; D08 pede a trilha 9; V02 e V03 pedem a trilha 10. D03 é regra, sem código novo.
- **Regra de entrada.** Cada item só vira tarefa em [TAREFAS.md](TAREFAS.md) com linha de chegada medível e um teste, do jeito que você já cobra.
<!-- perfil:fim -->

---

## Fases

| Fase | O que entrega | Duração estimada* | Trilhas antes |
|---|---|---|---|
| 0. Controle | você constrói e explica tudo sozinho | 6–8 semanas | 1 a 6 |
| 1. Uso real pessoal | 30 dias usando no celular e no PC, sincronizado | 4–6 semanas (em paralelo à fase 0) | 7, 8 |
| 2. Robustez | dados seguros, erros visíveis, testes de tela | 4–6 semanas | 4, 5, 12 |
| 3. Produto para outras pessoas | primeiro uso guiado; decisões sobre Pluggy e Google | 3–4 semanas | 9 |
| 4. Jurídico e presença | site, política de privacidade, termos | 2 semanas | 12 |
| 5. Android na Play Store | publicado | 4–6 semanas (inclui 14 dias de teste fechado) | 10 |
| 6. Windows | instalador assinado ou na Microsoft Store | 2–4 semanas | 11 |
| 7. Operação | rotina de versões, suporte e custos | contínuo | 12 |
| 8. iPhone (opcional) | app na App Store | 6–8 semanas | 10 + Swift básico |

\* Estudando e desenvolvendo ~1 a 2 horas por dia. Realista para lançamento público: **6 a 9 meses**.

### Fase 0: Controle

Objetivo: o app deixa de ser "feito pela IA" e passa a ser seu.

- ~~Repositório privado no GitHub, com o histórico atual.~~ Feito.
- ~~**Integração contínua** (GitHub Actions): a cada envio, roda `npm test`, `npm run lint` e `npm run build`. Você nunca mais publica algo que não compila.~~ Feito, junto com a release automática por tag (ver [PRODUCAO.md](../PRODUCAO.md#publicar-github-actions)). Falta você ler e explicar os dois arquivos de `.github/workflows/`.
- Construir as três versões (web, Android, Windows) numa máquina limpa, seguindo só o README. O que faltar no README, você escreve.
- Ler o [mapa do código](GUIA-DE-ESTUDO.md#0-o-mapa-como-o-meusme-funciona) e fazer as provas de domínio das trilhas 1 a 6.

**Linha de chegada:** você apaga a pasta `node_modules`, clona o repositório de novo, gera os três aplicativos sem ajuda e explica em voz alta o caminho de um clique em "Já fiz" até o dado aparecer no outro aparelho.

### Fase 1: Uso real pessoal (dogfooding)

Objetivo: tirar tudo da coluna "nunca testado com o serviço real".

- Criar o projeto Supabase seguindo o [PRODUCAO.md](../PRODUCAO.md): esquema, modelo de e-mail com o código e SMTP.
- `.env.production.local` com o servidor, e o Open Finance ligado (é uso pessoal).
- Instalar no seu celular e no seu PC, e usar todo dia.
- **Coletar as notificações reais dos seus bancos.** Quando uma cair na Caixa, copie o texto e transforme num caso de teste em [testes/bancos.test.ts](../testes/bancos.test.ts) antes de corrigir o leitor.
- Conectar o Meu Pluggy e o Google Agenda de verdade.
- Anotar cada problema na Caixa do próprio MeUsMe.

**Linha de chegada:** 30 dias de uso diário em dois aparelhos sem perder nenhum dado, e todos os itens "nunca testado" verificados (ou consertados).

### Fase 2: Robustez

- **IndexedDB** no lugar do localStorage (a persistência do zustand aceita outro armazenamento), com migração automática dos dados atuais.
- **Relatório de erros** sem enviar conteúdo pessoal, só o erro. Parte local feita (tela de erro e registro no aparelho); falta enviar ao servidor.
- **Testes de tela** com Vitest + Testing Library para os fluxos centrais (concluir passo, registrar gasto, capturar), e **testes de ponta a ponta** com Playwright para o primeiro uso e a sincronização.
- ~~Teste de estresse da sincronização~~: feito com três aparelhos e 200 sementes.
- Restaurar um backup exportado num aparelho limpo (teste de recuperação). A restauração já valida o arquivo antes de gravar e avisa quando a sincronização vai espalhar o backup.
- ~~Carregar o Supabase só quando a sincronização for usada.~~ Feito.
- Revisão de acessibilidade (leitor de tela, contraste, tamanho de toque).

**Linha de chegada:** a integração contínua roda testes de tela e de ponta a ponta, e um erro forçado em produção aparece no seu painel em minutos.

### Fase 3: Produto para outras pessoas

- ~~**Primeiro uso guiado:** 3 telas curtas (Agora, Caixa, Linha de chegada) e um projeto de exemplo que dá para apagar.~~ Feito (4 telas).
- **Decisão sobre Open Finance:** plano comercial da Pluggy (servidor próprio para o segredo, Edge Function) **ou** ficar só com notificações de banco + importação de extrato. A segunda opção é bem mais barata.
- **Decisão sobre Google Agenda:** passar pela verificação do Google **ou** trocar por assinatura do "endereço secreto iCal" da agenda. A pessoa cola um link, o app só lê e não precisa de verificação; criar eventos no Google deixa de existir.
- Textos de ajuda onde as pessoas travarem (anotados na fase 1).

**Linha de chegada:** alguém que nunca viu o app instala e conclui o primeiro passo sozinho, sem você explicar nada.

### Fase 4: Jurídico e presença

- Domínio próprio e um site simples com o app web, a política de privacidade, os termos de uso e a página "como apagar sua conta" (exigida pelo Google Play).
- ~~Política de privacidade cobrindo LGPD~~: escrita em [public/privacidade.html](../public/privacidade.html), com a seção de exclusão de conta. Os termos de uso estão em [public/termos.html](../public/termos.html). Falta publicar os dois num endereço fixo e revisar com quem entende de LGPD.
- E-mail de suporte.
- Página de preços com as regras públicas do [Modelo de preço](#modelo-de-preço), e a política de privacidade cobrindo a conta opcional (e-mail e lista de compras).
- ~~Link para a política dentro do app (Ajustes).~~ Feito (Ajustes → Sobre).

**Linha de chegada:** os três links (política, termos, exclusão de conta) estão públicos e acessíveis de dentro do app.

### Fase 5: Android na Play Store

- Chave de assinatura e Play App Signing ([PRODUCAO.md](../PRODUCAO.md#3-android-google-play)).
- Conta no Play Console; teste fechado com **12 testadores por 14 dias**.
- Formulário de segurança dos dados; declaração da leitura de notificações e de recursos financeiros.
- Ficha da loja: textos, capturas de tela, ícone.
- **Compras** ([Modelo de preço](#modelo-de-preço)): perfil de pagamentos na Play; pacotes como produtos de compra única e a sincronização como assinatura, pela cobrança da Play; liberar sem internet; "Restaurar compras" em Ajustes.
- **Conta opcional** separada da assinatura: entrar só para guardar compras; conferência da compra no servidor (Edge Function ou RevenueCat) antes de gravar na conta.

**Linha de chegada:** o MeUsMe aparece na busca da Play Store.

### Fase 6: Windows

- Decidir: **Microsoft Store via MSIX** (assinatura grátis pela loja, exige converter o instalador) ou **instalador assinado** (certificado de ~US$ 150–300/ano) para download direto.
- Atualização automática pelo atualizador do Tauri (chave própria de atualização).

**Linha de chegada:** instalar num PC limpo sem o aviso "O Windows protegeu o computador", e o app se atualizar sozinho para a versão seguinte.

### Fase 7: Operação

- Rotina de versão: `npm run versao` → testes → builds → checklist manual curto → publicar → anotar o que mudou.
- Acompanhar o uso e os custos do Supabase; backup diário (no plano Pro há restauração para qualquer momento).
- Responder suporte; transformar cada relato em teste antes de consertar.
- Acompanhar se as assinaturas pagam o servidor; revisar os preços uma vez por ano, sem nunca cobrar pelo que já é grátis.
- Assinatura vencida: aviso antes, 30 dias para baixar o que está na nuvem, nada apagado do aparelho.

### Fase 8: iPhone (opcional)

Mac com Xcode, conta Apple Developer, `npx cap add ios`. Sem leitura de notificações de banco (o iOS não permite). Notificações agendadas funcionam com o mesmo plugin.

---

## Modelo de preço

Decidido em 2/11/2026 (D22). Nada é cobrado antes da fase 5: até lá o app é grátis, sem anúncios, com um botão de apoio opcional que não libera nada. Os testadores do teste fechado da Play ganham tudo de graça para sempre.

| Nível | O que entra | Preço de partida |
|---|---|---|
| **Grátis para sempre** | Tudo que roda só no aparelho: captura (voz, compartilhar, bloco, widget), Agora, passos, prazos, repetição, lembretes, Caixa, finanças manuais, CSV e OFX, notificações do banco, busca e backup em arquivo | R$ 0 |
| **Pacotes (compra única)** | O que não gera custo mensal, em poucos pacotes por tema: captura avançada (voz por cima de outros apps, janela no Windows), visual e conforto (temas, linha do tempo), relatórios (revisões e gráficos mais longos). Um pacote **Completo**, mais barato que a soma, inclui os que vierem depois | R$ 49 a R$ 79 o Completo |
| **Assinatura de sincronização** | Só o que gera conta todo mês: sincronização entre aparelhos e backup na nuvem. Se um dia houver Open Finance, é plano à parte | cerca de R$ 7,90/mês ou R$ 59/ano |

**Regras públicas** (publicar no site e na ficha da loja):

- O que é grátis hoje nunca vira pago.
- Exportar e restaurar o backup em arquivo é sempre grátis.
- Se a assinatura acabar, nada é apagado: os dados ficam no aparelho, só a sincronização para, e há 30 dias para baixar o que está na nuvem.
- As compras valem sem internet. O app não confere a licença a cada abertura e não limita o número de aparelhos.

**Conta opcional.** A conta (o login por código no e-mail que já existe) fica separada da assinatura:

| | Conta | Assinatura de sincronização |
|---|---|---|
| Obrigatória? | Não | Não |
| Preço | Grátis | Paga |
| Para que serve | Guardar o que a pessoa comprou e liberar nos outros aparelhos | Copiar os dados entre aparelhos e guardar o backup na nuvem |
| O que fica no servidor | E-mail e lista de compras | Os dados do app |

- Primeira vez: abre e usa, sem cadastro.
- Primeira compra: compra pela Play sem conta e libera no aparelho; depois, uma oferta opcional: "Quer usar em outros aparelhos? Entre com seu e-mail".
- Ajustes: "Entrar" e "Restaurar compras" sempre à mão. Ao entrar, as compras feitas antes passam para a conta.
- A conta só é exigida para assinar a sincronização. Apagar a conta não apaga os dados do aparelho.

**Por quê.** Mensalidade só onde há custo mensal é fácil de explicar e evita a queixa mais comum contra Todoist e TickTick (plano grátis que encolhe, D22). Uma compra única não vira cobrança esquecida (V29) e combina com "nada se move sozinho" (D03). A conta do servidor fecha cedo: o Supabase Pro custa cerca de US$ 25/mês, e a R$ 7,90, depois dos 15% da Play, umas 20 a 25 assinaturas pagam o servidor. Os preços acima são de partida: revise com os preços dos concorrentes no momento da fase 5.

**O que decidir antes de cobrar:**

- **Conferir a compra no servidor** antes de gravar na conta: Edge Function própria com uma credencial do Google (mais servidor, contra D1) **ou** RevenueCat, que confere Play, Microsoft Store, Apple e web e liga tudo a um id de conta (confira o limite do plano gratuito).
- **Vender sem CNPJ:** a Play aceita perfil de pagamentos de pessoa física; a renda entra no carnê-leão. Confirme com um contador antes da primeira venda.
- **Preço por país:** valores próprios em reais na Play, não conversão do dólar.
- **Ordem das lojas:** começar só pela Play. Microsoft Store e pagamento na web (PWA, que não tem loja) vêm depois; o iPhone só quando a receita cobrir os US$ 99/ano da Apple.

---

## Riscos principais

| Risco | Efeito | Como reduzir |
|---|---|---|
| Bug na sincronização apaga dados | perda de confiança, irreversível | testes de mesclagem; backup exportável; restauração do Supabase; fase 1 longa |
| Google Play recusar a leitura de notificações | Android sem captura automática | explicação clara antes do pedido; o app funciona sem ela (CSV, manual) |
| Bancos mudam o texto das notificações | gastos vão para a Caixa em vez de registrar | casos de teste com textos reais; Caixa como rede de segurança |
| Custo do servidor cresce | conta mensal | localStorage/IndexedDB primeiro; sincronização só de mudanças; monitorar |
| Verificação do Google demora meses | Agenda indisponível para o público | alternativa iCal (só leitura) |
| Compra feita numa loja não aparece em outro aparelho | reclamação e reembolso | conta opcional com a compra conferida no servidor; "Restaurar compras" |
