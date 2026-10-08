# Tarefas: fases 1 e 2

As fases 1 e 2 do [roadmap](ROADMAP.md) quebradas em tarefas pequenas. Você escreve o código; a revisão aponta o que mudar e por quê.

Cada tarefa tem:

- **Energia**, na escala do MeUsMe (leve, média, pesada), e quantos passos de ~25 minutos ela leva.
- **Chegada**: como saber, sem dúvida, que acabou.
- **Na revisão**: o que vai ser olhado, para você já saber o que é "bem feito" antes de começar.

Crie no MeUsMe os projetos "Fase 1" e "Fase 2", com a chegada de cada fase, e cadastre os passos das tarefas com a energia indicada.

## Como funciona a revisão

1. Uma branch por tarefa: `git switch -c tarefa/2-1-lint`.
2. Commits pequenos, com a mensagem dizendo o porquê.
3. `git push -u origin tarefa/2-1-lint` e `gh pr create --fill`. O CI roda sozinho no pull request.
4. Peça a revisão com o número do PR. O diff é lido, os problemas são apontados com a explicação, e o conserto fica com você.
5. Ajustou e o CI ficou verde: `gh pr merge --squash --delete-branch`.

As tarefas da fase 1 que são só configuração não precisam de PR.

## Comece por aqui

**1.1**: 15 minutos, energia leve. Depois siga a ordem. Na fase 2 a ordem importa: as redes de segurança (2.3 e 2.4) vêm antes da mudança arriscada (2.6).

---

## Fase 1: pôr no ar e usar

Quase sem código: contas, configuração e uso diário.

**Chegada da fase:** 30 dias usando no celular e no PC sem perder nenhum dado.

### 1.1 Chave do Android

Energia leve · 1 passo

1. Na pasta do projeto: `npm run android:chave`.
2. Copie `android/meusme-upload.jks` e `android/keystore.properties` para fora do computador (gerenciador de senhas, pendrive).
3. GitHub → Actions → Release → *Run workflow* → `v0.1.0`.

**Chegada:** a release v0.1.0 tem o `MeUsMe-0.1.0-android.apk`.

### 1.2 Servidor no Supabase

