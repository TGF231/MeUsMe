# Motor local: organizar capturas sem revisar tudo

Desenho do motor que lê o que você digita ou dita ("dentista 13:00", "-35 almoço", "lembrar de pagar a luz sexta") e já cria o compromisso, o gasto, o lembrete ou o passo. Tudo roda no aparelho: sem servidor, sem internet, sem mandar texto para ninguém.

Estado: **fases 0, 1 e 2 feitas.** A rede sugere na Caixa; a criação automática por ela espera o `avaliacao.jsonl` com capturas reais (`npm run motor:avaliar`). Fase 3 planejada.

## O que muda para quem usa

- Na Caixa, na captura rápida (`+` / `Ctrl+Espaço`) e no ditado, o texto passa pelo motor antes de ir para a Caixa.
- **Com certeza alta**, o item é criado na hora e aparece um aviso por 12 segundos: *"Compromisso: Dentista · hoje às 13:00 · por causa de **13:00** · Desfazer"*. Sem tocar em nada, fica.
- **Desfazer** apaga o item e devolve o texto para a Caixa: nada se perde. O motor anota o erro e aprende com ele (fase 3).
- **Sem certeza**, vai para a Caixa como hoje, já com o tipo provável no primeiro botão ("Parece um compromisso").
- Em Ajustes, um interruptor: *Organizar capturas automaticamente*. Desligado, o motor só sugere na Caixa.

## As regras do tutorial (o contrato)

O motor é construído em volta de **quatro regras que cabem num tutorial de quatro telas**. O que o tutorial ensina funciona sempre, do mesmo jeito: é regra, não palpite. A rede (parte 2) só entra onde nenhuma regra se aplica, e nunca contradiz uma regra.

| # | Regra | Exemplos | Vira |
|---|---|---|---|
| 1 | **"Lembrar" vira lembrete** | `lembrar de pagar a luz sexta` | lembrete na sexta |
| 2 | **Dinheiro começa com - ou +** | `-35 almoço`, `+1000 tv`; falando: "menos 35 reais almoço" | saída de R$ 35, entrada de R$ 1.000 |
| 3 | **Hora vira compromisso** | `dentista 13:00`, `reunião amanhã 15h` | compromisso no horário |
| 4 | **O resto, a Caixa guarda** | `ver aquele negócio do carro` | captura na Caixa (com a rede: o app tenta entender e, sem certeza, guarda) |

E uma frase final em todas as telas: **errou? Toque em Desfazer.**

Por que essas quatro:

- **Precedência na ordem da tabela**, para nunca haver dúvida: `lembrar de pagar R$ 50 sexta 10h` é lembrete (regra 1 antes da 2 e da 3); `R$ 35 almoço 13h` é dinheiro (regra 2 antes da 3).
- **Uma palavra ou um símbolo por regra.** Nada de "depende do contexto" no tutorial.
- **Funcionam falando.** "menos 35 reais" e "mais mil reais" valem como `-` e `+`; o ditado do Google escreve "R$" sozinho.
- **Variações aceitas, mas não ensinadas:** `35 reais`, `35,00`, "paguei", "vendi", "às 3 da tarde". Funcionam, mas o tutorial não precisa citá-las. Quem não sabe delas não perde nada.

### O app ensina enquanto é usado

- **O aviso diz o porquê**: *"Compromisso: Dentista · hoje às 13:00 · por causa de **13:00** · Desfazer"*. O trecho que disparou a regra aparece em negrito. Quando foi a rede, o aviso diz *"Parece um passo"*, nunca "por causa de".
- **O exemplo do campo** alterna entre as regras: *"dentista 13:00"*, *"-35 almoço"*, *"lembrar de… sexta"*.
- **Sem R$.** Digitar "R$" no teclado do celular exige trocar de teclado duas vezes. O sinal fica no mesmo teclado dos números, então ele sozinho marca o dinheiro.
- **Um `?` ao lado do campo de captura** abre o tutorial de novo, e ele também fica em Ajustes → *Como escrever rápido*.
- Quando um valor vai para a Caixa por falta de sinal, o cartão lembra a regra: *"Use + ou - na frente para o app lançar sozinho."*

### Tutorial e código não podem divergir

Os exemplos do tutorial ficam em um só lugar, `src/motor/tutorial.ts`: a tela do tutorial mostra esses exemplos, e um teste passa cada um pelo motor e confere o resultado. Se alguém mudar uma regra e quebrar um exemplo do tutorial, o teste falha.

## As duas partes do motor

Uma rede neural é boa para decidir **o que** a frase é e ruim para extrair números exatos: com poucos dados ela "inventa" uma hora ou um valor. Por isso:

1. **Extratores por regra** pegam valor, hora e data, de forma exata e testável.
2. **Classificador neural** decide a intenção, usando o texto e as marcas dos extratores.

