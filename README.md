# MeUsMe

Uma coisa de cada vez. App pessoal para decidir o próximo passo, chegar ao fim do que começou e manter tempo e dinheiro à vista.

## Módulos

- **Agora**: o app escolhe *um* passo para você, de acordo com sua energia. Horário reservado vence; depois o projeto em foco; depois o projeto mais perto da linha de chegada. Mostra quanto tempo livre há até o próximo compromisso, lembretes vencidos e contas do dia.
- **Agenda**: compromissos e lembretes (únicos ou repetidos), tempo livre entre eventos, sincronização com o Google Agenda.
- **Caixa**: tire da cabeça em 1 segundo (botão `+` ou `Ctrl+Espaço`). Depois vira passo, projeto, gasto, compromisso, lembrete ou ideia. Textos como `35 almoço` são reconhecidos como gasto.
- **Finanças**: "livre para gastar por dia até o fim do mês", contas fixas com aviso de vencimento, limites por categoria, importação de extrato CSV (Nubank, Inter, Wallet…) sem duplicar e com categorização automática.
- **Projetos**: todo projeto nasce com uma *linha de chegada*. Só o próximo passo fica visível.
- **Diário**: check-in de 30 segundos (humor, energia, uma frase).
- **Ajustes**: notificações, conexão com o Google, backup.

Os dados ficam no próprio aparelho (localStorage). Use **Ajustes → Backup** para guardar uma cópia ou levar para outro aparelho.

## Notificações

Avisos de compromissos, lembretes, contas a vencer, check-in e tempo de foco. Funcionam enquanto o app está aberto (mesmo minimizado ou em outra aba). Avisos com o app totalmente fechado exigem um servidor de push, que entra junto com a sincronização entre aparelhos.

## Google Agenda

1. Em [console.cloud.google.com](https://console.cloud.google.com), crie um projeto e ative a **Google Calendar API**.
2. Configure a **Tela de consentimento OAuth** como "Externo" e adicione seu e-mail como usuário de teste.
3. Crie uma credencial **ID do cliente OAuth** do tipo **Aplicativo da Web**, com `http://localhost:5173` (e o endereço publicado, quando houver) em **Origens JavaScript autorizadas**.
4. Cole o Client ID em **Ajustes → Google Agenda** no app, ou crie um arquivo `.env.local` com `VITE_GOOGLE_CLIENT_ID=...`.

## Rodar

```bash
npm install
npm run dev
```

Para publicar em um subcaminho (ex.: GitHub Pages em `/MeUsMe/`), gere o build com `BASE_PATH=/MeUsMe/ npm run build`.
