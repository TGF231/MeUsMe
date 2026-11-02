# MeUsMe

Uma coisa de cada vez. Programa de organização de tarefas para decidir o próximo passo, chegar ao fim do que começou e manter tempo e dinheiro à vista.

No primeiro uso, uma introdução de quatro telas oferece um projeto de exemplo.

## Módulos

- **Agora**: o app escolhe *um* passo para você, de acordo com sua energia. Horário reservado vence; depois o projeto em foco; depois o projeto mais perto da linha de chegada. Mostra quanto tempo livre há até o próximo compromisso (e, no Resto do dia, uma faixa de agora até a meia-noite com compromissos, horários reservados e o tempo livre; quando dois compromissos estão colados, avisa "só 5 min até o próximo"), lembretes vencidos e contas do dia. **Montar meu dia** sugere alguns passos com horário no tempo livre de hoje (pela energia, pela agenda e pelos seus palpites) e você desmarca o que não quiser; se um horário reservado passa sem o passo feito, **Refazer o resto do dia** reencaixa esse e os próximos no tempo que sobra, e o que não couber volta para a fila sem horário. Em **Agendar**, o app propõe três horários livres (hoje e amanhã) com a duração prevista do passo; um toque reserva. Quando os passos com prazo hoje passam do tempo livre, o cartão **Hoje não cabe tudo** pergunta o que fica para amanhã. Barra de progresso até a linha de chegada, combinado de 5 minutos para começar, anel do bloco de foco e palpite de tempo. Quem volta depois de dias sumido é recebido sem cobrança, e uma vez por semana aparece a **revisão da semana** (Caixa, foco, projetos sem próximo passo, próximos 7 dias).
- **Agenda**: compromissos e lembretes (únicos ou repetidos), tempo livre entre eventos, sincronização com o Google Agenda. Além da agenda principal, dá para ler outras pelo ID (como a compartilhada com a equipe), só para leitura e com o nome que você der.
- **Caixa**: tire da cabeça em 1 segundo (botão `+` ou `Ctrl+Espaço`). Quatro regras organizam sozinhas, no aparelho, com Desfazer: "lembrar" vira lembrete, valor com sinal vira lançamento, hora vira compromisso; o resto fica na Caixa (`?` ao lado do campo ou Ajustes → Captura → *Como escrever rápido*, que tem um campo para experimentar). Também entende repetição (`academia toda segunda 7h`), intervalo (`reunião das 14h às 16h`), `ontem` num lançamento e passo de projeto (`site: arrumar o rodapé`). Para o que nenhuma regra cobre, uma rede neural pequena, no próprio aparelho, sugere o tipo na Caixa e aprende com o que você organiza; ela só cria sozinha depois de medida com capturas reais (ver [docs/MOTOR.md](docs/MOTOR.md)). Depois vira passo, projeto, gasto, compromisso, lembrete ou ideia. Valores começam com `-` (saída) ou `+` (entrada), colado no número: `-35 almoço`, `+1000 tv`. `R$`, `reais` e centavos também marcam valor (`R$ 35 almoço`, `35,00 almoço`), mas sem sinal a direção fica para você escolher. `35 almoço` sozinho fica só como texto, para não confundir número com valor. Vontade de comprar algo vai para a lista de espera. Colar um texto com várias linhas ou frases (uma lista, uma ata) mostra os itens separados antes de guardar; cada um entra na Caixa com a sugestão do app, sem criar nada sozinho, e um Desfazer tira todos. O que fica parado na Caixa por 30 dias volta no topo com uma pergunta: virar passo, apagar ou perguntar de novo daqui a 30 dias.
- **Finanças**: "livre para gastar por dia até o fim do mês", compras parceladas ("12x" vira uma parcela por mês, cada uma no mês dela), contas fixas com aviso de vencimento, limites por categoria, Open Finance pelo Meu Pluggy (gratuito para uso pessoal) e importação de extrato OFX (direto, sem escolher colunas) ou CSV (Nubank, Inter, Wallet…), sem duplicar e com categorização automática. Ao trocar a categoria de um lançamento, o app oferece uma regra ("sempre que tiver uber, Transporte") que vale antes das sugestões e também arruma os lançamentos sem categoria; as regras ficam em Contas e categorias. Em Bancos, **de onde chegam os lançamentos** mostra quando cada fonte trouxe dado pela última vez; se uma fonte automática para bem além do ritmo dela, o Resumo avisa. **Antes de comprar**: a compra espera de 24h a 1 semana e o app pergunta de novo, mostrando quanto ela tira do "livre por dia" até o fim do mês. O Open Finance só aparece em builds com `VITE_OPEN_FINANCE=ligado` (uso pessoal).
- **Projetos**: todo projeto nasce com uma *linha de chegada*. Só o próximo passo fica visível, com o progresso de quanto já foi feito. Um passo grande vira vários com **Quebrar**: o pedaço de 2 minutos primeiro, depois "e depois disso?" até você dizer que basta. Passos podem se repetir (todo dia, semana ou mês: depois de feito, volta sozinho e só aparece na data seguinte) e ter prazo e "só a partir de" (opcionais): o prazo pesa na escolha da tela Agora, e o que passou da data aparece como "para reagendar", com novas datas sugeridas para aceitar num toque.
- **Histórico**: check-in de 30 segundos (humor, energia, uma frase), que começa mostrando o que foi feito hoje e oferece passar para amanhã o que tinha prazo hoje e o que você fez em cada dia, com o tempo de cada passo e por projeto, e o quanto seus palpites de tempo batem com o real.
- **Ajustes**: **seções do app** (desligar Agenda, Finanças, Projetos ou Histórico tira a seção do menu sem apagar nada; a introdução oferece três perfis prontos), sincronização entre aparelhos, notificações (inclusive o dia da revisão semanal), conexão com o Google, backup (mostra quando foi o último; a revisão da semana lembra se passar de 30 dias; o Sobre explica o plano de saída; no Android e no Windows, uma cópia por semana vai sozinha para Documentos/MeUsMe e fica lá mesmo se o app for desinstalado) (e exportação em formatos abertos: passos em Markdown, lançamentos em CSV que o Excel abre e o Importar lê de volta, agenda em .ics), **Acessibilidade** (tamanho do texto, contraste alto, botões maiores, avisos que só saem quando você fecha) e **Sobre** (por que o app funciona assim, privacidade, espaço usado e erros recentes).

