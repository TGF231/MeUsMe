# MeUsMe em produção

Como publicar o app para outras pessoas: o que já está pronto no código, o que só você (dono do app) pode fazer, e o que ainda impede uma publicação aberta.

Princípio: **quem usa o app não configura nada**. Você mantém um servidor só; a pessoa instala, e, se quiser sincronizar, digita o e-mail e o código de 6 dígitos que chega.

---

## 1. Servidor (uma vez)

1. Crie um projeto no [Supabase](https://supabase.com) (região São Paulo).
2. **SQL Editor** → cole e rode [`supabase/esquema.sql`](supabase/esquema.sql). Cria a tabela de sincronização, a segurança por usuário e a função "apagar minha conta".
3. **Authentication → Email Templates → Magic Link**: troque o texto para mostrar o código, por exemplo:
   `Seu código do MeUsMe é {{ .Token }}. Ele vale por 1 hora.`
4. **Authentication → SMTP Settings**: configure um provedor de e-mail (ex.: [Resend](https://resend.com), tem plano grátis). **Obrigatório**: sem isso o Supabase só envia e-mail para membros do seu projeto, e ninguém mais consegue entrar.
5. **Project Settings → API**: copie a *Project URL* e a chave *anon/publishable*.
6. Na pasta do projeto, copie `.env.example` para `.env.production.local` e preencha. Esse arquivo fica fora do git.

> O plano gratuito do Supabase pausa o projeto após 7 dias sem uso e tem limites. Com pessoas usando de verdade, considere o plano Pro.

## 2. Versão e release

Um comando muda a versão em tudo (web, Android e Windows leem do `package.json`):

```bash
npm run versao -- patch
```

Use `minor`/`major` ou um número (`1.2.0`). No Android, a versão 1.2.3 vira o versionCode 10203, que sempre cresce, como a Play Store exige.

Antes de publicar, escreva no topo de `src/novidades.ts` o que muda para quem usa, em poucas linhas: o app mostra a tela "O que mudou" uma vez, ao abrir depois de atualizar. A entrada da 0.6.0 já está escrita.

### Publicar (GitHub Actions)

Há dois fluxos em [`.github/workflows/`](.github/workflows/):

- **CI** ([`ci.yml`](.github/workflows/ci.yml)): a cada envio para a `master`, roda lint, testes e o build web. Um ✗ vermelho no commit, no GitHub, quer dizer que algo quebrou.
- **Release** ([`release.yml`](.github/workflows/release.yml)): quando chega uma tag `vX.Y.Z`, confere se ela bate com o `package.json`, gera o instalador do Windows e o APK/AAB do Android e publica tudo em **Releases**, com as notas montadas a partir dos commits.

```bash
npm run versao -- patch
git commit -am "Versão 0.1.1"
git tag v0.1.1
git push origin master v0.1.1
```

- **Configuração do build**: as mesmas variáveis do `.env.example` ficam em *Settings → Secrets and variables → Actions → Variables* (ou `gh variable set VITE_SUPABASE_URL --body ...`). Sem elas, o app sai sem servidor embutido.
- **Refazer os arquivos** de uma tag que já existe: *Actions → Release → Run workflow* e digite a tag.
- **Minutos**: repositório privado no plano gratuito tem 2.000 minutos por mês, e o Windows conta em dobro. Uma release gasta cerca de 40.

## 3. Android (Google Play)

### Chave de assinatura (uma vez, e guarde muito bem)

```bash
npm run android:chave
```

Cria `android/meusme-upload.jks` com uma senha aleatória, grava `android/keystore.properties` (os dois ficam fora do git) e envia a chave para os segredos do repositório, onde o fluxo de release a usa. Sem esses segredos, a release sai sem o Android.

Faça backup do `.jks` e do `keystore.properties` fora do computador (um gerenciador de senhas serve): o celular só aceita uma versão nova assinada com a mesma chave. Ative o **Play App Signing** no Play Console: o Google guarda a chave final do app, e a sua vira só "chave de envio". Se ela se perder, dá para trocar.

### Gerar

```bash
npm run android:release
```

Gera `android/app/build/outputs/bundle/release/app-release.aab`, o arquivo que vai para a Play Store.

### Play Console

- Conta de desenvolvedor: US$ 25, pagamento único.
- **Conta pessoal criada depois de nov/2023: teste fechado com 12 testadores por 14 dias seguidos** antes de liberar a produção.
- Formulário **Segurança dos dados**: o app guarda tarefas, diário, finanças e agenda; com a sincronização ligada, envia para o servidor, criptografado em trânsito.
- **Exclusão de conta**: o app já tem "Apagar minha conta". A Play também pede um **link na web** explicando como apagar: falta essa página.
- **Política de privacidade**: falta escrever e publicar (ver seção 7).
- **Leitura de notificações**: declare o uso e explique na listagem. O app mostra a explicação antes de pedir o acesso; a revisão do Google pode pedir mais detalhes.
- Declaração de **recursos financeiros**: o app mostra saldos e gastos.
- **Compras dentro do app** (ver o [Modelo de preço](docs/ROADMAP.md#modelo-de-preço)): o app é publicado como gratuito (um app gratuito não pode virar pago depois; os pacotes e a assinatura vêm pela cobrança da Play, com taxa de 15%). Precisa de **perfil de pagamentos** no Play Console; como pessoa física, a renda entra no carnê-leão. Cadastre os pacotes como produtos de compra única e a sincronização como assinatura, com preços próprios em reais.

## 4. Windows

```bash
npm run windows:release
```

Gera o instalador em `src-tauri/target/release/bundle/nsis/`. Sem assinatura digital, o Windows mostra "O Windows protegeu o computador".

- **Microsoft Store**: a conta individual é gratuita. Para enviar o instalador (EXE), ele precisa ser assinado com certificado reconhecido pela Microsoft. Pessoa física no Brasil: certificado OV (DigiCert, Sectigo…), cerca de US$ 150–300 por ano. Alternativa sem certificado: empacotar como MSIX, que a própria loja assina, mas o Tauri não gera MSIX direto e exige um passo de conversão.
- **Download direto (site)**: o mesmo certificado tira o aviso do Windows. Para o app se atualizar sozinho, falta ligar o atualizador do Tauri, que tem chave própria.

## 5. Web

`npm run build` gera a pasta `dist/`, um site estático. Publique em qualquer hospedagem (Cloudflare Pages, Netlify, GitHub Pages). Funciona como app instalável no Chrome e no Edge.

## 6. iPhone (ainda não feito)

Precisa de um Mac com Xcode e da conta Apple Developer (US$ 99 por ano). O Capacitor já suporta iOS (`npx cap add ios`).

**A leitura de notificações de bancos não existe no iPhone**: o iOS não deixa um app ler notificações de outro. No iPhone, os gastos chegariam só pelo Open Finance ou à mão.

## 7. O que ainda impede uma publicação aberta

1. **Open Finance (Pluggy)**: o Meu Pluggy é gratuito **só para uso pessoal** (um CPF). Para oferecer a outras pessoas é preciso o plano comercial da Pluggy (a partir de R$ 2.500/mês, segundo a própria Pluggy), e o segredo da API precisa morar num servidor (por exemplo, uma Edge Function do Supabase), nunca dentro do app. Por isso o Open Finance só aparece em builds com `VITE_OPEN_FINANCE=ligado`; sem a variável (o padrão), fica escondido.
2. **Google Agenda**: o acesso à agenda é um escopo "sensível" do Google. Para o público, o Google exige **verificação do app** (política de privacidade, domínio próprio, vídeo de demonstração). Até lá, só funciona para até 100 usuários de teste cadastrados por você.
3. **Política de privacidade e termos de uso** (LGPD e exigência das lojas): a política está escrita em `public/privacidade.html` (sai junto com o app web e tem a seção `#apagar-conta` que a Play pede) e tem link em Ajustes → Sobre. Os termos de uso estão em `public/termos.html`. Falta publicar os dois num endereço fixo e revisar o texto.

## Custos para começar

| Item | Custo |
|---|---|
| Supabase | grátis no começo; Pro US$ 25/mês com uso real |
| E-mail (Resend) | grátis até 3 mil e-mails/mês |
| Google Play | US$ 25, uma vez |
| Microsoft Store | grátis (conta); certificado US$ 150–300/ano para enviar o instalador |
| Apple | US$ 99/ano + um Mac |
| Conferência das compras | Edge Function própria ou RevenueCat (grátis até certa receita; confira o limite) |
| Pluggy comercial | a partir de R$ 2.500/mês, só se quiser Open Finance para outras pessoas |
