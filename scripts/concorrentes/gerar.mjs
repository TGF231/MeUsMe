// Gera docs/CONCORRENTES.md, docs/mapa-concorrentes.html e o bloco de perfil do docs/ROADMAP.md (entre <!-- perfil:início --> e <!-- perfil:fim -->).
// Uso: npm run docs:concorrentes. Edite os dados aqui (dados.mjs, perfil1.mjs, perfil2.mjs, assistentes.mjs, automacao.mjs) e o mapa em modelo.html, nunca os arquivos gerados.
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import * as D from './dados.mjs'
import * as P1 from './perfil1.mjs'
import * as P2 from './perfil2.mjs'
import { assistentes, fontesAssistentes } from './assistentes.mjs'
import { automacao, fontesAutomacao } from './automacao.mjs'
import { conferirTabelas } from './tabelas.mjs'

const saida = process.argv[2] ?? fileURLToPath(new URL('../../docs', import.meta.url))
const itens = (l) => l.flatMap((t) => t.itens)

// Junta o cruzamento com o perfil a cada item e confere que nenhum ficou de fora.
for (const i of [...itens(D.vantagens), ...itens(D.desvantagens)]) {
  if (!P2.itens[i.id]) throw new Error('sem perfil: ' + i.id)
  i.perfil = P2.itens[i.id]
}
// Itens já construídos (branch onda1, 2/11/2026).
const FEITOS = new Set(['V09', 'D04', 'D25', 'D14', 'D13', 'V27', 'V20', 'D03', 'D08', 'V03', 'V02', 'V07', 'V08', 'D27', 'D23', 'V12', 'V24', 'D01', 'D02', 'V18'])
const todas = [...itens(D.vantagens), ...itens(D.desvantagens)]
for (const i of todas) i.feito = FEITOS.has(i.id)
const nV = itens(D.vantagens).length, nD = itens(D.desvantagens).length
const porOnda = (n) => todas.filter((i) => i.onda === n).length
const porOndaP = (n) => todas.filter((i) => i.perfil.onda === n).length
const porEncaixe = (e) => todas.filter((i) => i.perfil.encaixe === e).length

const dados = {
  fontes: D.fontes, ondas: D.ondas, vantagens: D.vantagens, desvantagens: D.desvantagens, jaTem: D.jaTem, reserva: D.reserva, comecar: D.comecar,
  sinais: P1.sinais, tensoes: P1.tensoes, lacunas: P1.lacunas, ondasPerfil: P1.ondasPerfil, trilhas: P1.trilhas, infras: P1.infras,
  esforcos: P1.esforcos, encaixes: P1.encaixes, comecarPerfil: P2.comecarPerfil,
  assistentes, fontesAssistentes, automacao, fontesAutomacao,
}
const json = JSON.stringify(dados).replace(/</g, '<')
const html = readFileSync(new URL('./modelo.html', import.meta.url), 'utf8').replace('/*DADOS*/', json)
writeFileSync(`${saida}/mapa-concorrentes.html`, html)

const limpa = (t) => t.replace(/[()[\]{}"':;,!?"]/g, '').replace(/\s+/g, ' ').trim()
const fonte = (k) => `[${D.fontes[k][0]}](${D.fontes[k][1]})`
const celula = (t) => t.replace(/\|/g, '\\|')
const linha = (i) => {
  const f = (i.fontes || []).map(fonte).join('; ') || '💡 observação minha'
  const cuidado = i.adaptar ? ` **Cuidado:** ${i.adaptar}` : ''
  return `| ${i.id} | **${i.titulo}** | ${i.quem} | ${i.prova} | ${i.acao}${cuidado} | ${i.onda} | ${f} |`
}
const tabela = (lista, rotuloProva) => lista.map((t) => `### ${t.nome}\n\n| # | Item | Quem | ${rotuloProva} | O que fazer no MeUsMe | Onda | Fonte |\n|---|---|---|---|---|---|---|\n${t.itens.map(linha).join('\n')}\n`).join('\n')
const mermaid = (rotulo, lista) => `    ${rotulo}\n` + lista.map((t) => `      ${limpa(t.nome)}\n` + t.itens.map((i) => `        ${i.id} ${limpa(i.titulo)}`).join('\n')).join('\n')

// ---- cruzamento com o perfil ----
const rotuloEnc = { alto: '**alto**', medio: 'médio', baixo: 'baixo' }
const infoLinha = (p) => `${p.esforco} · ${P1.infras[p.infra]} · trilha ${p.trilha} (${P1.trilhas[p.trilha]})`
const feito = (id) => (FEITOS.has(id) ? ' ✅ feito' : '')