```
texto ──► extratores ──► { valor?, hora?, data?, título } ──┐
   │                                                        ├──► decisão ──► criar item + aviso
   └────► características ──► rede ──► probabilidades ──────┘          └──► Caixa com sugestão
```

## Parte 1: extratores

Funções puras em `src/motor/extratores.ts`, cada uma devolvendo o valor e o trecho do texto que usou (para o título não repetir "13:00").

### Valor (regra nova)

Na captura livre, **só é dinheiro o que tem sinal colado no número ou marca de moeda**:

| Texto | Valor |
|---|---|
| `-35 almoço`, `+1000 tv` (sinal colado no número) | R$ 35,00 (saída), R$ 1.000,00 (entrada) |
| `R$ 35 almoço`, `r$35 almoço` | R$ 35,00 |
| `35 reais almoço`, `almoço 35 reais` | R$ 35,00 |
| `35,00 almoço`, `almoço 12,90` | R$ 35,00 / R$ 12,90 |
| `35 almoço` | nenhum: é só texto |
| `dentista 13:00` | nenhum: é hora |
| `- 2 pães`, `-5 kg de arroz`, `+55 11 98765-4321`, `99999-1234` | nenhum: sinal solto, com unidade, telefone |

- Onde o campo já é de valor (lista de espera, formulário de gasto), o número solto continua valendo. `lerDinheiro` (`src/motor/extratores.ts`) substituiu o antigo `lerGasto`, com a opção `exigirMoeda`: ligada na Caixa e no motor, desligada na lista de espera.
- Com dois valores no texto (`R$ 35 almoço e R$ 10 café`), nenhum é lido: o motor não escolhe por você.
- Aceita `R$ 2 mil` e `2 mil reais`. Números por extenso ("mil reais") não: o ditado já escreve em algarismos.
- Direção: **não é adivinhada**. "R$ 1000 tv" tanto pode ser uma venda quanto uma compra.
  - Sinal explícito decide: `+1000 tv` é receita, `-1000 tv` é despesa.
  - Palavras decidem: `vendi`, `recebi`, `entrou`, `ganhei`, `caiu`, `salário`, `reembolso` → receita; `comprei`, `paguei`, `gastei`, `conta de`, `mensalidade` → despesa.
  - Sem sinal nem palavra, o extrator devolve direção `null`, e quem decide é a rede (classes `despesa` e `receita`), que aprende o seu padrão com as suas respostas (parte 3). Enquanto ela não tiver certeza, a captura vai para a Caixa com **Saída · Entrada** na frente.
  - Em Ajustes, "Valor sem sinal": *perguntar* (padrão), *é gasto* ou *é venda*.
- O exemplo nos campos de captura muda na fase 1, junto com o tutorial (antes disso, "dentista 13:00" ainda não faria nada). O ditado do Google já escreve "R$ 35" quando se fala "35 reais".

### Hora

`13:00`, `13h`, `13h30`, `13 horas`, `às 13`, `às 3 da tarde`, `9 da manhã`, `meio-dia`, `meia-noite`. "às 3" sem período vira 15h entre 1 e 7 (ninguém marca dentista às 3 da madrugada) e fica como está de 8 a 12. Com "h" ou ":" vale como escrito, em 24 horas: `academia 6h` é de manhã.

Não são hora: `estudar 2h` (de 1h a 4h, sem "às", é duração), `comprar as 3 camisas` ("as" sem acento só vale com "da tarde", "da manhã" ou "da noite").

### Data

`hoje`, `amanhã`, `depois de amanhã`, dias da semana (`sexta`, `na segunda`), `dia 15`, `15/11`, `semana que vem` (segunda seguinte).

Resolução, sempre a partir de "agora" passado como parâmetro (testável):

- Só hora: hoje se ainda não passou; senão amanhã.
- Dia da semana: a próxima ocorrência; hoje se for o mesmo dia e a hora ainda não passou.
- `dia 15`: este mês se ainda não passou; senão o próximo.

### Título

O texto sem os trechos usados e sem conectores soltos (`às`, `no dia`, `lembrar de`, `para`), com a primeira letra maiúscula. `dentista amanhã às 13h` → **Dentista**.

## Parte 2: classificador neural

### Classes

| Classe | Vira | Criação automática? |
|---|---|---|
| `compromisso` | evento na Agenda (1 h por padrão), só no MeUsMe: para ir também ao Google, use o formulário | sim, se tiver hora |
| `lembrete` | lembrete (9h se não houver hora) | sim, se tiver data ou hora |
| `despesa` | saída na conta principal, com categoria sugerida | sim, se tiver valor |
| `receita` | entrada na conta principal | sim, se tiver valor |
| `passo` | tarefa solta, energia média | sim |
| `ideia` | ideia estacionada | não: vai para a Caixa com sugestão |
| `compra` | lista de espera ("quero comprar um fone") | não: vai para a Caixa com sugestão |