A lupa do topo (ou Ctrl+K) busca em tudo: passos, projetos, ideias, Caixa, lançamentos, compromissos e lembretes, sem se importar com acento.

O app funciona inteiro pelo teclado e com leitor de tela, não depende de falar nem de ouvir e respeita o tamanho de fonte, o alto contraste e a redução de movimento do sistema. O que foi verificado e como está em [docs/ACESSIBILIDADE.md](docs/ACESSIBILIDADE.md).

Os dados ficam no próprio aparelho (localStorage) e, se você ativar, são sincronizados entre aparelhos.

## Sincronização entre aparelhos

Usa um projeto [Supabase](https://supabase.com) seu (plano gratuito). Cada item (passo, gasto, evento…) sincroniza separadamente, então editar coisas diferentes no PC e no celular ao mesmo tempo não perde nada; funciona offline e envia quando a conexão volta.

Para quem usa: **Ajustes → Sincronização e backup**, digita o e-mail e o código de 6 dígitos que chega. Sem senha. Nos outros aparelhos, entra com o mesmo e-mail.

Para isso o app é compilado com o endereço do servidor (`.env.production.local`, ver [PRODUCAO.md](PRODUCAO.md)). Sem ele, há a opção avançada de usar um servidor próprio, dentro do mesmo cartão.

Não sincronizam, de propósito: o segredo da Pluggy, a conexão com o Google (cada aparelho conecta a sua) e o cache de eventos do Google.

A lógica de mesclagem tem testes: `npm test`.

## Notificações

Avisos de compromissos, lembretes, contas a vencer, check-in e tempo de foco. No navegador funcionam enquanto o app está aberto (mesmo minimizado ou em outra aba); no app Android ficam agendados no sistema e tocam com o app fechado. No Android, a notificação de lembrete tem os botões **Feito** (conclui o lembrete) e **Daqui a 10 min** (avisa de novo sem mudar o horário do lembrete); tocar num deles abre o app por um instante. Em Ajustes → Notificações, o app avisa se a economia de bateria pode segurar os avisos e tem um teste que chega com o app fechado.

## App Android

O mesmo código, empacotado com [Capacitor](https://capacitorjs.com) (pasta `android/`). Além do que a web faz:

- **Avisos com o app fechado**: os da próxima semana ficam agendados no Android.
- **Capturar sem abrir o app**: "Compartilhar → MeUsMe" em qualquer app guarda o texto ou o link na Caixa; o bloco **Capturar** nas Configurações rápidas abre a captura de qualquer tela; e o atalho **Capturar por voz** (tocar e segurar o ícone) abre a captura já ouvindo. O widget **Próximo passo** mostra na tela inicial o passo que a tela Agora sugere, com os botões Capturar e Voz; ele se atualiza quando a fila muda e ao sair do app (com o app fechado, um horário reservado que começa não aparece até a próxima abertura). Instalado pelo navegador, o app também aparece no Compartilhar do sistema.
- **Gastos pelas notificações do banco** (Nubank, Inter, Mercado Pago, PicPay, Next e outros que você marcar): viram lançamentos provisórios na hora; quando o Open Finance traz o oficial, ele substitui o provisório. O que não der para entender com segurança vai para a Caixa.
- O Google não permite login dentro do app: os compromissos do Google chegam pela sincronização com o PC.

Para gerar o APK (precisa do JDK 21 e do Android SDK; o caminho do SDK fica em `android/local.properties`):

```bash
npm run android:apk        # APK de teste
npm run android:release    # AAB para a Play Store (assinatura: ver PRODUCAO.md)
```

O arquivo sai em `android/app/build/outputs/apk/debug/app-debug.apk`. No celular, ao liberar "Acesso a notificações", o Android pode mostrar "configuração restrita" para apps instalados por APK: em Configurações → Apps → MeUsMe → ⋮ → **Permitir configurações restritas**.

## App Windows

O mesmo código, empacotado com [Tauri](https://tauri.app) (pasta `src-tauri/`). Além do que a web faz:

- **Captura de qualquer programa**: `Win + Ctrl + Alt + Espaço` abre uma janelinha por cima de tudo; escreva, Enter, ela some. Se o Windows recusar esse atalho, o reserva é `Ctrl + Alt + Espaço` (Ajustes mostra qual ficou valendo).
- **Tempo por programa**, medido sozinho a cada 5 segundos (só o nome do programa, nunca o título da janela; tempo parado não conta). Aparece no Histórico.
- **Bandeja do sistema**: fechar a janela não encerra o app; ele segue medindo o tempo e mandando avisos. Opção de iniciar junto com o Windows.

Para gerar o instalador (precisa de Rust e do Visual Studio Build Tools com C++):

```bash
npm run windows:release
```

O instalador sai em `src-tauri/target/release/bundle/nsis/`. Para desenvolver com recarga automática: `npx tauri dev`.

## Versões prontas

Cada tag `vX.Y.Z` enviada ao GitHub gera o instalador do Windows e o APK do Android pelo GitHub Actions, publicados em **Releases**. Como fazer: [PRODUCAO.md](PRODUCAO.md#publicar-github-actions).

## Google Agenda

1. Em [console.cloud.google.com](https://console.cloud.google.com), crie um projeto e ative a **Google Calendar API**.
2. Configure a **Tela de consentimento OAuth** como "Externo" e adicione seu e-mail como usuário de teste.
3. Crie uma credencial **ID do cliente OAuth** do tipo **Aplicativo da Web**, com `http://localhost:5173` (e o endereço publicado, quando houver) em **Origens JavaScript autorizadas**.
4. Cole o Client ID em **Ajustes → Google Agenda** no app, ou crie um arquivo `.env.local` com `VITE_GOOGLE_CLIENT_ID=...`.

## Entender e evoluir o código

- [docs/GUIA-DE-ESTUDO.md](docs/GUIA-DE-ESTUDO.md): como o app funciona por dentro e trilhas de estudo de cada linguagem e ferramenta, com exercícios no próprio código.
- [docs/ROADMAP.md](docs/ROADMAP.md): fases até a publicação, o que ainda não foi testado de verdade e as dívidas técnicas.
- [docs/ACESSIBILIDADE.md](docs/ACESSIBILIDADE.md): o que o app oferece para quem não vê, não ouve, não fala ou tem dificuldade de movimento, como verificar e as regras para código novo.

## Publicar

O passo a passo para colocar nas lojas (servidor, chaves de assinatura, versões, exigências do Google Play, Microsoft Store e Apple) está em [PRODUCAO.md](PRODUCAO.md).

## Rodar

```bash
npm install
npm run dev
```

Para publicar em um subcaminho (ex.: GitHub Pages em `/MeUsMe/`), gere o build com `BASE_PATH=/MeUsMe/ npm run build`.