const linhaPerfil = (i) => {
  const p = i.perfil
  return `| ${i.id} | **${i.titulo}**${feito(i.id)} | ${rotuloEnc[p.encaixe]} | ${celula(p.ganho)} | ${celula(p.custo)} | ${infoLinha(p)} | ${i.onda} → ${p.onda} |`
}
const tabelaPerfil = (lista) => lista.map((t) => `#### ${t.nome}\n\n| # | Item | Encaixe | Ganho para você | Custo ou risco para você | Esforço · infraestrutura · trilha | Onda (pesquisa → você) |\n|---|---|---|---|---|---|---|\n${t.itens.map(linhaPerfil).join('\n')}\n`).join('\n')
const titulo = (id) => todas.find((x) => x.id === id).titulo
const subiram = todas.filter((i) => i.perfil.onda < i.onda).map((i) => `${i.id}`)
const desceram = todas.filter((i) => i.perfil.onda > i.onda).map((i) => `${i.id}`)
const iguais = todas.filter((i) => i.perfil.onda === i.onda).length
const onda1 = todas.filter((i) => i.perfil.onda === 1)
const juntar = (a) => (a.length > 1 ? a.slice(0, -1).join(', ') + ' e ' + a[a.length - 1] : a.join(''))
const android1 = onda1.filter((i) => i.perfil.infra === 'android').map((i) => i.id)
const google1 = onda1.filter((i) => i.perfil.infra === 'google').map((i) => i.id)
const soTs1 = onda1.filter((i) => !['android', 'google'].includes(i.perfil.infra) && i.id !== 'D03').map((i) => i.id)