`ideia` e `compra` ficam de fora da criação automática porque o erro é caro: uma tarefa estacionada como ideia some da tela Agora.

Despesa e receita são classes separadas, e não uma direção decidida por regra, porque o mesmo texto muda de sentido conforme a pessoa: para quem vende, "R$ 1000 tv" é venda; para quem compra uma TV por década, é gasto. Quando o extrator acha um sinal explícito (`+`, `-`, "vendi", "paguei"), ele vence a rede.

### Entrada da rede

O texto normalizado (minúsculas, sem acento) vira um vetor esparso por *feature hashing*, sem dicionário:

- pedaços de 3 e 4 letras com marcas de borda (`<de`, `den`, `ent`…): toleram erro de digitação e palavra nova;
- palavras e pares de palavras;
- ~10 marcas dos extratores: tem hora, tem data, tem valor, começa com verbo, tem "lembrar", tem "quero", número de palavras (curto/médio/longo).

Cada pedaço cai em uma de 4.096 posições (hash FNV-1a). O vetor é normalizado para comprimento 1.

### Arquitetura

```
4.096 + 11 entradas ──► 32 neurônios (ReLU) ──► 7 saídas (softmax)
```

- ~132 mil pesos. Guardados em int8 com uma escala por linha: 199 KB de `pesos.json` (149 KB comprimidos), num pedaço separado do app que só é baixado na primeira captura (`src/motor/carregar.ts`). Se faltar, o motor segue só com as regras.
- Como a entrada é esparsa (30 a 80 posições ativas), a primeira camada é só somar as linhas ativas. Menos de 1 ms por frase, em TypeScript puro, sem biblioteca.
- O mesmo `src/motor/caracteristicas.ts` é usado no treino e no app. Se fossem dois códigos, qualquer diferença entre eles estragaria a rede sem nenhum erro aparente.

### Treino

- `npm run motor:treinar` (`scripts/motor-treinar.ts`) roda no Node em ~7 s: separa 1/4 das frases escritas à mão para conferir, mostra o acerto e a matriz de confusão, e depois treina com tudo e grava os pesos.
- Primeiro treino: 174 frases à mão + 1.750 geradas; na conferência, 37 de 39 frases à mão fora do treino (95%). É um número otimista: as frases de conferência foram escritas pela mesma pessoa que escreveu as de treino.
- Entropia cruzada, Adam, regularização L2 e dropout na camada escondida; semente fixa, para o mesmo dado dar sempre os mesmos pesos.
- Saída: `src/motor/pesos.json`, gerado e versionado, com o hash dos dados de treino e a versão das características. Um teste falha se os dados mudarem e os pesos não forem retreinados.
- Um teste de **checagem de gradiente** compara o gradiente calculado com o numérico em uma rede pequena. É a forma padrão de provar que a retropropagação está certa.

### Dados

Em `dados/motor/`:

- `exemplos.jsonl`: frases escritas à mão (174 no primeiro treino), uma por linha, com a classe. Começa por variações reais de como se escreve com pressa: sem acento, abreviado, com erro.
- `modelos.ts`: geradores de variação (`{coisa} {hora}`, `lembrar de {ação} {dia}`, `R$ {valor} {lugar}`…), para cobrir combinações sem escrever todas.
- `avaliacao.jsonl`: **capturas reais suas**, que nunca entram no treino. É o que mede a rede de verdade. Ficam no repositório (que é privado); dá para trocar nomes de pessoas antes de colar. Como montar: `dados/motor/LEIA-ME.md`.

### Avaliação e a trava da criação automática

`scripts/motor-avaliar.ts` mostra, sobre `avaliacao.jsonl`:

- acerto por classe e a matriz de confusão;
- para cada limiar de certeza: quantas capturas seriam organizadas sozinhas e **quantas seriam organizadas errado**.

O limiar é escolhido para **no máximo 2% de erro automático**, com pelo menos 10 itens criados e 50 frases no conjunto. A rede também precisa vencer a versão só com regras (fase 1) no mesmo conjunto. Se não vencer, não entra.

O resultado vai para `automatico` em `pesos.json`: `{ liberado, limiar, medidoEm }`. Treinar de novo desliga a criação automática até a próxima avaliação: pesos novos precisam ser medidos de novo.

O que a rede pode criar sozinha, quando liberada: **tarefa solta** (frase sem nenhuma marca) e a **direção de um valor sem sinal** (`R$ 35 almoço`). Ideia e compra nunca: classificadas errado, somem da tela Agora. Compromisso e lembrete sem hora nem data também não: faltaria o quando.

## Decisão

