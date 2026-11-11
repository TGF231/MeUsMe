# MegUI no MeUsMe

Como o MeUsMe aplica o MegUI, o que ele adapta para o toque e o que ele propõe de volta para a definição do sistema.
A fonte do MegUI é o artifact de design system; aqui ficam só as cópias geradas, em `src/tema/` (nunca editadas à mão).

## 1. O que veio do MegUI (forma dos controles, Figma UI3)

A revisão de 11/11/2026 mudou só a folha de componentes (`megui-componentes.css`). Tokens, fontes e a camada React
ficaram iguais. As mudanças, pedidas a partir do SPED Tables:

| Peça | Antes | Agora |
|---|---|---|
| Aba ativa (topo e planilha) | caixa com linha de acento de 2px | marca de fundo (`megui-border`) com peso forte, sem caixa e sem linha |
| Aba em repouso | caixa rebaixada | rótulo solto em `megui-ink-2` |
| Campo de uma linha e seleção | fundo rebaixado com contorno | preenchimento `megui-surface-2` sem contorno; contorno no hover, anel no foco |
| Campo de várias linhas | igual ao de uma linha | mantém o contorno |
| Desabilitado | fundo da janela | sem preenchimento, contorno fraco |
| Botão secundário | fundo de painel | só contorno, fundo transparente |
| Botão de janela e de barra | hover de altura inteira | hover só de fundo, recuado e no raio de 4px |
| Barra de título + faixa abaixo | duas faixas com divisória | um cabeçalho só; a divisória fica embaixo da segunda |
| Seta da seleção | uma, do tema claro | uma por tema |
| Contexto da barra de título | texto único | segmentos: nome por extenso e marcas de fundo; pendência como marca de contorno em `megui-warn` |

## 2. O que o MeUsMe já tinha decidido (pedidos de layout)

1. Só três abas (Em ação, Em espera, Finanças); as outras telas são menu de dentro da aba.
2. Faixas de navegação de ponta a ponta, sem botões soltos.
3. Nada de rolagem horizontal em faixa: o que não cabe quebra em outra linha, para tudo ficar à vista.
4. No celular, a aba aberta da barra de baixo sobe para fora da barra, como marcador de livro, sem engrossar a barra.
5. Botão de captura grande (72px) e afastado da barra de baixo.
6. O passo da vez no meio da altura que sobra, e não colado no topo.
7. Contagem junto do rótulo ("Planejar · 3"), sem quebrar sozinha numa linha.

## 3. Como os dois se juntam no MeUsMe

- **Faixas (menu da aba, sub-abas de Finanças, dias da Agenda):** continuam de ponta a ponta e quebrando em linhas
  (pedidos 2 e 3). A pintura passa a ser a do MegUI: a faixa é uma banda só em `megui-surface-2`, cada item é rótulo
  solto e o aberto é a marca de fundo com peso forte. Saiu a linha de acento embaixo do item aberto.
- **Barra de baixo no celular:** o marcador continua subindo para fora (pedido 4). A cor passa a ser a marca de fundo
  (`megui-border`, a mesma da linha de cima da barra), sem a borda de acento. O acento fica só no botão de captura,
  como manda a lei 3.
- **Campos:** preenchimento sem contorno em repouso, contorno no hover, anel no foco; `textarea` mantém o contorno.
  As medidas de toque (44px, texto de 16px, anel de 2px) continuam as do MeUsMe.
- **Botões secundários:** só contorno. O preenchimento fica para Guardar, Começar e Capturar.
- **Botão de ícone (busca, ajustes):** hover só de fundo.
- **Janela de computador:** usa a folha nova sem adaptação; as abas de seção já saem como marca de fundo.

## 4. Propostas para a definição do MegUI

O MegUI descreve o retrato em uma frase ("abas colapsam em botão de menu, coluna única, ação primária estica"). O
MeUsMe é o primeiro app da família feito para o toque, e as regras abaixo saíram do uso. Nenhuma pede token novo de
cor; as medidas novas estão marcadas.

1. **Retrato com poucas seções usa barra de baixo, não botão de menu.** Até cinco contextos cabem ao alcance do
   polegar; menu só acima disso. A aba ativa é a mesma marca de fundo, e pode subir `megui-esp-4` + `megui-esp-meio`
   para fora da barra, com raio só em cima.
2. **Faixa nunca rola de lado.** Em retrato, faixa de abas, de ações e de nível quebram em linhas (`flex-wrap`) com
   itens de largura igual. Rolagem horizontal esconde função e parece erro de layout. Hoje a `BarraAcoes` diz "em
   retrato vira linha rolável": a proposta é trocar por quebra.
3. **Faixa ocupa a largura toda.** Itens de navegação não flutuam como botões avulsos: ficam numa banda
   `megui-surface-2` com contorno de 1px.
4. **Tela de dentro é menu da aba, não aba nova.** Complementa a lei 7: além de "etapa é estado da aba", "vista do
   mesmo contexto é item do menu da aba".
5. **Contagem no rótulo com espaço que não quebra** (`Rótulo · N`), em qualquer faixa.
6. **Ação primária em retrato:** além de esticar, pode ser quadrada no canto. Medida nova: `acaoToque` 72px, com
   `megui-esp-6` de distância da barra de baixo, e reserva no fim do rolável igual a tamanho + distância + barra.
7. **Conteúdo único se centra na altura.** Quando a tela tem um bloco só (o passo da vez, um estado vazio com a
   função visível), ele fica no meio da altura que sobra.
8. **Corpo de toque.** Em retrato, o corpo sobe de 13px para 16px e o anel de foco, de 1px para 2px. Medidas novas:
   `tipo.corpoToque` 16 e `foco.anelToque` 2.
9. **Lei 3 com exceção nomeada.** Formulário aberto dentro da tela (Guardar, Adicionar) tem a sua ação em acento
   enquanto está aberto, mesmo com a ação primária flutuante na tela. Vale dizer isso na lei, ou trocar por
   variante sem acento.

## 5. O que ainda diverge

- **Cartão.** O MegUI não tem cartão; agrupa com `Grupo` ou com a faixa. No toque o MeUsMe mantém `.cartao` (fundo
  `megui-surface`, contorno de 1px, sem sombra). Na janela de computador o cartão já vira `Grupo`.
- **Título no conteúdo.** No celular o topo mostra a marca e não há barra de título; a lei 1 só vale na janela.
- **Texto com "você".** O MegUI não usa pessoa; o MeUsMe fala com quem usa. É decisão do produto, não do sistema.