const md = `# Concorrentes: o que aproveitar e onde fazer melhor

Pesquisa de outubro de 2026 sobre apps consolidados de tarefas, planejamento do dia e finanças pessoais (Todoist, Things 3, TickTick, Tiimo, Structured, Sunsama, Motion, Reclaim, Amazing Marvin, Goblin Tools, Finch, Habitica, Mobills, Organizze, YNAB, Monarch, Notion e outros). O objetivo é alimentar o [roadmap](ROADMAP.md) só com o que o MeUsMe **ainda não tem**: o que já existe foi descartado (lista no fim), e cada item aparece uma vez.

- **${nV} vantagens deles** que fazem falta aqui, e **${nD} desvantagens deles** que viram oportunidade.
- **Cruzamento com o seu perfil** (31/10/2026): para cada item, o que ele ganha e o que custa para você como usuário e como desenvolvedor, com uma onda própria. A leitura do perfil, os sinais citados (U1 a U11, D1 a D10) e a revisão das funções que o app já tem estão em [ROADMAP.md](ROADMAP.md#seu-perfil-e-o-que-ele-muda).
- Mapa mental interativo: abra [mapa-concorrentes.html](mapa-concorrentes.html) no navegador (funciona sem internet, com teclado e leitor de tela; em tela estreita vira lista). Ele alterna entre a leitura pela pesquisa e pelo seu perfil.
- Este arquivo e o mapa são gerados por \`npm run docs:concorrentes\` a partir de [scripts/concorrentes](../scripts/concorrentes/): edite lá, não aqui.
- Fora de uma tela larga, o mapa abaixo mostra a mesma coisa no GitHub.

## Como ler

Há duas ondas para cada item. A da **pesquisa** olha só para o que os concorrentes mostram:

${Object.entries(D.ondas).map(([n, t]) => `- **Onda ${n}**: ${t}`).join('\n')}

Há ${porOnda(1)} itens na onda 1, ${porOnda(2)} na onda 2 e ${porOnda(3)} na onda 3. A onda **para você** cruza o item com o que você escreveu e com o código de hoje:

${Object.entries(P1.ondasPerfil).map(([n, t]) => `- **Onda ${n}**: ${t}`).join('\n')}

Há ${porOndaP(1)} itens na onda 1, ${porOndaP(2)} na onda 2 e ${porOndaP(3)} na onda 3. Itens com **Cuidado** conflitam em parte com os princípios do app (uma coisa de cada vez, sem culpa, dados no aparelho) e só entram adaptados.

Nos itens, **encaixe** é o quanto ele responde ao que você escreveu (alto, médio, baixo); **esforço** é uma estimativa minha para você escrever no ritmo de 1 a 2 horas por dia (P: dias, M: 1 a 2 semanas, G: mais de 2 semanas); **trilha** é a do [guia de estudo](GUIA-DE-ESTUDO.md) que você precisa ter feito antes. Encaixe e esforço são leituras minhas, para discutir, não medidas.

## Por onde começar

### Pela pesquisa

Vinte itens estão na onda 1, o que é muito para "agora". Estes seis vêm primeiro, nesta ordem:
${D.comecar.map(([id, porque]) => `
- **${id} · ${titulo(id)}**: ${porque}`).join('')}

Depois deles, **D01 · Montar meu dia** fica mais barato, porque usa passos que se repetem (V08), prazo (V09) e passos quebrados (V20).

### Pelo seu perfil

São ${porOndaP(1)} itens, nesta ordem. Todos respondem a algo que você já escreveu:
${P2.comecarPerfil.map(([id, porque]) => `
- **${id} · ${titulo(id)}**${feito(id)}: ${porque}`).join('')}

Os de Android (${juntar(android1)}) pedem a trilha 10 antes e ${juntar(google1)} pede a trilha 9; ${juntar(soTs1)} são só TypeScript e React, e D03 nem isso: é uma regra. Nenhum exige Rust.

## Mapa mental

\`\`\`mermaid
mindmap
  root((MeUsMe))
${mermaid('Vantagens deles que faltam', D.vantagens)}
${mermaid('Desvantagens deles que viram oportunidade', D.desvantagens)}
\`\`\`

## Cruzamento com o seu perfil

Ganho e custo de cada item **para você**. Resumo: ${porEncaixe('alto')} itens de encaixe alto, ${porEncaixe('medio')} médio e ${porEncaixe('baixo')} baixo. Por onda, a pesquisa dá ${porOnda(1)} / ${porOnda(2)} / ${porOnda(3)} e o seu perfil dá ${porOndaP(1)} / ${porOndaP(2)} / ${porOndaP(3)}.

- **Mudam de onda:** ${todas.length - iguais} itens. Sobem: ${subiram.join(', ')}. Descem: ${desceram.join(', ')}.
- **Encaixe alto fora da onda 1:** ${todas.filter((i) => i.perfil.encaixe === 'alto' && i.perfil.onda !== 1).map((i) => i.id).join(', ')}. Dependem de outros itens (V13, V14, D01, D02), pedem esforço grande (V01, V23, D01, D26), melhoram algo que já funciona (V12) ou são de longo prazo (D20).
- **Sem sinal no seu uso:** os ${porEncaixe('baixo')} de encaixe baixo (${todas.filter((i) => i.perfil.encaixe === 'baixo').map((i) => i.id).join(', ')}) ficam na onda 3. Podem valer para o público na fase 3 do roadmap; para você, só se o uso real pedir.

### 30 vantagens deles

${tabelaPerfil(D.vantagens)}
### 30 desvantagens deles

${tabelaPerfil(D.desvantagens)}
## Captura por assistente de voz (Gemini e Siri)

Pesquisa de 01/11/2026, a partir de V01 a V03 e do sinal U5 (você já dita pedidos por áudio). Na Siri a integração direta já é possível para qualquer app, mas exige app nativo de iPhone; no Gemini ela existe, mas ainda não está aberta para um app como o MeUsMe.

| # | Item | Situação hoje | O que fazer no MeUsMe | Ganho para você | Custo ou risco | Onda para você | Fonte |
|---|---|---|---|---|---|---|---|
${assistentes.map(([id, t, hoje, fazer, ganho, custo, onda, fs]) => `| ${id} | **${t}** | ${celula(hoje)} | ${celula(fazer)} | ${celula(ganho)} | ${celula(custo)} | ${onda} | ${fs.map((k) => `[${fontesAssistentes[k][0]}](${fontesAssistentes[k][1]})`).join('; ')} |`).join('\n')}

As fontes sobre o Gemini são de imprensa e de fórum (não achei documento oficial sobre o fim das App Actions); sobre a Siri, as páginas da Apple não confirmaram os limites dos App Shortcuts. Reavalie A4 quando o Android 17 sair. De A5 a A8 (um "Hey MeUsMe" próprio com overlay), a regra do microfone em primeiro plano vem da documentação do Android; o fim do plano gratuito da Porcupine, o comportamento da voz no WebView2 e as regras do iPhone vêm de relatos de usuários, fórum e fornecedores.

## Integração com apps de automação (ideia)

Pesquisa de 02/11/2026, a partir de A1 e V03. **É só uma ideia, sem decisão:** não tem onda e não entra em nenhuma fase até você decidir.

| # | Item | Situação hoje | A ideia | Ganho para você | Custo ou risco | Fonte |
|---|---|---|---|---|---|---|
${automacao.map(([id, t, hoje, ideia, ganho, custo, fs]) => `| ${id} | **${t}** | ${celula(hoje)} | ${celula(ideia)} | ${celula(ganho)} | ${celula(custo)} | ${fs.map((k) => `[${fontesAutomacao[k][0]}](${fontesAutomacao[k][1]})`).join('; ')} |`).join('\n')}

Não achei documentação oficial do MacroDroid nem do Automate sobre plugins no padrão Locale; o suporte deles vem de desenvolvedores de outros apps. A regra do Android 14 vem de imprensa e de guias de desenvolvedor, não da página oficial. Webhooks pela internet (IFTTT, Zapier) ficam de fora, porque exigem servidor (D1).

## 30 vantagens deles que o MeUsMe ainda não tem

${tabela(D.vantagens, 'O que se sabe')}
## 30 desvantagens deles que o MeUsMe pode transformar em diferencial

${tabela(D.desvantagens, 'Onde tropeçam')}
## O que já existe (descartado)

| No MeUsMe | Equivale a |
|---|---|
${D.jaTem.map(([a, b]) => `| ${a} | ${b} |`).join('\n')}

## Na reserva (boas ideias fora das 60)

${D.reserva.map((r) => `- ${r}`).join('\n')}

## Limites desta pesquisa

- A maioria das fontes são blogs de comparação e páginas dos próprios fabricantes, com interesse comercial. Onde há mais de uma fonte, o item é mais confiável; onde há só a página do fabricante, é o que ele diz de si.
- Os apps não foram instalados nem testados. Preços e planos mudam rápido.
- Todo item tem ao menos uma fonte sobre concorrentes, mas ${todas.filter((i) => i.fontes.length === 1).length} dos ${todas.length} têm uma só: leia esses com mais cautela. Alguns apoiam-se em texto de ajuda do próprio fabricante, em pedidos de usuários ou em conselhos da comunidade (D09, D10); a lacuna do MeUsMe vem sempre do código.
- O que o MeUsMe já tem foi conferido no código em 30/10/2026 (ex.: não há busca global, soneca de lembrete, parcelas, cartão, subtarefas, prazo em passos nem gráficos além das barras do mês).
- O cruzamento com o perfil é uma leitura minha de 61 mensagens suas e 7 respostas no Code e dos 36 chats do claude.ai e de 1 tarefa do Cowork (31/10/2026): 4 lidos por inteiro e 33 de trabalho técnico, com a prosa e o código e os logs colados lidos (segredos, endereços, números longos e textos entre aspas trocados por marcadores) e os anexos, as imagens e as ferramentas usadas analisados por contagem, sem ler credenciais e nomes de cliente. Mostra o que você escreveu, não o que você faz no app: o uso real só começa na fase 1. Itens sem sinal ficam na onda 3 para você, mas podem valer para outras pessoas.

## Fontes

${[...Object.values(D.fontes), ...Object.values(fontesAssistentes), ...Object.values(fontesAutomacao)].map(([t, u]) => `- [${t}](${u})`).join('\n')}
`
conferirTabelas('CONCORRENTES.md', md)
writeFileSync(`${saida}/CONCORRENTES.md`, md)

