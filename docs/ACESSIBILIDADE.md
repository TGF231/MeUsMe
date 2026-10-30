# Acessibilidade

O MeUsMe tem que servir para quem não enxerga ou enxerga pouco, para quem não ouve, para quem não fala e para quem tem dificuldade de movimento. Este documento diz o que o app faz por cada um, como isso foi verificado e as regras para não perder nada em código novo.

## O que o app oferece

### Quem não enxerga ou enxerga pouco

- **Leitor de tela** (TalkBack no Android, NVDA ou Narrador no Windows):
  - todo botão, campo e grupo de escolha tem nome;
  - a opção escolhida é anunciada como "ativado" (`aria-pressed`, `aria-checked`) e a seção atual como "página atual" (`aria-current`);
  - símbolos como ✓, ★, 📅 e ●○○ não são lidos como "marca de seleção" ou "estrela preta": o leitor ouve "Feito", "Compromisso", "Energia baixa" ou nada, quando são só enfeite (componente `Simbolo`, em `src/components/Icone.tsx`).
- **Onde se está:** ao trocar de seção, o foco vai para o título e o título da janela muda ("Caixa · MeUsMe"). No celular, onde o título mostra só "MeUsMe", o leitor ouve "MeUsMe · Caixa".
- **Avisos e erros:**
  - avisos, mensagens de ditado e mensagens de sincronização são lidos assim que aparecem (`role="status"`); erros, com prioridade (`role="alert"`);
  - nos tutoriais, ao avançar, o texto da tela nova é lido sem o foco sair do botão.
- **Texto grande:**
  - Ajustes → Acessibilidade → Tamanho do texto vai até 150%;
  - soma com o tamanho de fonte do sistema: o Android já aumenta o texto da WebView sozinho (verificado no emulador com a fonte do sistema em 130%);
  - todo tamanho no CSS é em `rem`, então tudo cresce junto;
  - a 375 px de largura com 150%, nada corta na horizontal; os nomes da barra de baixo ganham reticências, mas o leitor de tela lê o nome inteiro.
- **Contraste:**
  - as cores vêm do MegUI: o contraste do texto passou no axe nos temas claro e escuro, e as marcas sem texto (anel de foco, borda de seleção) têm 3:1;
  - **contraste alto** (Ajustes → Acessibilidade, ou sozinho quando o sistema pede mais contraste, `prefers-contrast: more`): o texto secundário vai para o tom do texto principal e as bordas para tons de texto;
  - nada fica só na cor: limite estourado diz "passou do limite"; compromisso que já passou ou está acontecendo é anunciado ao leitor de tela;
  - no alto contraste do Windows (`forced-colors`), a opção escolhida, a aba atual e as barras de progresso ganham contorno ou a cor de destaque do sistema, porque os fundos coloridos somem nesse modo.

### Quem não ouve

- Nenhum aviso depende de som:
  - com o app aberto, o lembrete aparece como aviso na tela;
  - com o app fechado, vira notificação do sistema;
  - no Android, a notificação usa um canal próprio ("Lembretes e compromissos", `CANAL` em `src/notificacoes.ts`), que aparece por cima da tela e vibra. O canal padrão do plugin só tocava som e ficava na barra de status.
- O ditado vira texto na hora e mostra o que entendeu.
- **Limitação:** o recado de voz gravado não é transcrito. A transcrição só existe no ditado, que já vira texto antes de ser guardado.

### Quem não fala

- Falar é sempre opcional: todo lugar com ditado ou recado de voz tem um campo para escrever ao lado.
- Nenhuma função depende da voz.

### Quem tem dificuldade de movimento

- **Teclado:**
  - tudo funciona sem mouse;
  - o primeiro Tab mostra o link "Pular para o conteúdo";
  - Ctrl+Espaço abre a captura rápida;
  - Alt+1 a Alt+7 vão direto para cada seção, na ordem da navegação (Ajustes é o 7), e o leitor de tela anuncia o atalho de cada uma (`aria-keyshortcuts`);
  - Ctrl+Z, fora de um campo de texto, desfaz o que o app acabou de criar sozinho, sem precisar alcançar o botão Desfazer.
- **Janelas** (captura rápida, tutorial):
  - são modais de verdade (`<dialog>` com `showModal`, hook `useJanelaModal` em `src/hooks.ts`): o foco fica preso dentro e o resto da página fica inerte;
  - Esc ou o botão voltar do Android fecham;
  - ao fechar, o foco volta ao botão que abriu.
- **Tempo:**
  - os avisos (inclusive o do Desfazer) param de contar enquanto o mouse ou o foco está neles;
  - em Ajustes → Acessibilidade → "Avisos ficam até eu fechar", eles não somem nunca.
- **Alvos:**
  - todo controle tem pelo menos 30 px, acima dos 24 px que a WCAG 2.2 pede; botões e campos comuns têm 44 px;
  - Ajustes → Acessibilidade → "Botões maiores" leva todos a 48 px (a medida do Android) e aumenta o espaço entre eles.