```
se interruptor desligado                → Caixa com sugestão
se uma regra do tutorial se aplica      → cria o item pela regra (aviso "por causa de …")
se você já corrigiu esse mesmo texto    → vale a sua correção
se a rede tem certeza ≥ limiar
   e a classe tem os dados que precisa  → cria o item (aviso "parece …")
senão                                   → Caixa com sugestão
```

Regras primeiro, sempre. A rede decide só o que as regras deixam em aberto: frases sem hora, sem "lembrar" e sem valor com sinal, e valores sem sinal (`R$ 35 almoço`). Um teste garante que os exemplos do tutorial dão o mesmo resultado com e sem a rede.

Na Caixa, a sugestão da rede aparece só com certeza de 50% ou mais; abaixo disso, a captura fica sem sugestão.

## Parte 3: aprender com você

- Cada Desfazer e cada captura organizada na Caixa vira um exemplo `{texto, classe}` guardado no aparelho.
- A escolha entre **Saída · Entrada** na Caixa também conta: é assim que "R$ 1000 tv" vira venda para quem vende.
- A cada 20 exemplos novos, o app retreina **só a última camada** (32 × 7 pesos) por alguns segundos, em segundo plano. A primeira camada fica como veio do treino.
- Os exemplos ficam no aparelho e não sincronizam. "Esquecer o que o motor aprendeu", em Ajustes, volta aos pesos de fábrica.

## Mudanças no app

- Tutorial de quatro telas, no mesmo formato da introdução, mostrado na primeira captura depois da atualização e reaberto pelo `?` e por Ajustes.
- `Captura` ganha `sugestao?: Classe`; o `Processar` da Caixa mostra esse tipo primeiro.
- O aviso (`useAvisos`) ganha um botão de ação (Desfazer) e o trecho em negrito que disparou a regra. Fica os mesmos 12 s dos outros avisos. Para editar, Desfazer devolve o texto à Caixa, onde cada tipo tem seu formulário: um botão Editar a mais no aviso não ganharia nada.
- `executar.ts` cria o item e devolve a função que desfaz.
- O ditado e a captura rápida chamam o motor em vez de `capturar()` direto.
- Feito na fase 0: `lerDinheiro(texto, { exigirMoeda })` no lugar de `lerGasto`; na Caixa, o botão diz "Registrar entrada" ou "Registrar gasto" conforme o sinal; README atualizado ("35 almoço" deixa de ser gasto).
- Política de privacidade: uma linha dizendo que a organização automática acontece no aparelho.

## Arquivos

```
src/motor/
  extratores.ts        valor, hora, data, título
  caracteristicas.ts   texto → vetor esparso (treino e app)
  rede.ts              camadas, softmax, int8, treino da última camada
  regras.ts            as quatro regras do tutorial, em ordem de precedência
  tutorial.ts          exemplos do tutorial (a tela e o teste leem daqui)
  interpretar.ts       junta tudo e aplica a decisão
  executar.ts          cria o item e devolve o desfazer
  pesos.json           gerado pelo treino
dados/motor/
  exemplos.jsonl, modelos.ts, avaliacao.jsonl
scripts/
  motor-treinar.ts, motor-avaliar.ts
testes/
  motor-extratores.test.ts   casos de valor, hora, data e título com "agora" fixo
  motor-rede.test.ts         checagem de gradiente, int8, pesos atualizados
  motor-interpretar.test.ts  decisão, precedência, limiar, memória exata
  motor-tutorial.test.ts     cada exemplo do tutorial dá o resultado prometido
```

## Fases

| Fase | Entrega | Já resolve |
|---|---|---|
| 0 · feita | Extrator de valor: marca obrigatória, sinal, palavras de direção | "dentista 13:00" e "35 almoço" deixam de virar dinheiro; "+1000 tv" abre como entrada |
| 1 · feita | Extratores, as quatro regras, tutorial, aviso com Desfazer e "por causa de", sugestão na Caixa | "dentista 13:00", "-35 almoço", "+1000 tv", "lembrar de… sexta"; "R$ 35 almoço" vai para a Caixa com Saída · Entrada |
| 2 · feita | Dados, treino, avaliação, rede para o que as regras deixam em aberto | frases sem palavra-chave: "pagar a luz", "ideia: app de receitas", "R$ 35 almoço" como despesa |
| 3 | Aprender com as correções | o seu jeito de escrever |

Cada fase é um PR. A fase 1 é a base de comparação da 2: sem ela não há como provar que a rede ajuda.

## Decisões (28/10/2026)

1. **Ligado por padrão** para `compromisso`, `lembrete` e valores **com sinal ou palavra de direção** desde a fase 1, porque as regras são exatas. Valores sem direção e `passo` só depois que a fase 2 passar na trava.
2. **Lembrete sem hora: 9h.**
3. **Classe `compra` fica**, fora da criação automática.
4. **`avaliacao.jsonl` vai para o repositório** (privado). Nomes de pessoas podem ser trocados antes de colar.