// ---- bloco do ROADMAP (entre marcadores; o arquivo usa CRLF) ----
const tabelaSinais = Object.entries(P1.sinais).map(([k, [texto, onde, pede]]) => `| ${k} | ${celula(texto)} | ${onde} | ${celula(pede)} |`).join('\n')
const tabelaFuncoes = P1.funcoes.map(([f, ajuda, custa, vered]) => `| **${f}** | ${celula(ajuda)} | ${celula(custa)} | ${celula(vered)} |`).join('\n')
const tabelaTensoes = P1.tensoes.map(([t, s, r]) => `| ${t} | ${s} | ${r} |`).join('\n')
const listaLacunas = P1.lacunas.map(([k, t, ev, o]) => `- **${k} · ${t}.** ${ev} ${o}`).join('\n')
const bloco = `<!-- perfil:início -->
## Seu perfil e o que ele muda

Leitura de 31/10/2026 do que você escreveu e decidiu, usada para conferir cada função do app e cada ideia de [CONCORRENTES.md](CONCORRENTES.md) e escolher o que fazer primeiro. Não é uma avaliação sobre você.

**De onde vem.** As 61 mensagens suas e as 7 respostas de múltipla escolha da sessão do Code (5 a 31/10, no horário de Brasília; é a única sessão guardada neste computador), as memórias do projeto, os 36 chats do claude.ai (as abas Arquivado e Compartilhadas estão vazias) e a tarefa do Cowork "Design system", que li por inteiro e só confirma o que o projeto já registra: o MegUI como fonte única do visual. Dos chats, três eu li por inteiro: agenda e tarefas (setembro), marca pessoal e uma ferramenta de trabalho, esta só para ver como você pede e confere, sem usar o conteúdo. Os outros 33 são trabalho técnico (bancos de dados, Delphi, Windows): li a prosa das suas mensagens e o código e os logs que você colou, com segredos, endereços, números longos e textos entre aspas trocados por marcadores; os anexos, as imagens e as ferramentas que o Claude usou eu analisei por contagem. Credenciais e nomes de cliente eu não li, porque não ajudam o perfil e a ferramenta os bloqueia; nada disso foi copiado para estes documentos. Também não analisei o texto das respostas do Claude: o perfil é seu, e delas usei só a contagem de ferramentas. Não há conteúdo de organização pessoal ali (a busca por agenda, prioridade, rotina e foco só achou falsos positivos, como o "Agendador de Tarefas" do Windows), mas há traços de como você trabalha, usados em D6 a D10, e números de uso (horário, tamanho). A sessão do Code é a única no disco; o Cowork não tem sessões locais. Não vi outros computadores.

### Sinais, com a evidência

Como você usa (U) e como você constrói (D). Os códigos aparecem nas tabelas de [CONCORRENTES.md](CONCORRENTES.md#cruzamento-com-o-seu-perfil).

| # | O que você disse ou fez | Fonte | O que isso pede do app |
|---|---|---|---|
${tabelaSinais}

### Tensões a decidir

| Tensão | Sinais | Como o roadmap trata |
|---|---|---|
${tabelaTensoes}

### Lacunas que nenhum concorrente cobre

${listaLacunas}

### Função por função: vantagens e desvantagens para você

O que o app já tem, visto pelo seu perfil. Quando o item citado é de [CONCORRENTES.md](CONCORRENTES.md), a tabela dele diz ganho, custo e esforço.

| Função | Ajuda você porque | Custa ou arrisca | Veredicto |
|---|---|---|---|
${tabelaFuncoes}

### O que muda nas fases

- **Fase 1 (uso real).**
  - Conecte a agenda compartilhada de verdade e anote se os compromissos da equipe aparecem: hoje o app lê só a principal (L1).
  - Ao anotar falhas na captura de gastos pelas notificações do banco, use as cinco que você mesmo listou em 28/10: o banco não gerou aviso, o gasto não apareceu, foi lido errado, veio duplicado, foi para a Caixa. Isso alimenta D25 e D26.
  - Confira se a compra no cartão e o pagamento da fatura contam duas vezes no "livre por dia" antes de construir V23.
  - Teste a voz e os lembretes no celular de verdade (hoje só no emulador): se algum lembrete falhar sem aviso, D23 (diagnóstico) sobe para a onda 1.
- **Fase 2 (robustez).** Some D23 (diagnóstico de lembretes), D20 (exportar em formatos abertos), D21 (backup automático) e D24 (desempenho no CI). A mesclagem campo a campo (D19, dívida 2) só se a fase 1 mostrar conflito de verdade. A migração para IndexedDB (dívida 1) é a parte do código mais próxima do que você já domina, bancos locais e consultas (D2, D9): bom candidato para você escrever.
- **Fase 3 (produto para outras pessoas).**
  - Open Finance: em 28/10 você disse que ele exige robustez empresarial e que quer evitar infraestrutura gigante; a recomendação é não contratar o plano comercial e ficar com notificações, OFX ou CSV e saúde da conexão (D25).
  - Google Agenda: decida entre a verificação do Google e o .ics só depois de conferir a sua permissão na agenda da equipe; um .ics não ajuda se você não a administra.
  - Perfis prontos e módulos (D13, D14) antes de convidar outras pessoas, e a decisão do que fica sempre gratuito (D22, decidida: ver [Modelo de preço](#modelo-de-preço)).
- **Captura por assistente de voz** ([CONCORRENTES.md](CONCORRENTES.md#captura-por-assistente-de-voz-gemini-e-siri)).
  - Agora (A1): link e atalho do app "Capturar por voz", para "Hey Google, abrir MeUsMe" cair direto na gravação. Entra junto com V03.
  - Fase 8, iPhone (A3): App Shortcut "Anotar no MeUsMe" com App Intents. O Atalho do iPhone que dita e abre um link (A2) é o degrau mais barato antes disso.
  - Gemini (A4): não está aberto para o MeUsMe hoje. O AppFunctions roda no aparelho e combina com o app; reavaliar quando o Android 17 sair. A Connected Apps Platform fica de fora, porque exige servidor.
  - "Hey MeUsMe" com overlay: no Android, primeiro o MeUsMe como assistente digital padrão (A5, onda 2), que abre a captura por cima de qualquer app pelo gesto, sem microfone sempre aberto. A palavra de ativação sempre ligada (A6 no Android, A7 no Windows) fica opcional, desligada por padrão e na onda 3. No iPhone não dá (A8): o Botão de Ação dispara o atalho de A3.
- **Apps de automação** (Tasker, MacroDroid, Automate, AutoHotkey): só ideia, sem decisão e fora das fases ([CONCORRENTES.md](CONCORRENTES.md#integração-com-apps-de-automação-ideia)). O link meusme://captura já serve a eles hoje (AU1).
- **Feito em 2/11/2026 (branch onda1):** toda a onda 1 pelo seu perfil (${[...FEITOS].filter((x) => P2.itens[x]?.onda === 1).join(', ')}) e o atalho de voz A1, mais V07, V08, V12, V24, D27 e D23 da onda 1 da pesquisa; D01 e D02 (montar e refazer o dia) e V18 (Feito e soneca na notificação do lembrete, só no Android) no mesmo dia, depois do merge. Ficam da onda 1 da pesquisa: V01 e V23.
- **Ordem pelo seu nível.** Da onda 1 para você, ${juntar(soTs1)} são só TypeScript e React; ${juntar(google1)} pede a trilha 9; ${juntar(android1)} pedem a trilha 10. D03 é regra, sem código novo.
- **Regra de entrada.** Cada item só vira tarefa em [TAREFAS.md](TAREFAS.md) com linha de chegada medível e um teste, do jeito que você já cobra.
<!-- perfil:fim -->
`