Energia média · 1 passo · [PRODUCAO.md, seção 1](../PRODUCAO.md#1-servidor-uma-vez), itens 1, 2 e 5.

**Chegada:** a tabela `registros` aparece no Table Editor sem o aviso de RLS desligado, e você anotou a Project URL e a chave anon.

### 1.3 E-mail com o código

Energia leve · 1 passo · PRODUCAO.md, seção 1, item 3.

Para uso pessoal, o e-mail padrão do Supabase basta: ele só envia para os membros do projeto (você), no máximo 2 por hora. O SMTP próprio (item 4) fica para quando outras pessoas usarem o app. Se o painel não deixar editar o modelo sem SMTP próprio, faça o item 4 agora; o remetente de teste do Resend também só envia para o seu e-mail, o que aqui basta.

**Chegada:** o e-mail que chega mostra um código de 6 dígitos (o teste é na 1.4).

### 1.4 App local falando com o servidor

Energia leve · 1 passo

1. Copie `.env.example` para `.env.production.local`, preencha a URL e a chave anon e apague a linha `VITE_OPEN_FINANCE` (é uso pessoal).
2. `npm run build` e `npm run preview`.
3. Ajustes → Sincronização → seu e-mail → código.

**Chegada:** Ajustes mostra você conectado, e o Table Editor mostra linhas em `registros` com o seu `usuario`.

### 1.5 Release com o servidor embutido

Energia leve · 1 passo

```bash
gh variable set VITE_SUPABASE_URL --body "https://SEU-PROJETO.supabase.co"
gh variable set VITE_SUPABASE_ANON_KEY --body "SUA-CHAVE-ANON"
npm run versao -- patch
git commit -am "Versão 0.1.1"
git tag v0.1.1
git push origin master v0.1.1
```

**Chegada:** a release v0.1.1 tem o `.exe` e o `.apk`.

### 1.6 Instalar nos dois aparelhos

Energia leve · 1 passo

1. Se você já tem dados no navegador: Ajustes → Backup → Exportar, e restaure no primeiro aparelho **antes** de entrar na sincronização.
2. Celular: baixe o APK pela página da release (logado no GitHub) e instale. Para liberar o acesso a notificações, veja "configurações restritas" no [README](../README.md#app-android).
3. PC: instale o `.exe`.
4. Entre com o mesmo e-mail nos dois.

**Chegada:** um passo criado no celular aparece no PC em menos de 10 segundos, e o contrário também.

### 1.7 Google Agenda

Energia média · 2 passos · [README, Google Agenda](../README.md#google-agenda).

Nas origens autorizadas, além de `http://localhost:5173`, ponha `http://localhost:4173` (o `npm run preview`) e `http://tauri.localhost` (o app Windows). Para o Client ID ir embutido nas próximas releases: `gh variable set VITE_GOOGLE_CLIENT_ID --body "..."`.

O login do Google dentro do app Windows nunca foi testado. Se não funcionar, anote o erro na Caixa: isso vira uma tarefa.

**Chegada:** os compromissos de amanhã aparecem na Agenda do PC e, pela sincronização, no celular.

### 1.8 Open Finance (Meu Pluggy)

Energia média · 1 passo · Finanças → Bancos → Open Finance, no PC.

A configuração da Pluggy fica só no aparelho onde você a digita (não sincroniza, por ser segredo). Os lançamentos chegam ao celular pela sincronização.

**Chegada:** o saldo de cada conta no app bate com o do banco.

### 1.9 Notificações reais viram testes

Contínua · energia leve · 1 passo por notificação

Quando um gasto do banco cair na Caixa em vez de virar lançamento:

1. Copie o texto da notificação, trocando nomes e valores que você não queira no repositório.
2. Acrescente o caso em [testes/bancos.test.ts](../testes/bancos.test.ts) e veja o teste **falhar**.
3. Ajuste `lerNotificacao` em [src/nativo/bancos.ts](../src/nativo/bancos.ts) até ele passar, sem quebrar os outros.

**Chegada:** cada notificação real que falhou virou um teste que passa.

### 1.10 Diário de bordo

Durante os 30 dias, todo problema, estranheza ou ideia vai para a Caixa do próprio MeUsMe, com o aparelho e o horário. É daí que saem as tarefas da fase 3.

---

## Fase 2: robustez

Código de verdade. Cada tarefa indica a trilha do [guia de estudo](GUIA-DE-ESTUDO.md) que ela pressupõe.

**Chegada da fase:** o CI roda testes de tela e de ponta a ponta, e um erro forçado no app instalado aparece no seu painel em minutos.

### 2.1 Lint sem avisos (aquecimento)

Trilha 4 · energia média · 2 passos

`npm run lint` mostra 10 avisos:

- 8 de *impure function during render*, em Agenda, Financas e Historico: a tela lê `Date.now()` ou `new Date()` enquanto é desenhada. O React pode desenhar a mesma tela várias vezes, em momentos que você não controla; "agora" tem que vir do estado.
- 2 de *Fast refresh*, em CheckInForm e SeletorEnergia: o arquivo exporta um componente e outra coisa junto.

Pista: um hook `useAgora()` com `useState`, `useEffect` e `setInterval`, e a limpeza no retorno do efeito.

**Chegada:** `npm run lint` sem avisos, e as três telas iguais ao que eram.

**Na revisão:** o intervalo é limpo ao sair da tela; nenhum componente chama `Date.now()` no corpo; a frequência do relógio combina com a tela (a Agenda não precisa de segundos).

### 2.2 Supabase só para quem sincroniza

Trilha 6 · energia média · 2 passos

[src/sync/remoto.ts](../src/sync/remoto.ts) importa `@supabase/supabase-js` na primeira linha, e a biblioteca entra no pacote inicial de todo mundo, inclusive de quem nunca vai sincronizar.

Pista: `await import('@supabase/supabase-js')` faz o Vite separar a biblioteca num arquivo próprio, baixado só quando essa linha roda. Armadilha: para saber se existe sessão não é preciso carregar a biblioteca, porque ela fica no localStorage, na chave `meusme-sync-sessao`.

**Chegada:** o `index-*.js` listado pelo `npm run build` encolhe (anote o antes e o depois); sem login, a aba Rede (F12) não baixa o arquivo do Supabase; com login, a sincronização funciona como antes.

**Na revisão:** a biblioteca é carregada num lugar só; uma falha de rede ao baixar o arquivo não trava o app.

### 2.3 Teste de estresse da sincronização

Trilha 8 · energia pesada · 3 passos · faça antes o exercício da trilha 8 (três aparelhos).

Em [testes/sincronizacao.test.ts](../testes/sincronizacao.test.ts), as classes `Servidor` e `Aparelho` já simulam tudo em memória. Falta o caos:

1. Um gerador de números aleatórios **com semente** (pesquise "mulberry32"): a mesma semente repete a mesma sequência, e uma falha pode ser reproduzida.
2. Três aparelhos e 300 operações sorteadas (criar, editar, apagar, sincronizar), com poucos ids, para forçar conflitos. No fim, todos sincronizam mais duas vezes.
3. Verificações: os três aparelhos terminam com os mesmos dados, e um id que ninguém apagou existe em todos. Rode 200 sementes e ponha a semente na mensagem de erro.

**Chegada:** passa com 200 sementes; quando você quebra uma regra de [planejar.ts](../src/sync/planejar.ts) de propósito (por exemplo, ignorar os apagados que chegam do servidor), falha e diz a semente. Se falhar sem você ter quebrado nada, você achou um bug de verdade: traga a semente.

**Na revisão:** por que "mais duas vezes" no fim, e não uma; o teste todo roda em menos de 2 segundos.

### 2.4 Backup confiável

Trilha 5 · energia média · 2 passos

Exportar e restaurar estão dentro de [Ajustes.tsx](../src/screens/Ajustes.tsx) (a função `Backup`), sem teste.

1. Leve a lógica para `src/backup.ts`, em funções puras: uma monta o arquivo, outra lê e valida. Testes: exportar e restaurar dá o mesmo resultado; arquivo corrompido, de outro app ou de uma versão futura dá erro claro, e nada é gravado.
2. Decida o que restaurar faz com a sincronização ligada, e deixe a decisão escrita. Hoje a restauração troca os dados locais; a sincronização entende a diferença como edições e exclusões suas e manda para todos os aparelhos. É isso que você quer? Aproveite e corrija o texto do cartão, que ainda diz "Seus dados ficam só neste aparelho".

**Chegada:** os testes passam; um arquivo corrompido não altera nada; numa janela anônima (aparelho limpo), restaurar um backup real mostra as mesmas contagens de passos, lançamentos e eventos.

**Na revisão:** toda a validação acontece antes da primeira gravação.

### 2.5 Registro de erros

Trilha 7 · energia pesada · 3 passos

No lugar de um serviço de fora (como o Sentry), uma tabela no seu próprio Supabase: é banco de dados, que você já domina, e nada sai para terceiros.

1. **Capturar:** os eventos `error` e `unhandledrejection` da `window`, mais um *error boundary* do React em volta do app, que mostra "algo deu errado, seus dados estão salvos" e um botão para recarregar. Guarde os 20 últimos no aparelho.
2. **Enviar:** tabela `erros` (quando, versão, plataforma, mensagem, pilha) em [supabase/esquema.sql](../supabase/esquema.sql), com RLS que só deixa inserir as próprias linhas. Envie quando houver login; sem rede, mais tarde.
3. **Ver:** Ajustes → "Erros recentes", com os do aparelho (útil no celular, onde não há F12).

**Chegada:** um erro forçado no app instalado aparece na tabela `erros` em poucos minutos.

**Na revisão:** nenhum conteúdo seu (passos, lançamentos) vai junto; um erro dentro do próprio envio não vira um laço infinito; a mensagem tem tamanho máximo.

### 2.6 IndexedDB

Trilha 5 · energia pesada · 4 passos · **só depois de 2.3 e 2.4**, que são a rede de segurança desta mudança.

O localStorage tem ~5 MB e trava a tela enquanto grava. O IndexedDB é um banco de verdade dentro do navegador, sem esse limite na prática.

1. `src/armazenamento.ts`: `getItem`, `setItem` e `removeItem` assíncronos sobre o IndexedDB (um banco `meusme`, um *object store* de chave → texto). Pista: cada pedido do IndexedDB vira uma `Promise`.
2. Migração: se a chave não existe no IndexedDB mas existe no localStorage, copie e use. Mantenha a cópia antiga por uma versão, como rede de segurança.
3. Ligue nas quatro lojas com o `createJSONStorage` do zustand.
4. Peça `navigator.storage.persist()`, para o navegador não apagar os dados quando faltar espaço.

Três armadilhas, todas no código de hoje:

- **A grave:** com armazenamento assíncrono, as lojas começam com os valores de fábrica e só depois recebem os seus dados. Se a sincronização rodar nesse intervalo, entende que você apagou tudo e **apaga nos outros aparelhos**. O app e a sincronização só podem começar depois que as quatro lojas terminarem de carregar (`persist.hasHydrated()`).
- A janela de captura do Windows avisa a principal pelo evento `storage` ([main.tsx](../src/main.tsx)), que o IndexedDB não dispara. Troque por `BroadcastChannel`.
- O backup (2.4) lê direto do localStorage.

**Chegada:** F12 → Application → IndexedDB mostra os dados; com um backup exportado antes, atualizar o app no celular e no PC não perde nada (compare as contagens); com um atraso de 2 segundos posto de propósito no `getItem`, nada some no outro aparelho.

**Na revisão:** a ordem de inicialização; o que acontece quando o IndexedDB falha (janela anônima de alguns navegadores).

### 2.7 Testes de tela

Trilha 12 · energia média · 3 passos

1. Instale Vitest, jsdom e Testing Library; crie o script `npm run test:telas` e ponha no [ci.yml](../.github/workflows/ci.yml).
2. O primeiro é a prova de domínio da trilha 12: `PassoForm` mostra o aviso de "ideia vaga".
3. Depois, os fluxos centrais: concluir um passo na tela Agora, registrar "35 almoço" e capturar na Caixa.

**Chegada:** 4 testes de tela no CI, e um PR que muda o texto do aviso fica vermelho.

**Na revisão:** os testes procuram o que a pessoa vê (texto, papel do botão), não classes CSS.

### 2.8 Ponta a ponta (Playwright)

Trilha 12 · energia pesada · 3 passos

O primeiro uso num navegador limpo, e a sincronização com dois navegadores ao mesmo tempo. Nunca contra o seu servidor de verdade: use o Supabase local (`npx supabase start`, precisa do Docker), que guarda os e-mails no Mailpit, de onde o teste lê o código de login.

**Chegada:** `npx playwright test` passa, e o teste de sincronização vê um passo criado no navegador A aparecer no B.

### 2.9 Acessibilidade

Trilha 3 · energia média · 2 passos

Lighthouse (F12 → Lighthouse → Accessibility) em Agora, Caixa, Finanças e Agenda, no tamanho de celular.

**Chegada:** nota 95 ou mais em cada tela; todo botão só com ícone tem nome para o leitor de tela; alvos de toque com pelo menos 44 px.
