# Guia de estudo: dominar o MeUsMe por dentro

Objetivo: ao final, **cada linha do MeUsMe é sua**. Você sabe por que ela existe, consegue mudá-la sem medo e consegue refazê-la sem ajuda.

Ponto de partida: lógica de programação forte, bancos de dados locais, C++ (sem bibliotecas) e Python básico. O guia usa essas pontes o tempo todo. O app tem ~8.500 linhas, e cada trilha diz exatamente quais arquivos ler.

---

## Como estudar (e usar IA sem perder o controle)

1. **Ler → explicar → alterar → quebrar → consertar.** Para cada arquivo: leia, explique em voz alta o que ele faz, mude algo pequeno, quebre de propósito, veja o erro e conserte.
2. **IA explica, você escreve.** Peça explicações ("por que esse `useEffect` tem um retorno?"), não código. Quando pedir código, digite à mão em vez de colar.
3. **Prova de domínio, sem IA.** Cada trilha termina com uma tarefa feita só com a documentação oficial. Se não conseguir, a trilha não acabou, e tudo bem.
4. **Testes como rede.** Antes de mexer em lógica, rode `npm test`; depois de mexer, rode de novo. Se quebrou, você aprendeu algo.
5. **Um projeto por trilha no próprio MeUsMe**, com a linha de chegada = a prova de domínio. Passos de 25 minutos.
6. **Diário de bordo:** uma frase por dia no check-in do Histórico sobre o que entendeu. Releia toda semana.

O que **pode ignorar** por enquanto: o funcionamento interno do Workbox (service worker), do Gradle e do empacotador NSIS, e as otimizações do compilador Rust. São caixas-pretas confiáveis; você só precisa saber configurá-las.

---

## 0. O mapa: como o MeUsMe funciona

Leia isto antes de qualquer linguagem. É a planta da casa.

### Camadas

```
┌──────────────────────────────────────────────────────────────────────┐
│ TELAS (React)            src/screens/*.tsx, src/components/*.tsx     │
│   mostram o estado e chamam ações                                    │
├──────────────────────────────────────────────────────────────────────┤
│ LÓGICA PURA              escolher.ts · util.ts · csv.ts ·            │
│   (sem tela, testável)    nativo/bancos.ts · tema/cores.ts ·         │
│                           sync/planejar.ts                           │
├──────────────────────────────────────────────────────────────────────┤
│ ESTADO (zustand)         store.ts · stores/financas.ts ·             │
│   o "banco em memória"    stores/agenda.ts · stores/config.ts        │
├──────────────────────────────────────────────────────────────────────┤
│ PERSISTÊNCIA LOCAL       localStorage (chaves "meusme", "meusme-…")  │
├──────────────────────────────────────────────────────────────────────┤
│ SINCRONIZAÇÃO            sync/colecoes.ts → sync/motor.ts →          │
│                           sync/remoto.ts → Supabase (PostgreSQL)     │
├──────────────────────────────────────────────────────────────────────┤
│ INTEGRAÇÕES              google.ts (Agenda) · pluggy.ts (Open Fin.)  │
├──────────────────────────────────────────────────────────────────────┤
│ PONTES NATIVAS           Android: Capacitor + Java (android/…)       │
│                          Windows: Tauri + Rust (src-tauri/…)         │
└──────────────────────────────────────────────────────────────────────┘
```

### A vida de um clique em "Já fiz"

1. [Agora.tsx](../src/screens/Agora.tsx): o botão chama `concluir(passoId)`.
2. Isso chama `concluirPasso` em [store.ts](../src/store.ts), que cria uma **cópia nova** da lista de passos com `feitoEm` preenchido (nada é alterado no lugar).
3. O zustand avisa todo mundo que assina o estado:
   - o React redesenha as telas que usam esses dados;
   - o middleware `persist` grava o estado inteiro como JSON no localStorage, na chave `meusme`;
   - [sync/colecoes.ts](../src/sync/colecoes.ts) (`aoMudarLocalmente`) avisa o motor de sincronização;
   - no Android, [nativo/lembretesNativos.ts](../src/nativo/lembretesNativos.ts) reagenda os avisos.