let rm = readFileSync(`${saida}/ROADMAP.md`, 'utf8').replace(/\r\n/g, '\n')
const ini = rm.indexOf('<!-- perfil:início -->')
const fim = rm.indexOf('<!-- perfil:fim -->')
if (ini >= 0 && fim > ini) rm = rm.slice(0, ini) + bloco.trimEnd() + rm.slice(fim + '<!-- perfil:fim -->'.length)
else {
  const ancora = '\n---\n\n## Fases'
  if (!rm.includes(ancora)) throw new Error('âncora das fases não encontrada')
  rm = rm.replace(ancora, `\n---\n\n${bloco}\n---\n\n## Fases`)
}
const antigo = 'Ideias de produto vindas de uma pesquisa com 30 vantagens e 30 desvantagens de concorrentes (só o que o MeUsMe ainda não tem), em ondas: [CONCORRENTES.md](CONCORRENTES.md) e o [mapa mental](mapa-concorrentes.html).'
const novo = 'Ideias de produto vindas de uma pesquisa com 30 vantagens e 30 desvantagens de concorrentes (só o que o MeUsMe ainda não tem), em ondas e cruzadas com o seu perfil (seção [Seu perfil e o que ele muda](#seu-perfil-e-o-que-ele-muda)): [CONCORRENTES.md](CONCORRENTES.md) e o [mapa mental](mapa-concorrentes.html).'
if (rm.includes(antigo)) rm = rm.replace(antigo, novo)
else if (!rm.includes(novo)) throw new Error('parágrafo de CONCORRENTES não encontrado no ROADMAP')
conferirTabelas('ROADMAP.md', rm)
writeFileSync(`${saida}/ROADMAP.md`, rm.replace(/\n/g, '\r\n'))

console.log({ nV, nD, ondasPesquisa: [porOnda(1), porOnda(2), porOnda(3)], ondasPerfil: [porOndaP(1), porOndaP(2), porOndaP(3)], encaixe: [porEncaixe('alto'), porEncaixe('medio'), porEncaixe('baixo')], sobem: subiram.length, descem: desceram.length })
