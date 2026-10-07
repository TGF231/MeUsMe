# Roadmap do MeUsMe até a produção

Do app que funciona para você até um app que outras pessoas podem baixar numa loja. Cada fase tem uma **linha de chegada** verificável, como no próprio MeUsMe, e indica quais trilhas do [guia de estudo](GUIA-DE-ESTUDO.md) você precisa ter feito antes.

Sugestão: crie no MeUsMe um projeto para cada fase, com a linha de chegada abaixo. O app foi feito para isso.

---

## Onde estamos (retrato honesto)

**Funciona e tem teste automático (38 testes):** escolha do próximo passo, mesclagem da sincronização, leitor de notificações de banco, cálculo das cores do tema.

**Funciona e foi testado à mão:** todas as telas na web; app Android no emulador (captura de notificação, lembrete com app em segundo plano, tema); app Windows (atalho global, bandeja, tempo por programa).

**Nunca foi testado com o serviço real:**

| Item | Por quê | Risco |
|---|---|---|
| Sincronização com Supabase | servidor ainda não existe | alto: é onde mora o risco de perder dados |
| Open Finance (Pluggy) | só com respostas simuladas | médio |
| Google Agenda | sem Client ID | médio; no Windows o login pode nem funcionar |
| Notificações reais dos 5 bancos | textos de exemplo, não reais | médio: o que não for entendido vai para a Caixa |
| Login por código | só com servidor simulado | médio |
| Barra de título do Windows acompanhando o tema | não foi aberto depois da mudança | baixo |

**Dívidas técnicas conhecidas:**

1. **localStorage tem limite de ~5 MB** e é síncrono. Com anos de lançamentos e sessões, pode encher. Plano: migrar para IndexedDB antes de ter usuários com muito histórico.
2. **Conflito de sincronização é por registro inteiro.** Se o mesmo passo for editado em dois aparelhos offline, vence a última edição inteira; não há mescla campo a campo.
3. **Os testes cobrem só funções puras.** Não há testes de tela (componentes) nem de ponta a ponta.
4. **Erros em produção não chegam até você.** Não há relatório de erros.
5. **Biblioteca do Supabase no pacote inicial:** ela entra mesmo para quem não sincroniza (~50 KB a mais). Dá para carregar só quando preciso.
6. **Fuso horário:** datas usam o fuso do aparelho. Viajar ou ter aparelhos em fusos diferentes pode deslocar um dia no histórico.
7. **A captura depende do texto de cada banco:** se um banco mudar o formato da notificação, o gasto deixa de ser reconhecido (vai para a Caixa) até o leitor ser ajustado.

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

- Repositório privado no GitHub, com o histórico atual.
- **Integração contínua** (GitHub Actions): a cada envio, roda `npm test`, `npm run lint` e `npm run build`. Você nunca mais publica algo que não compila.
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
- **Relatório de erros** (ex.: Sentry, plano gratuito), sem enviar conteúdo pessoal, só o erro.
- **Testes de tela** com Vitest + Testing Library para os fluxos centrais (concluir passo, registrar gasto, capturar), e **testes de ponta a ponta** com Playwright para o primeiro uso e a sincronização.
- Teste de estresse da sincronização: dois aparelhos offline editando, depois sincronizando.
- Restaurar um backup exportado num aparelho limpo (teste de recuperação).
- Carregar o Supabase só quando a sincronização for usada.
- Revisão de acessibilidade (leitor de tela, contraste, tamanho de toque).

**Linha de chegada:** a integração contínua roda testes de tela e de ponta a ponta, e um erro forçado em produção aparece no seu painel em minutos.

### Fase 3: Produto para outras pessoas

- **Primeiro uso guiado:** 3 telas curtas (Agora, Caixa, Linha de chegada) e um projeto de exemplo que dá para apagar.
- **Decisão sobre Open Finance:** plano comercial da Pluggy (servidor próprio para o segredo, Edge Function) **ou** ficar só com notificações de banco + importação de extrato. A segunda opção é bem mais barata.
- **Decisão sobre Google Agenda:** passar pela verificação do Google **ou** trocar por assinatura do "endereço secreto iCal" da agenda. A pessoa cola um link, o app só lê e não precisa de verificação; criar eventos no Google deixa de existir.
- Textos de ajuda onde as pessoas travarem (anotados na fase 1).

**Linha de chegada:** alguém que nunca viu o app instala e conclui o primeiro passo sozinho, sem você explicar nada.

### Fase 4: Jurídico e presença

- Domínio próprio e um site simples com o app web, a política de privacidade, os termos de uso e a página "como apagar sua conta" (exigida pelo Google Play).
- Política de privacidade cobrindo LGPD: que dados, onde ficam (aparelho e Supabase), por quanto tempo, como exportar (o backup já existe) e como apagar (já existe).
- E-mail de suporte.
- Link para a política dentro do app (Ajustes).

**Linha de chegada:** os três links (política, termos, exclusão de conta) estão públicos e acessíveis de dentro do app.

### Fase 5: Android na Play Store

- Chave de assinatura e Play App Signing ([PRODUCAO.md](../PRODUCAO.md#3-android-google-play)).
- Conta no Play Console; teste fechado com **12 testadores por 14 dias**.
- Formulário de segurança dos dados; declaração da leitura de notificações e de recursos financeiros.
- Ficha da loja: textos, capturas de tela, ícone.

**Linha de chegada:** o MeUsMe aparece na busca da Play Store.

### Fase 6: Windows

- Decidir: **Microsoft Store via MSIX** (assinatura grátis pela loja, exige converter o instalador) ou **instalador assinado** (certificado de ~US$ 150–300/ano) para download direto.
- Atualização automática pelo atualizador do Tauri (chave própria de atualização).

**Linha de chegada:** instalar num PC limpo sem o aviso "O Windows protegeu o computador", e o app se atualizar sozinho para a versão seguinte.

### Fase 7: Operação

- Rotina de versão: `npm run versao` → testes → builds → checklist manual curto → publicar → anotar o que mudou.
- Acompanhar o uso e os custos do Supabase; backup diário (no plano Pro há restauração para qualquer momento).
- Responder suporte; transformar cada relato em teste antes de consertar.

### Fase 8: iPhone (opcional)

Mac com Xcode, conta Apple Developer, `npx cap add ios`. Sem leitura de notificações de banco (o iOS não permite). Notificações agendadas funcionam com o mesmo plugin.

---

## Riscos principais

| Risco | Efeito | Como reduzir |
|---|---|---|
| Bug na sincronização apaga dados | perda de confiança, irreversível | testes de mesclagem; backup exportável; restauração do Supabase; fase 1 longa |
| Google Play recusar a leitura de notificações | Android sem captura automática | explicação clara antes do pedido; o app funciona sem ela (CSV, manual) |
| Bancos mudam o texto das notificações | gastos vão para a Caixa em vez de registrar | casos de teste com textos reais; Caixa como rede de segurança |
| Custo do servidor cresce | conta mensal | localStorage/IndexedDB primeiro; sincronização só de mudanças; monitorar |
| Verificação do Google demora meses | Agenda indisponível para o público | alternativa iCal (só leitura) |