4. [sync/motor.ts](../src/sync/motor.ts) espera 2 s de calma e roda uma rodada:
   - baixa o que mudou no servidor;
   - chama `planejar` ([sync/planejar.ts](../src/sync/planejar.ts)) para decidir o que aplicar aqui e o que enviar;
   - envia para o Supabase ([sync/remoto.ts](../src/sync/remoto.ts)).
5. No servidor, o gatilho de [supabase/esquema.sql](../supabase/esquema.sql) carimba a hora, e a política de segurança garante que a linha é sua.
6. O Supabase Realtime avisa o outro aparelho, que roda a própria rodada, aplica a mudança com `aplicarRemotas` e redesenha a tela.

Se você conseguir contar essa história de cabeça, apontando os arquivos, já entende 70% do app.

### Mapa de pastas

| Pasta / arquivo | O que é | Linguagem |
|---|---|---|
| `src/main.tsx`, `src/App.tsx` | ponto de entrada, navegação, ganchos globais | TypeScript + React |
| `src/screens/` | as 7 telas | TSX |
| `src/components/` | peças reutilizáveis (formulários, cartões) | TSX |
| `src/store.ts`, `src/stores/` | estado e persistência | TypeScript |
| `src/types.ts` | o "esquema" dos dados | TypeScript |
| `src/sync/` | sincronização | TypeScript |
| `src/nativo/`, `src/tema/` | pontes com Android/Windows; tema | TypeScript |
| `src/index.css` | todo o visual | CSS |
| `supabase/esquema.sql` | banco do servidor | SQL (PostgreSQL) |
| `android/app/src/main/java/app/meusme/` | captura de notificações | Java |
| `android/app/src/main/AndroidManifest.xml`, `build.gradle` | configuração e build Android | XML, Groovy |
| `src-tauri/src/` | bandeja, atalho, tempo por programa | Rust |
| `src-tauri/tauri.conf.json`, `capabilities/` | configuração Windows | JSON |
| `testes/` | testes automáticos | TypeScript |
| `scripts/` | versão e build | JavaScript (Node) |

---

## Trilhas

A ordem importa: cada trilha usa a anterior. Tempo estimado com ~1 h por dia.

### Trilha 1: Ferramentas de trabalho (1 semana)

**Por que aqui:** sem dominar terminal, git e npm, você depende de alguém para rodar o app.

