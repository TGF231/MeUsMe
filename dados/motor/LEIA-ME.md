# Dados do motor

Dados da rede neural do motor local ([docs/MOTOR.md](../../docs/MOTOR.md), parte 2).

| Arquivo | O que é | Entra no treino? |
|---|---|---|
| `exemplos.jsonl` | frases escritas à mão, do jeito que se anota com pressa | sim (1/4 separado para a conferência do treino) |
| `modelos.ts` | geradores de variações ("{evento} {hora}", "lembrar de {ação}"…) | sim |
| `avaliacao.jsonl` | **capturas reais suas**, com o tipo certo | **nunca** |

## Classes

`compromisso`, `lembrete`, `despesa`, `receita`, `passo`, `ideia`, `compra`.

## Como montar o `avaliacao.jsonl`

**Atalho:** o app já guarda cada captura que você organiza na Caixa como `{texto, classe}`. Em Ajustes → Captura → **Exportar o que aprendeu**, o arquivo (`meusme-aprendizado-AAAA-MM-DD.jsonl`) sai neste formato; é só renomear para `avaliacao.jsonl` e pôr nesta pasta. Esses exemplos nunca entram no treino de fábrica (só no ajuste da última camada no seu aparelho), então valem como avaliação. Antes de usar, revise: uma captura organizada às pressas no tipo errado vira um rótulo errado.

Sem o atalho:

1. Copie das suas Caixas, notas ou mensagens para si mesmo as frases do jeito que foram escritas, com erro, sem acento, abreviadas. Não corrija nada: a avaliação mede o motor com o texto de verdade.
2. Uma por linha, com a classe que ela **deveria** virar:

   ```
   {"texto":"ver o negocio do carro","classe":"passo"}
   {"texto":"R$ 1000 tv","classe":"receita"}
   {"texto":"podcast sobre plantas","classe":"ideia"}
   ```

3. Pelo menos 50 frases; 100 é melhor. Misture os tipos na proporção em que aparecem no seu dia.
4. Troque nomes de pessoas se quiser: o repositório é privado, mas não precisa ter nomes reais.

## Comandos

```bash
npm run motor:treinar   # treina e grava src/motor/pesos.json (a criação automática volta a ficar desligada)
npm run motor:avaliar   # mede com avaliacao.jsonl e liga a criação automática se passar na trava
```

A trava: a rede precisa acertar mais tipos que as regras sozinhas, e o que ela criaria sozinha (tarefa solta e direção de valor sem sinal) precisa errar no máximo 2%, em pelo menos 10 itens.