- **Gestos:** nenhum gesto de arrastar, deslizar, segurar ou tocar duas vezes; tudo é um toque.
- **Movimento:** com "reduzir movimento" ligado no sistema, as transições somem (o MegUI zera `--megui-mov-*`).

## Como foi verificado

| O quê | Como | Resultado |
| --- | --- | --- |
| Regras WCAG 2.2 A/AA e boas práticas | axe-core 4.10 no navegador, nas 7 seções, nos temas claro e escuro, com texto a 150% e botões maiores, e com cada formulário aberto (novo compromisso, novo lembrete, novo projeto, as 6 abas de Finanças, virar projeto na Caixa) | Sem violações |
| Árvore de acessibilidade no Android | `uiautomator dump` no emulador (API 37): nomes, `ToggleButton` com o estado marcado, fundo fora da árvore com a captura aberta | Como esperado |
| Fonte do sistema no Android | Emulador com `font_scale` 1.0 e 1.3 | A WebView acompanha sem código nativo |
| Canal de notificação | `dumpsys notification` no emulador depois de agendar um lembrete | `avisos` com importância 4 e vibração (o `default` do plugin tem importância 3, sem vibração) |
| Contraste e espaçamento | Compromisso que já passou injetado na Agenda; CSS de espaçamento da WCAG 1.4.12 (altura de linha 1,5, espaço entre letras 0,12em) nas 7 seções | De 2,5:1 para 6,4:1 depois da correção; nenhum texto cortado |
| Foco não escondido (WCAG 2.4.11) | Foco em cada controle de Ajustes, Caixa e Agenda a 375 px, medindo a sobreposição com a barra de abas e o botão + | Sem a correção, 4 ficavam por baixo; com `scroll-padding-bottom`, nenhum |
| Rótulo no nome (controle por voz) | Regra `label-content-name-mismatch` do axe e comparação do texto visível com o `aria-label` de cada botão | O nome sempre contém o texto visível |
| Teclado | Ctrl+Espaço, digitar, Enter, Esc, Ctrl+Z e o link de pular, no navegador | Foco certo em cada passo |
| Regressão | `testes/acessibilidade.test.ts` varre o JSX: botão "ativo" sem estado, símbolo solto, campo sem nome, grupo sem nome | Roda no `npm test` |

O que **não** foi verificado:

- **Leitura por voz:** a fala real do TalkBack, porque o emulador não registra o que o TalkBack fala depois que a voz carrega, e a do NVDA ou do Narrador.
- **Alto contraste:** o modo do Windows não foi visto de verdade; o CSS segue a especificação de `forced-colors`.
- **Telas de fora:** a autorização do Google e as páginas do Supabase são de terceiros.

Vale testar com uma pessoa que use leitor de tela no dia a dia antes de publicar na loja.

## Regras para código novo

1. **Botão de escolha:**
   - o que acende com `className="ativo"` leva `aria-pressed`;
   - com `role="radio"`, leva `aria-checked`;
   - na navegação, `aria-current="page"`.
2. **Grupo de botões** (`.segmentado`, `.chips`): `role="group"` e `aria-label` com o texto do rótulo visível.
3. **Campo:**
   - `aria-label`, ou `id` com `<label htmlFor>`, ou dentro do `<label>`;
   - placeholder não serve de nome: some ao digitar e a WebView do Android não o entrega como nome.
4. **Símbolo no meio do texto:** `<Simbolo c="✓" diz="Feito" />`; sem `diz`, quando é só enfeite.
5. **Botão só com ícone:** `aria-label` com o mesmo nome que a dica (`title`).
6. **Janela sobre a tela:** `useJanelaModal` com `<dialog className="fundo">`, e `onCancel` para o Esc.
7. **Mensagem que aparece depois de uma ação:** `role="status"`; erro, `role="alert"`.
8. **Nada some sozinho sem respeitar "Avisos ficam até eu fechar".**
9. **Tamanho:** fonte em `rem`; alvo novo com pelo menos 44 px (`min-height`), salvo em lista densa, onde o mínimo é 30 px.
10. **Nada só por cor, só por som ou só por voz.**
11. **Notificação no Android:** `channelId: CANAL` depois de `await garantirCanal()` (`src/notificacoes.ts`).
12. **Cor nova:** token do MegUI, conferido também com o contraste alto ligado.

Para auditar no navegador, com o app aberto (`npm run dev`), cole no console:

```js
await new Promise((ok) => document.head.appendChild(Object.assign(document.createElement('script'), { src: 'https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.10.2/axe.min.js', onload: ok })))
;(await axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa', 'best-practice'] })).violations
```

Uma lista vazia quer dizer sem violações automáticas. Ela não substitui o teste com teclado e com leitor de tela.