- **Conceitos:** terminal (cd, ls, caminhos), variáveis de ambiente (`PATH`, `JAVA_HOME`), **git** (commit, branch, diff, log, voltar atrás), **Node e npm** (`package.json`, `node_modules`, `npm install`, `npm run`), VS Code com o depurador.
- **Ponte com o que você sabe:** `npm run build` é o seu `make`; o `package.json` lista as dependências como um `CMakeLists` lista bibliotecas.
- **Leia no MeUsMe:** [package.json](../package.json) (seção `scripts`), [.gitignore](../.gitignore), `git log --oneline`.
- **Exercício:** crie uma branch, mude um texto na tela Agora, faça commit, volte para a branch principal e veja o texto antigo.
- **Prova de domínio:** sem ajuda, clonar o repositório numa pasta nova, instalar, rodar `npm test` e `npm run dev`, e explicar o que cada script do `package.json` faz.
- **Referências:** [Pro Git (livro grátis, em português)](https://git-scm.com/book/pt-br/v2), [documentação do npm](https://docs.npmjs.com/).

### Trilha 2: JavaScript → TypeScript (3 semanas)

**Por que aqui:** 65% do app é TypeScript. É a linguagem que você mais vai ler.

- **Pontes com C++:**
  - `interface` ≈ `struct`. Mas a tipagem é **estrutural**: dois tipos com os mesmos campos são compatíveis, mesmo com nomes diferentes.
  - Generics (`Map<string, number>`) ≈ templates.
  - Objetos e arrays são passados **por referência**, como ponteiros: por isso o app cria cópias (`{ ...p, feitoEm }`) em vez de alterar.
  - Não há gerenciamento de memória (há coletor de lixo) e não há threads: há **um** laço de eventos.
- **Conceitos:** `let`/`const`, funções e arrow functions, **closures**, desestruturação e espalhamento (`...`), `map`/`filter`/`reduce`, módulos (`import`/`export`), **Promises e async/await** (como o JS espera rede sem travar), o **laço de eventos** (por que `setTimeout(f, 0)` não roda na hora), tipos união (`'claro' | 'escuro'`), `type` vs `interface`, `as const`, tipos opcionais (`?`) e o operador `??`.
- **Leia no MeUsMe (nesta ordem, só lógica pura):**
  1. [util.ts](../src/util.ts)
  2. [escolher.ts](../src/escolher.ts)
  3. [csv.ts](../src/csv.ts)
  4. [tema/cores.ts](../src/tema/cores.ts)
  5. [nativo/bancos.ts](../src/nativo/bancos.ts) + [testes/bancos.test.ts](../testes/bancos.test.ts)
  6. [types.ts](../src/types.ts)
- **Exercício:** acrescente um caso de teste em `bancos.test.ts` com uma notificação inventada que o leitor ainda não entende; faça o teste falhar; ajuste `lerNotificacao` até passar.
- **Prova de domínio:** reescreva do zero, num arquivo novo, `lerValor` (de `util.ts`) e faça os mesmos testes passarem. Depois explique por que `"1.234"` vira 1234 e `"1,234"` vira 1,23.
- **Referências:** [JavaScript na MDN](https://developer.mozilla.org/pt-BR/docs/Web/JavaScript/Guide), [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html), [TypeScript para programadores C#/Java/C++](https://www.typescriptlang.org/docs/handbook/typescript-in-5-minutes-oop.html).

### Trilha 3: HTML e CSS (2 semanas)

**Por que aqui:** todo o visual (os três layouts, os dois temas, a sua paleta) está em um arquivo CSS.

- **Conceitos:**
  - modelo de caixa, flexbox, grid;
  - **variáveis CSS** (são os tokens do tema);
  - **media queries** (celular em pé, celular deitado, PC);
  - **cascata e especificidade** (por que `.abas .nav-capturar` vence `.abas button`);
  - `color-mix`, unidades (`px`, `rem`, `dvh`), `env(safe-area-inset-*)` (barra de status do Android).
- **Leia no MeUsMe:**
  - [index.css](../src/index.css): comece pelo bloco `:root` (tokens), depois "Layouts", depois "Espaço para duas colunas";
  - em seguida, abra o app no navegador com o inspetor (F12) e encontre cada regra aplicada.
- **Exercício:** crie um token novo (ex.: `--raio-cartao`), use-o nos cartões e veja nos dois temas e nos três layouts.
- **Prova de domínio:** explique, sem consultar, por que o botão "Capturar" vazou para a barra de baixo do celular (histórico do git: commit do layout responsivo) e por que a correção funciona.
- **Referências:** [CSS na MDN](https://developer.mozilla.org/pt-BR/docs/Web/CSS), [Flexbox](https://css-tricks.com/snippets/css/a-guide-to-flexbox/), [Grid](https://css-tricks.com/snippets/css/complete-guide-grid/), [especificidade](https://developer.mozilla.org/pt-BR/docs/Web/CSS/Specificity).

### Trilha 4: React (3 semanas)

**Por que aqui:** todas as telas.

- **Ideia central:** a tela é uma **função do estado**. Você não altera a tela; altera o estado, e o React redesenha.
- **Conceitos:**
  - componente, JSX, props;
  - `useState`, e por que o componente roda de novo a cada mudança;
  - `useEffect` e a **limpeza** (o `return` que para intervalos e ouvintes);
  - `useMemo`, `useRef`, listas com `key`, formulários controlados (`value` + `onChange`);
  - regras dos hooks;
  - **StrictMode**, que roda efeitos duas vezes em desenvolvimento. Foi por isso que a sincronização do Pluggy rodou duas vezes nos testes.
- **Leia no MeUsMe (do menor ao maior):**
  1. [SeletorEnergia.tsx](../src/components/SeletorEnergia.tsx)
  2. [PassoForm.tsx](../src/components/PassoForm.tsx)
  3. [TempoGasto.tsx](../src/components/TempoGasto.tsx)
  4. [screens/Projetos.tsx](../src/screens/Projetos.tsx)
  5. [screens/Agora.tsx](../src/screens/Agora.tsx)
  6. [App.tsx](../src/App.tsx)
- **Exercício:** botão "Adiar para amanhã" na tela Agora: some hoje e volta amanhã. Você vai precisar mexer no tipo `Passo`, na loja e na escolha do passo.
- **Prova de domínio:** sem IA, criar um componente novo (ex.: contador de passos feitos na semana no Histórico) com estado, efeito e limpeza corretos.
- **Referências:** [react.dev (documentação oficial, com tradução)](https://pt-br.react.dev/learn), especialmente "Thinking in React" e "You Might Not Need an Effect".

### Trilha 5: Estado e dados locais (2 semanas)

**Por que aqui:** é a sua área forte (bancos locais), só que em outro formato.

- **Pontes:**
  - cada loja zustand é um **banco em memória**;
  - [types.ts](../src/types.ts) é o **esquema**;
  - `persist` é a **serialização** para um armazenamento chave-valor (localStorage);
  - `version` + `migrate` são as **migrações** (veja a v2 em [stores/financas.ts](../src/stores/financas.ts)).
- **Conceitos:** atualização imutável, seletores (`useStore((s) => s.passos)`), por que o localStorage é síncrono e tem ~5 MB, quando migrar para **IndexedDB** (um banco de verdade no navegador), integridade sem chave estrangeira (o que acontece com um passo de um projeto apagado?).
- **Leia no MeUsMe:** [store.ts](../src/store.ts), [stores/financas.ts](../src/stores/financas.ts) (inclusive `reconciliar` e `migrate`), [stores/agenda.ts](../src/stores/agenda.ts), [stores/config.ts](../src/stores/config.ts).
- **Exercício:** abra o localStorage no inspetor do navegador, veja o JSON de cada chave, edite um valor à mão e recarregue.
- **Prova de domínio:** escreva a migração v3 de uma loja (ex.: renomear um campo) e prove, com dados antigos no localStorage, que nada se perde.
- **Referências:** [zustand](https://zustand.docs.pmnd.rs/), [persist](https://zustand.docs.pmnd.rs/integrations/persisting-store-data), [IndexedDB na MDN](https://developer.mozilla.org/pt-BR/docs/Web/API/IndexedDB_API).

### Trilha 6: Vite, build e PWA (1 semana)

- **Conceitos:**
  - servidor de desenvolvimento e recarga automática (HMR), e por que ele pode carregar duas cópias de um módulo (`?t=…`, vimos nos testes);
  - **modos e variáveis de ambiente** (`.env.production.local`, `import.meta.env`);
  - importação `?raw` (o script SQL vira texto no app);
  - o que sai em `dist/`;
  - **service worker** e manifest do PWA (app instalável e offline);
  - `tsconfig` e o linter (`oxlint`).
- **Leia no MeUsMe:** [vite.config.ts](../vite.config.ts), [main.tsx](../src/main.tsx), [tsconfig.app.json](../tsconfig.app.json), [.env.example](../.env.example).
- **Prova de domínio:** gerar uma build de produção com um servidor falso no `.env`, abrir o `dist/` com `npm run preview` e mostrar que o endereço está embutido.
- **Referências:** [Vite](https://vite.dev/guide/), [modos e env](https://vite.dev/guide/env-and-mode), [vite-plugin-pwa](https://vite-pwa-org.netlify.app/).

### Trilha 7: Banco no servidor: PostgreSQL + Supabase (2 semanas)

**Por que aqui:** sua base de bancos de dados vale muito aqui; o novo é a segurança por linha e o acesso pela internet.

- **Conceitos:**
  - SQL do PostgreSQL;
  - `jsonb`;
  - **gatilhos** (o carimbo de hora vem do servidor, não do aparelho);
  - **Row Level Security** (cada linha só é visível para o dono: `auth.uid() = usuario`);
  - funções `security definer` (apagar a conta) e por que elas são perigosas;
  - **PostgREST** (o Supabase vira cada tabela uma API);
  - **Auth** (código por e-mail, sessão e JWT, o "crachá" assinado);
  - **Realtime** (avisos de mudança);
  - por que a chave "anon" pode ser pública e a "service_role" nunca.
- **Leia no MeUsMe:** [supabase/esquema.sql](../supabase/esquema.sql) linha a linha; depois [sync/remoto.ts](../src/sync/remoto.ts).
- **Exercício:** num projeto Supabase **de teste**, crie dois usuários e prove pelo SQL Editor que um não vê as linhas do outro. Depois remova a política de propósito e veja o que acontece.
- **Prova de domínio:** escrever do zero a política de leitura e o gatilho de carimbo, e explicar o que aconteceria sem o `with check` da política de gravação.
- **Referências:** [Supabase: RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [Auth por e-mail/OTP](https://supabase.com/docs/guides/auth/auth-email-passwordless), [PostgreSQL: políticas](https://www.postgresql.org/docs/current/ddl-rowsecurity.html).

### Trilha 8: Sincronização offline-first (2 semanas)

**Por que aqui:** é a parte mais delicada do app; um erro aqui perde dados.

- **Conceitos:**
  - **mesclagem de três versões** (local, base e servidor), que é o que o git faz com arquivos;
  - "último a gravar vence" (LWW) e suas limitações;
  - **lápides** (apagado = registro marcado, não sumido);
  - relógio do servidor vs relógio do aparelho;
  - janela de segurança na leitura;
  - **idempotência** (aplicar duas vezes dá no mesmo);
  - JSON canônico e hash (por que `{a,b}` e `{b,a}` precisam ser iguais);
  - debounce (esperar 2 s de calma).
- **Leia no MeUsMe:** [sync/planejar.ts](../src/sync/planejar.ts) com [testes/sincronizacao.test.ts](../testes/sincronizacao.test.ts) lado a lado; depois [sync/colecoes.ts](../src/sync/colecoes.ts) e [sync/motor.ts](../src/sync/motor.ts).
- **Exercício:** escreva um teste com três aparelhos e edições cruzadas; descubra se a regra atual dá o resultado que você espera.
- **Prova de domínio:** explique cada regra do comentário no topo de `planejar.ts` com um exemplo próprio, e reescreva `planejar` do zero passando todos os testes.
- **Leitura para ir além:** [Local-first software (Kleppmann et al.)](https://www.inkandswitch.com/local-first/), que apresenta os CRDTs, o próximo nível para mesclar campo a campo.

### Trilha 9: Integrações: HTTP, CORS, OAuth e APIs (2 semanas)

- **Conceitos:**
  - HTTP (métodos, códigos de status, cabeçalhos, JSON);
  - `fetch`;
  - **CORS** (por que o navegador bloqueia algumas APIs, e por que a Pluggy funcionou direto);
  - **OAuth 2.0** (fluxo de token do Google, escopos, consentimento, verificação);
  - chave pública vs **segredo** (por que o segredo da Pluggy não pode ir para usuários);
  - limites de uso e paginação.
- **Leia no MeUsMe:** [google.ts](../src/google.ts), [pluggy.ts](../src/pluggy.ts), [notificacoes.ts](../src/notificacoes.ts).
- **Exercício:** na aba Rede (F12), acompanhe uma sincronização com o Google e identifique cada requisição, cabeçalho e resposta.
- **Prova de domínio:** chamar a API de agenda do Google com `curl`, usando um token copiado do app, e listar seus eventos de amanhã.
- **Referências:** [HTTP na MDN](https://developer.mozilla.org/pt-BR/docs/Web/HTTP), [CORS](https://developer.mozilla.org/pt-BR/docs/Web/HTTP/CORS), [OAuth 2.0 simplificado](https://www.oauth.com/), [Google Calendar API](https://developers.google.com/calendar/api/guides/overview), [Pluggy docs](https://docs.pluggy.ai/).

### Trilha 10: Android: Capacitor + Java (3 semanas)

- **Pontes com C++:** Java tem classes, herança e interfaces como você conhece, mas sem ponteiros nem `delete` (coletor de lixo). As lambdas (`() -> …`) parecem as do C++11.
- **Conceitos Android:**
  - Activity (tela) e **Service** (o `NotificationListenerService` roda sem tela);
  - Manifest e permissões;
  - SharedPreferences (chave-valor nativo);
  - alarmes e notificações;
  - "configurações restritas" em apps instalados por APK;
  - **Gradle** (build e assinatura).
- **Conceitos Capacitor:**
  - o app web roda num **WebView**;
  - um plugin nativo (`@CapacitorPlugin`) recebe chamadas do JavaScript (`registerPlugin`) e responde com `call.resolve`;
  - `notifyListeners` manda eventos de volta.
- **Ferramentas:** Android Studio, emulador, `adb`, `adb logcat` (o console do Android) e `chrome://inspect` (inspecionar o WebView do app pelo Chrome do PC).
- **Leia no MeUsMe:**
  1. [AndroidManifest.xml](../android/app/src/main/AndroidManifest.xml)
  2. [CapturaNotificacoesService.java](../android/app/src/main/java/app/meusme/CapturaNotificacoesService.java)
  3. [Capturas.java](../android/app/src/main/java/app/meusme/Capturas.java)
  4. [CapturaPlugin.java](../android/app/src/main/java/app/meusme/CapturaPlugin.java)
  5. [nativo/captura.ts](../src/nativo/captura.ts)
  6. [nativo/lembretesNativos.ts](../src/nativo/lembretesNativos.ts)
  7. [android/app/build.gradle](../android/app/build.gradle)
- **Exercício:** um método nativo novo, de ponta a ponta: por exemplo, `bancosInstalados()`, que diz quais dos 5 bancos estão instalados no celular, mostrado em Finanças → Bancos.
- **Prova de domínio:** desenhar no papel o caminho de uma notificação do Nubank até virar um lançamento, citando cada classe e função; depois rodar no emulador e confirmar com `logcat`.
- **Referências:** [Capacitor](https://capacitorjs.com/docs), [criar plugins](https://capacitorjs.com/docs/plugins/creating-plugins), [Android Developers](https://developer.android.com/guide), [NotificationListenerService](https://developer.android.com/reference/android/service/notification/NotificationListenerService), [Java para quem vem do C++](https://dev.java/learn/).

### Trilha 11: Windows: Tauri + Rust (3–4 semanas)

- **Pontes com C++** (o Rust vai parecer familiar e estranho ao mesmo tempo):
  - **posse e empréstimo** (ownership/borrowing): o compilador garante o que, em C++, você garante com disciplina (RAII, sem ponteiro solto);
  - `Result`/`Option` no lugar de exceções e de `nullptr`;
  - `trait` ≈ interface; `Cargo` ≈ CMake + gerenciador de pacotes;
  - `unsafe` + FFI para chamar a API Win32, como você faria em C++;
  - `Mutex` e threads (o medidor de tempo roda numa thread própria).
- **Conceitos Tauri:**
  - núcleo em Rust + WebView2 mostrando o app web;
  - **comandos** (`#[tauri::command]` chamados por `invoke` no JS) e **eventos** (`emit`);
  - plugins (atalho global, bandeja, inicialização com o Windows);
  - **capabilities** (o que cada janela pode chamar);
  - várias janelas (a da captura).
- **Leia no MeUsMe:** [src-tauri/src/lib.rs](../src-tauri/src/lib.rs), [src-tauri/src/uso.rs](../src-tauri/src/uso.rs), [tauri.conf.json](../src-tauri/tauri.conf.json), [capabilities/default.json](../src-tauri/capabilities/default.json), [nativo/desktop.ts](../src/nativo/desktop.ts), [components/JanelaCaptura.tsx](../src/components/JanelaCaptura.tsx).
- **Exercício:** um comando novo, de ponta a ponta. Por exemplo, um evento quando você fica ocioso por 2 minutos com o cronômetro ligado, e o app pergunta se quer pausar.
- **Prova de domínio:** explicar por que `uso.rs` usa `Mutex`, o que aconteceria sem ele, e por que a função `descricao` precisa de `unsafe`.
- **Referências:** [The Rust Book (gratuito)](https://doc.rust-lang.org/book/) (capítulos 1–10 e 16), [Rust para quem vem de C++](https://github.com/nrc/r4cppp), [Tauri v2](https://v2.tauri.app/start/), [crate windows](https://microsoft.github.io/windows-docs-rs/).

### Trilha 12: Qualidade, segurança e publicação (2 semanas)

- **Testes:** os testes atuais (`node:test`, só lógica pura) → testes de componentes (Vitest + Testing Library) → ponta a ponta (Playwright).
- **Depuração:** DevTools do navegador, React DevTools, `logcat`, `chrome://inspect`, DevTools do Tauri.
- **Segurança:**
  - onde ficam os dados (aparelho, servidor);
  - o que é segredo (chave da Pluggy, chave de assinatura) e o que é público (chave anon);
  - XSS (por que o React escapa texto);
  - RLS como última barreira.
- **LGPD:** quais dados, finalidade, exportar e apagar (as duas funções já existem).
- **Publicação:** assinatura (keystore, certificados), versões semânticas, exigências das lojas.
- **Leia no MeUsMe:** [testes/](../testes/), [scripts/](../scripts/), [PRODUCAO.md](../PRODUCAO.md), [ROADMAP.md](ROADMAP.md).
- **Prova de domínio:** escrever o primeiro teste de componente (ex.: `PassoForm` mostra o aviso de "ideia vaga") e ligar a integração contínua no GitHub para rodá-lo a cada envio.
- **Referências:** [Vitest](https://vitest.dev/), [Testing Library](https://testing-library.com/docs/react-testing-library/intro/), [Playwright](https://playwright.dev/), [OWASP Top 10](https://owasp.org/www-project-top-ten/), [LGPD (texto da lei)](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm).

---

## Calendário sugerido

| Mês | Trilhas | Fase do roadmap em paralelo |
|---|---|---|
| 1 | 1, 2 | 0. Controle |
| 2 | 3, 4 | 0. Controle |
| 3 | 5, 6, 7 | 1. Uso real pessoal (servidor no ar) |
| 4 | 8, 9 | 1 → 2. Robustez |
| 5 | 10 | 2 → 3. Produto |
| 6 | 11, 12 | 4 e 5 (Play Store) |
| 7+ | revisão e provas pendentes | 6 e 7 |

Você está pronto para lançar quando conseguir fazer **todas as provas de domínio sem ajuda**, e quando um bug relatado por alguém virar, nas suas mãos, um teste que falha e depois passa.
