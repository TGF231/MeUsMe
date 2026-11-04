/* MegUI — componentes React (ESM), gerado de components/src/*.tsx. Use com components/bundle.css e os tokens. */

// src/core/Botao.tsx
import * as React from "react";

// src/util.ts
function cx(...partes) {
  return partes.filter(Boolean).join(" ");
}

// src/core/Botao.tsx
function Botao({ variante = "padrao", densidade = "normal", icone, largura, type = "button", className, style, children, ...resto }) {
  return /* @__PURE__ */ React.createElement(
    "button",
    {
      type,
      className: cx("mg-botao", variante !== "padrao" && `mg-botao--${variante}`, densidade === "compacta" && "mg-botao--compacta", className),
      style: largura !== void 0 ? { width: largura, ...style } : style,
      ...resto
    },
    icone,
    children
  );
}

// src/core/Rotulo.tsx
import * as React2 from "react";
function Rotulo({ papel = "corpo", as: Tag = "span", className, children, ...resto }) {
  return /* @__PURE__ */ React2.createElement(Tag, { className: cx("mg-rotulo", papel !== "corpo" && `mg-rotulo--${papel}`, className), ...resto }, children);
}

// src/core/Divisor.tsx
import * as React3 from "react";
function Divisor({ vertical = false, margem = 0, forte = false, className, style, ...resto }) {
  const estilo = { "--mg-margem": `${margem}px`, ...style };
  return /* @__PURE__ */ React3.createElement(
    "div",
    {
      role: "separator",
      "aria-orientation": vertical ? "vertical" : "horizontal",
      className: cx("mg-divisor", vertical && "mg-divisor--vertical", forte && "mg-divisor--forte", className),
      style: estilo,
      ...resto
    }
  );
}

// src/core/BotaoJanela.tsx
import * as React4 from "react";
function BotaoJanela({ titulo, perigo = false, className, children, ...resto }) {
  return /* @__PURE__ */ React4.createElement("button", { type: "button", title: titulo, "aria-label": titulo, className: cx("mg-botao-janela", perigo && "mg-botao-janela--perigo", className), ...resto }, children);
}

// src/forms/Campo.tsx
import * as React5 from "react";
function Campo({ mono = false, densidade = "normal", invalido = false, somenteLeitura = false, largura, type = "text", className, style, ...resto }) {
  return /* @__PURE__ */ React5.createElement(
    "input",
    {
      type,
      readOnly: somenteLeitura,
      "aria-invalid": invalido || void 0,
      className: cx("mg-campo", mono && "mg-campo--mono", densidade === "compacta" && "mg-campo--compacta", somenteLeitura && "mg-campo--somente-leitura", invalido && "mg-campo--invalido", className),
      style: largura !== void 0 ? { width: largura, ...style } : style,
      ...resto
    }
  );
}

// src/forms/Selecao.tsx
import * as React6 from "react";
function Selecao({ opcoes = [], densidade = "normal", largura, className, style, ...resto }) {
  return /* @__PURE__ */ React6.createElement(
    "select",
    {
      className: cx("mg-selecao", densidade === "compacta" && "mg-selecao--compacta", className),
      style: largura !== void 0 ? { width: largura, ...style } : style,
      ...resto
    },
    opcoes.map((o) => {
      const valor = typeof o === "string" ? o : o.valor;
      const texto = typeof o === "string" ? o : o.texto;
      return /* @__PURE__ */ React6.createElement("option", { key: valor, value: valor }, texto);
    })
  );
}

// src/forms/Caixa.tsx
import * as React7 from "react";
function Caixa({ marcada = false, disabled = false, onChange, className, style, children, ...resto }) {
  return /* @__PURE__ */ React7.createElement("label", { className: cx("mg-caixa", disabled && "mg-caixa--desabilitada", className), style }, /* @__PURE__ */ React7.createElement("input", { type: "checkbox", checked: marcada, disabled, onChange: onChange != null ? onChange : () => {
  }, ...resto }), /* @__PURE__ */ React7.createElement("span", { className: "mg-caixa__marca", "aria-hidden": "true" }, /* @__PURE__ */ React7.createElement("svg", { width: "10", height: "10", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "3", strokeLinecap: "round" }, /* @__PURE__ */ React7.createElement("path", { d: "M20 6 9 17l-5-5" }))), children);
}

// src/forms/Opcao.tsx
import * as React8 from "react";
function Opcao({ marcada = false, disabled = false, onChange, className, style, children, ...resto }) {
  return /* @__PURE__ */ React8.createElement("label", { className: cx("mg-opcao", disabled && "mg-opcao--desabilitada", className), style }, /* @__PURE__ */ React8.createElement("input", { type: "radio", checked: marcada, disabled, onChange: onChange != null ? onChange : () => {
  }, ...resto }), /* @__PURE__ */ React8.createElement("span", { className: "mg-opcao__marca", "aria-hidden": "true" }), children);
}

// src/forms/Grupo.tsx
import * as React9 from "react";
function Grupo({ titulo, className, children, ...resto }) {
  return /* @__PURE__ */ React9.createElement("fieldset", { className: cx("mg-grupo", className), ...resto }, titulo && /* @__PURE__ */ React9.createElement("legend", null, titulo), children);
}

// src/dados/Tabela.tsx
import * as React10 from "react";
function Tabela({ colunas = [], linhas = [], selecionada, densidade = "normal", aoSelecionar, className, ...resto }) {
  return /* @__PURE__ */ React10.createElement("div", { className: cx("mg-tabela", densidade === "compacta" && "mg-tabela--compacta", aoSelecionar && "mg-tabela--selecionavel", className), ...resto }, /* @__PURE__ */ React10.createElement("table", null, /* @__PURE__ */ React10.createElement("thead", null, /* @__PURE__ */ React10.createElement("tr", null, colunas.map((c) => /* @__PURE__ */ React10.createElement("th", { key: c.chave, scope: "col", className: cx(c.numerica && "mg-col--numerica"), style: c.largura !== void 0 ? { width: c.largura } : void 0 }, c.titulo)))), /* @__PURE__ */ React10.createElement("tbody", null, linhas.map((l, i) => {
    var _a;
    return /* @__PURE__ */ React10.createElement("tr", { key: (_a = l.id) != null ? _a : i, "aria-selected": selecionada === i || void 0, onClick: aoSelecionar ? () => aoSelecionar(i) : void 0 }, colunas.map((c) => /* @__PURE__ */ React10.createElement(
      "td",
      {
        key: c.chave,
        className: cx(
          c.numerica && "mg-col--numerica",
          c.mono && "mg-col--mono",
          c.somenteLeitura && "mg-col--somente-leitura",
          l.divergente && c.estado && "mg-celula--divergente"
        ) || void 0
      },
      l[c.chave]
    )));
  }))));
}

// src/dados/Lista.tsx
import * as React11 from "react";
function Lista({ itens = [], selecionado, aoSelecionar, className, ...resto }) {
  return /* @__PURE__ */ React11.createElement("div", { role: "listbox", className: cx("mg-lista", aoSelecionar && "mg-lista--selecionavel", className), ...resto }, itens.map((it, i) => {
    var _a;
    const obj = typeof it === "string" ? { rotulo: it } : it;
    const estilo = "nivel" in obj && obj.nivel ? { "--mg-nivel": obj.nivel } : void 0;
    return /* @__PURE__ */ React11.createElement(
      "div",
      {
        key: typeof it === "string" ? i : (_a = it.id) != null ? _a : i,
        role: "option",
        "aria-selected": selecionado === i,
        className: "mg-lista__item",
        style: estilo,
        onClick: aoSelecionar ? () => aoSelecionar(i) : void 0
      },
      /* @__PURE__ */ React11.createElement("span", { className: "mg-lista__texto" }, /* @__PURE__ */ React11.createElement("span", { className: "mg-lista__rotulo" }, obj.rotulo), "dica" in obj && obj.dica && /* @__PURE__ */ React11.createElement("span", { className: "mg-lista__dica" }, obj.dica)),
      "valor" in obj && obj.valor !== void 0 && /* @__PURE__ */ React11.createElement("span", { className: cx("mg-lista__valor", obj.divergente && "mg-lista__valor--divergente") }, obj.valor)
    );
  }));
}

// src/dados/FaixaNivel.tsx
import * as React12 from "react";
function FaixaNivel({ niveis = [], aoEscolher, className, ...resto }) {
  const visiveis = niveis.length > 3 ? niveis.slice(niveis.length - 3) : niveis;
  const ocultos = niveis.length - visiveis.length;
  return /* @__PURE__ */ React12.createElement("div", { className: cx("mg-faixa-nivel", className), ...resto }, ocultos > 0 && /* @__PURE__ */ React12.createElement("div", { className: "mg-faixa-nivel__trilha" }, niveis.slice(0, ocultos).map((n) => {
    var _a;
    return (_a = n.itens.find((i) => i.ativo)) == null ? void 0 : _a.rotulo;
  }).filter(Boolean).join("  ›  "), /* @__PURE__ */ React12.createElement("span", null, "›")), visiveis.map((n, ni) => {
    var _a;
    return /* @__PURE__ */ React12.createElement("div", { key: (_a = n.rotulo) != null ? _a : ni, className: "mg-faixa-nivel__linha" }, /* @__PURE__ */ React12.createElement("div", { className: "mg-faixa-nivel__rotulo" }, n.rotulo), /* @__PURE__ */ React12.createElement("div", { className: "mg-faixa-nivel__itens" }, n.itens.map((it) => /* @__PURE__ */ React12.createElement(
      "button",
      {
        key: it.rotulo,
        type: "button",
        "aria-pressed": !!it.ativo,
        className: cx("mg-faixa-nivel__item", it.ativo && "mg-faixa-nivel__item--ativo"),
        onClick: aoEscolher ? () => aoEscolher(n.rotulo, it.rotulo) : void 0
      },
      it.rotulo
    ))));
  }));
}

// src/dados/AbasPlanilha.tsx
import * as React13 from "react";
function AbasPlanilha({ abas = [], ativa = 0, aoTrocar, className, ...resto }) {
  return /* @__PURE__ */ React13.createElement("div", { role: "tablist", className: cx("mg-abas-planilha", className), ...resto }, /* @__PURE__ */ React13.createElement("div", { className: "mg-abas-planilha__rolagem", "aria-hidden": "true" }, /* @__PURE__ */ React13.createElement("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.5", strokeLinecap: "round" }, /* @__PURE__ */ React13.createElement("path", { d: "M15 6l-6 6 6 6" })), /* @__PURE__ */ React13.createElement("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.5", strokeLinecap: "round" }, /* @__PURE__ */ React13.createElement("path", { d: "M9 6l6 6-6 6" }))), abas.map((a, i) => {
    const vazia = a.contagem === 0;
    return /* @__PURE__ */ React13.createElement(
      "button",
      {
        key: a.rotulo,
        type: "button",
        role: "tab",
        "aria-selected": ativa === i,
        disabled: vazia,
        className: "mg-abas-planilha__aba",
        onClick: aoTrocar && !vazia ? () => aoTrocar(i) : void 0
      },
      /* @__PURE__ */ React13.createElement("span", null, a.rotulo),
      /* @__PURE__ */ React13.createElement("span", { className: "mg-abas-planilha__contagem" }, a.contagem)
    );
  }));
}

// src/navegacao/Janela.tsx
import * as React14 from "react";
function Janela({ barra, abas, faixas, acoes, rodape, acao, altura = 520, className, style, children, ...resto }) {
  const tela = altura === "tela";
  const estilo = tela ? { ...style } : { "--mg-altura": typeof altura === "number" ? `${altura}px` : altura, ...style };
  return /* @__PURE__ */ React14.createElement("div", { className: cx("mg-janela", tela && "mg-janela--tela", className), style: estilo, ...resto }, barra, abas, faixas, /* @__PURE__ */ React14.createElement("div", { className: "mg-janela__conteudo" }, acoes, /* @__PURE__ */ React14.createElement("div", { className: cx("mg-janela__rolavel", !!acao && "mg-janela__rolavel--com-acao") }, children), acao), rodape);
}

// src/navegacao/BarraTitulo.tsx
import * as React16 from "react";

// src/navegacao/BuscaModular.tsx
import * as React15 from "react";
function BuscaModular({ placeholder = "Buscar", largura = 180, aoBuscar, className, style, ...resto }) {
  return /* @__PURE__ */ React15.createElement("div", { className: cx("mg-busca", className), style: { width: largura, ...style }, ...resto }, /* @__PURE__ */ React15.createElement("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.5", strokeLinecap: "round", "aria-hidden": "true" }, /* @__PURE__ */ React15.createElement("circle", { cx: "11", cy: "11", r: "7" }), /* @__PURE__ */ React15.createElement("path", { d: "M20 20 16 16" })), /* @__PURE__ */ React15.createElement("input", { type: "search", placeholder, "aria-label": placeholder, onChange: aoBuscar ? (e) => aoBuscar(e.target.value) : void 0 }));
}

// src/navegacao/BarraTitulo.tsx
function BarraTitulo({ app, contexto, busca, informacao, retrato = false, aoAbrirMenu, aoBuscar, controles = true, aoMinimizar, aoMaximizar, aoFechar, className, ...resto }) {
  return /* @__PURE__ */ React16.createElement("div", { className: cx("mg-barra-titulo", className), ...resto }, retrato && /* @__PURE__ */ React16.createElement(BotaoJanela, { titulo: "Abrir menu", onClick: aoAbrirMenu }, /* @__PURE__ */ React16.createElement("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.5", strokeLinecap: "round" }, /* @__PURE__ */ React16.createElement("path", { d: "M4 6h16M4 12h16M4 18h16" }))), /* @__PURE__ */ React16.createElement("span", { className: "mg-barra-titulo__app" }, app), contexto && /* @__PURE__ */ React16.createElement("span", { className: "mg-barra-titulo__contexto" }, contexto), /* @__PURE__ */ React16.createElement("div", { className: "mg-espaco" }), busca && /* @__PURE__ */ React16.createElement(BuscaModular, { placeholder: busca, aoBuscar }), !busca && informacao && /* @__PURE__ */ React16.createElement("span", { className: "mg-barra-titulo__informacao" }, informacao), controles && /* @__PURE__ */ React16.createElement("div", { className: "mg-barra-titulo__controles" }, /* @__PURE__ */ React16.createElement(BotaoJanela, { titulo: "Minimizar", onClick: aoMinimizar }, /* @__PURE__ */ React16.createElement("svg", { width: "10", height: "10", viewBox: "0 0 10 10", fill: "none", stroke: "currentColor", strokeWidth: "1" }, /* @__PURE__ */ React16.createElement("path", { d: "M1 5h8" }))), /* @__PURE__ */ React16.createElement(BotaoJanela, { titulo: "Maximizar", onClick: aoMaximizar }, /* @__PURE__ */ React16.createElement("svg", { width: "10", height: "10", viewBox: "0 0 10 10", fill: "none", stroke: "currentColor", strokeWidth: "1" }, /* @__PURE__ */ React16.createElement("rect", { x: "1.5", y: "1.5", width: "7", height: "7" }))), /* @__PURE__ */ React16.createElement(BotaoJanela, { titulo: "Fechar", perigo: true, onClick: aoFechar }, /* @__PURE__ */ React16.createElement("svg", { width: "10", height: "10", viewBox: "0 0 10 10", fill: "none", stroke: "currentColor", strokeWidth: "1" }, /* @__PURE__ */ React16.createElement("path", { d: "M1.5 1.5l7 7M8.5 1.5l-7 7" })))));
}

// src/navegacao/FaixaAbas.tsx
import * as React17 from "react";
function FaixaAbas({ abas = [], ativa = 0, aoTrocar, aoFechar, aoAdicionar, className, ...resto }) {
  return /* @__PURE__ */ React17.createElement("div", { role: "tablist", className: cx("mg-faixa-abas", className), ...resto }, abas.map((a, i) => {
    const rotulo = typeof a === "string" ? a : a.rotulo;
    return /* @__PURE__ */ React17.createElement("div", { key: rotulo, role: "tab", "aria-selected": ativa === i, tabIndex: ativa === i ? 0 : -1, className: "mg-aba", onClick: aoTrocar ? () => aoTrocar(i) : void 0 }, /* @__PURE__ */ React17.createElement("span", { className: "mg-aba__rotulo" }, rotulo), /* @__PURE__ */ React17.createElement(
      "span",
      {
        role: "button",
        "aria-label": `Fechar ${rotulo}`,
        className: "mg-aba__fechar",
        onClick: aoFechar ? (e) => {
          e.stopPropagation();
          aoFechar(i);
        } : void 0
      },
      "✕"
    ));
  }), aoAdicionar && /* @__PURE__ */ React17.createElement("button", { type: "button", "aria-label": "Nova aba", className: "mg-faixa-abas__nova", onClick: aoAdicionar }, /* @__PURE__ */ React17.createElement("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.5", strokeLinecap: "round" }, /* @__PURE__ */ React17.createElement("path", { d: "M12 5v14M5 12h14" }))));
}

// src/acoes/BarraAcoes.tsx
import * as React18 from "react";
function BarraAcoes({ contagem, className, children, ...resto }) {
  return /* @__PURE__ */ React18.createElement("div", { className: cx("mg-barra-acoes", className), ...resto }, children, contagem !== void 0 && /* @__PURE__ */ React18.createElement(React18.Fragment, null, /* @__PURE__ */ React18.createElement("div", { className: "mg-espaco" }), /* @__PURE__ */ React18.createElement("span", { className: "mg-barra-acoes__contagem" }, contagem)));
}

// src/acoes/BotaoInterruptor.tsx
import * as React19 from "react";
function BotaoInterruptor({ ligado = false, densidade = "normal", className, children, ...resto }) {
  return /* @__PURE__ */ React19.createElement("button", { type: "button", "aria-pressed": ligado, className: cx("mg-interruptor", densidade === "compacta" && "mg-interruptor--compacta", className), ...resto }, children);
}

// src/acoes/AcaoPrimaria.tsx
import * as React20 from "react";
function AcaoPrimaria({ icone, retrato = false, className, children, ...resto }) {
  return /* @__PURE__ */ React20.createElement("button", { type: "button", className: cx("mg-acao-primaria", retrato && "mg-acao-primaria--retrato", className), ...resto }, icone, /* @__PURE__ */ React20.createElement("span", null, children));
}

// src/acoes/Menu.tsx
import * as React21 from "react";
function Menu({ itens = [], aoEscolher, className, ...resto }) {
  return /* @__PURE__ */ React21.createElement("div", { role: "menu", className: cx("mg-menu", className), ...resto }, itens.map((it, i) => {
    if (it === "-" || typeof it === "object" && it.separador) return /* @__PURE__ */ React21.createElement("div", { key: `sep${i}`, role: "separator", className: "mg-menu__separador" });
    const obj = typeof it === "string" ? { rotulo: it } : it;
    const desligado = "disabled" in obj && obj.disabled;
    return /* @__PURE__ */ React21.createElement(
      "div",
      {
        key: obj.rotulo,
        role: "menuitem",
        tabIndex: desligado ? -1 : 0,
        "aria-disabled": desligado || void 0,
        className: "mg-menu__item",
        onClick: !desligado && aoEscolher ? () => aoEscolher(obj.rotulo) : void 0
      },
      /* @__PURE__ */ React21.createElement("span", null, obj.rotulo),
      "atalho" in obj && obj.atalho && /* @__PURE__ */ React21.createElement("span", { className: "mg-menu__atalho" }, obj.atalho)
    );
  }));
}

// src/estado/Rodape.tsx
import * as React22 from "react";
function Rodape({ estado, situacao = "ok", contagem, versao, className, ...resto }) {
  return /* @__PURE__ */ React22.createElement("div", { className: cx("mg-rodape", className), ...resto }, estado && /* @__PURE__ */ React22.createElement("span", { className: "mg-rodape__estado" }, /* @__PURE__ */ React22.createElement("span", { className: cx("mg-rodape__ponto", situacao !== "neutro" && `mg-rodape__ponto--${situacao}`), "aria-hidden": "true" }), estado), contagem && /* @__PURE__ */ React22.createElement("span", { className: "mg-rodape__contagem" }, contagem), /* @__PURE__ */ React22.createElement("div", { className: "mg-espaco" }), versao && /* @__PURE__ */ React22.createElement("span", { className: "mg-rodape__versao" }, versao));
}

// src/estado/Progresso.tsx
import * as React23 from "react";
function Progresso({ valor = 0, rotulo, indeterminado = false, className, style, ...resto }) {
  const pct = Math.max(0, Math.min(100, valor));
  const estilo = { "--mg-valor": `${pct}%`, ...style };
  return /* @__PURE__ */ React23.createElement("div", { className: cx("mg-progresso", indeterminado && "mg-progresso--indeterminado", className), style: estilo, ...resto }, rotulo && /* @__PURE__ */ React23.createElement("div", { className: "mg-progresso__rotulo" }, /* @__PURE__ */ React23.createElement("span", null, rotulo), !indeterminado && /* @__PURE__ */ React23.createElement("span", { className: "mg-progresso__pct" }, pct, "%")), /* @__PURE__ */ React23.createElement("div", { className: "mg-progresso__trilho", role: "progressbar", "aria-valuenow": indeterminado ? void 0 : pct, "aria-valuemin": 0, "aria-valuemax": 100, "aria-label": rotulo }, /* @__PURE__ */ React23.createElement("div", { className: "mg-progresso__barra" })));
}

// src/estado/Dica.tsx
import * as React24 from "react";
function Dica({ texto, className, children, ...resto }) {
  return /* @__PURE__ */ React24.createElement("span", { className: cx("mg-dica", className), ...resto }, children, /* @__PURE__ */ React24.createElement("span", { role: "tooltip", className: "mg-dica__balao" }, texto));
}

// src/estado/Dialogo.tsx
import * as React25 from "react";
function Dialogo({ titulo, acoes = [], aoFechar, largura = 420, className, style, children, ...resto }) {
  return /* @__PURE__ */ React25.createElement("div", { role: "dialog", "aria-modal": "true", "aria-label": titulo, className: cx("mg-dialogo", className), style: { width: largura, ...style }, ...resto }, /* @__PURE__ */ React25.createElement("div", { className: "mg-dialogo__barra" }, /* @__PURE__ */ React25.createElement("span", { className: "mg-dialogo__titulo" }, titulo), /* @__PURE__ */ React25.createElement("div", { className: "mg-espaco" }), /* @__PURE__ */ React25.createElement("button", { type: "button", "aria-label": "Fechar", className: "mg-dialogo__fechar", onClick: aoFechar }, "✕")), /* @__PURE__ */ React25.createElement("div", { className: "mg-dialogo__corpo" }, children), acoes.length > 0 && /* @__PURE__ */ React25.createElement("div", { className: "mg-dialogo__acoes" }, acoes.map((a) => {
    var _a;
    return /* @__PURE__ */ React25.createElement(Botao, { key: a.rotulo, variante: (_a = a.variante) != null ? _a : "padrao", onClick: a.aoClicar }, a.rotulo);
  })));
}

// src/telas/TelaEscrituracao.tsx
import * as React26 from "react";
var COLUNAS = [
  { chave: "reg", titulo: "REG", largura: 80, mono: true },
  { chave: "doc", titulo: "Documento", largura: 120 },
  { chave: "part", titulo: "Participante" },
  { chave: "valor", titulo: "Valor", largura: 110, numerica: true },
  { chave: "situacao", titulo: "Situação", largura: 100, estado: true }
];
var DOCUMENTOS = [
  { id: 1, reg: "C100", doc: "NF-e 48.221", part: "COMERCIAL SÃO JOÃO LTDA", valor: "12.480,00", situacao: "Regular", filhos: [{ rotulo: "C170", contagem: 7 }, { rotulo: "C190", contagem: 3 }, { rotulo: "C101", contagem: 0 }, { rotulo: "C110", contagem: 2 }] },
  { id: 2, reg: "C100", doc: "NF-e 48.222", part: "DISTRIBUIDORA NORTE SA", valor: "8.924,40", situacao: "Regular", filhos: [{ rotulo: "C170", contagem: 4 }, { rotulo: "C190", contagem: 2 }, { rotulo: "C101", contagem: 0 }, { rotulo: "C110", contagem: 0 }] },
  { id: 3, reg: "C100", doc: "NF-e 48.223", part: "ATACADO CENTRAL EIRELI", valor: "21.049,90", situacao: "Divergente", divergente: true, filhos: [{ rotulo: "C170", contagem: 12 }, { rotulo: "C190", contagem: 5 }, { rotulo: "C101", contagem: 1 }, { rotulo: "C110", contagem: 3 }] },
  { id: 4, reg: "C100", doc: "NF-e 48.224", part: "MERCADO BOM PREÇO ME", valor: "6.482,20", situacao: "Regular", filhos: [{ rotulo: "C170", contagem: 2 }, { rotulo: "C190", contagem: 1 }, { rotulo: "C101", contagem: 0 }, { rotulo: "C110", contagem: 0 }] },
  { id: 5, reg: "C100", doc: "NF-e 48.225", part: "LOGÍSTICA SUL LTDA", valor: "34.127,50", situacao: "Regular", filhos: [{ rotulo: "C170", contagem: 9 }, { rotulo: "C190", contagem: 4 }, { rotulo: "C101", contagem: 0 }, { rotulo: "C110", contagem: 1 }] }
];
var ABAS = [
  { rotulo: "Escrituração", busca: "Buscar em C100" },
  { rotulo: "Cadastro 0150", busca: "Buscar participante" },
  { rotulo: "Apuração", informacao: "competência fechada · 31/03" }
];
function TelaEscrituracao() {
  const [aba, setAba] = React26.useState(0);
  const [linha, setLinha] = React26.useState(2);
  const [planilha, setPlanilha] = React26.useState(0);
  const [painel, setPainel] = React26.useState(false);
  const atual = ABAS[aba];
  const doc = DOCUMENTOS[linha];
  const divergencias = DOCUMENTOS.filter((d) => d.divergente).length;
  return /* @__PURE__ */ React26.createElement(
    Janela,
    {
      altura: 620,
      barra: /* @__PURE__ */ React26.createElement(
        BarraTitulo,
        {
          app: "SPED Tables",
          contexto: aba === 2 ? "Apuração — março/2026" : "EFD-ICMS 03-2026.txt",
          busca: atual.busca,
          informacao: atual.informacao
        }
      ),
      abas: /* @__PURE__ */ React26.createElement(FaixaAbas, { abas: ABAS.map((a) => a.rotulo), ativa: aba, aoTrocar: setAba, aoFechar: () => {
      }, aoAdicionar: () => {
      } }),
      faixas: aba === 0 ? /* @__PURE__ */ React26.createElement(
        FaixaNivel,
        {
          niveis: [
            { rotulo: "nível 1 · bloco", itens: [{ rotulo: "0" }, { rotulo: "C", ativo: true }, { rotulo: "D" }, { rotulo: "E" }, { rotulo: "G" }, { rotulo: "H" }, { rotulo: "K" }, { rotulo: "9" }] },
            { rotulo: "nível 2 · registro", itens: [{ rotulo: "C001" }, { rotulo: "C100", ativo: true }, { rotulo: "C500" }, { rotulo: "C800" }, { rotulo: "C990" }] },
            { rotulo: "nível 3 · visão", itens: [{ rotulo: "Documentos", ativo: true }, { rotulo: "Itens consolidados" }, { rotulo: "Divergências" }] }
          ]
        }
      ) : null,
      acoes: /* @__PURE__ */ React26.createElement(BarraAcoes, { contagem: `${DOCUMENTOS.length} ${DOCUMENTOS.length === 1 ? "documento" : "documentos"}` }, /* @__PURE__ */ React26.createElement(Botao, null, "Conferir"), /* @__PURE__ */ React26.createElement(Botao, null, "Agrupar"), /* @__PURE__ */ React26.createElement(Divisor, { vertical: true, margem: 4 }), /* @__PURE__ */ React26.createElement(BotaoInterruptor, { ligado: painel, onClick: () => setPainel(!painel) }, "Divergências"), /* @__PURE__ */ React26.createElement(Botao, null, "Exportar CSV")),
      acao: /* @__PURE__ */ React26.createElement(
        AcaoPrimaria,
        {
          icone: /* @__PURE__ */ React26.createElement("svg", { width: "20", height: "20", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.5", strokeLinecap: "round" }, /* @__PURE__ */ React26.createElement("path", { d: "M20 6 9 17l-5-5" }))
        },
        "Validar documento"
      ),
      rodape: /* @__PURE__ */ React26.createElement(
        Rodape,
        {
          estado: divergencias ? `${divergencias} ${divergencias === 1 ? "documento" : "documentos"} com divergência` : "Documento conferido",
          situacao: divergencias ? "erro" : "ok",
          contagem: `${doc.reg} ${doc.doc} · ${doc.filhos[planilha].contagem} ${doc.filhos[planilha].contagem === 1 ? "item" : "itens"}`,
          versao: "2.4.1"
        }
      )
    },
    /* @__PURE__ */ React26.createElement(Tabela, { colunas: COLUNAS, linhas: DOCUMENTOS, selecionada: linha, aoSelecionar: (i) => {
      setLinha(i);
      setPlanilha(0);
    } }),
    /* @__PURE__ */ React26.createElement(AbasPlanilha, { abas: doc.filhos, ativa: planilha, aoTrocar: setPlanilha })
  );
}

// src/telas/TelaSemArquivo.tsx
import * as React27 from "react";
var COLUNAS2 = [
  { chave: "reg", titulo: "REG", largura: 80, mono: true },
  { chave: "doc", titulo: "Documento", largura: 120 },
  { chave: "part", titulo: "Participante" },
  { chave: "valor", titulo: "Valor", largura: 110, numerica: true },
  { chave: "situacao", titulo: "Situação", largura: 100 }
];
function TelaSemArquivo({ aoCarregar }) {
  return /* @__PURE__ */ React27.createElement(
    Janela,
    {
      altura: 420,
      barra: /* @__PURE__ */ React27.createElement(BarraTitulo, { app: "SPED Tables", contexto: "nenhum arquivo" }),
      abas: /* @__PURE__ */ React27.createElement(FaixaAbas, { abas: ["Escrituração"], ativa: 0, aoAdicionar: () => {
      } }),
      acoes: /* @__PURE__ */ React27.createElement(BarraAcoes, null, /* @__PURE__ */ React27.createElement(Botao, { disabled: true }, "Conferir"), /* @__PURE__ */ React27.createElement(Botao, { disabled: true }, "Agrupar"), /* @__PURE__ */ React27.createElement(Botao, { disabled: true }, "Exportar CSV")),
      acao: /* @__PURE__ */ React27.createElement(
        AcaoPrimaria,
        {
          onClick: aoCarregar,
          icone: /* @__PURE__ */ React27.createElement("svg", { width: "20", height: "20", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.5", strokeLinecap: "round" }, /* @__PURE__ */ React27.createElement("path", { d: "M12 3v12M7 10l5 5 5-5M4 20h16" }))
        },
        "Carregar arquivo"
      ),
      rodape: /* @__PURE__ */ React27.createElement(Rodape, { estado: "Aguardando arquivo", situacao: "neutro", contagem: "0 registros", versao: "2.4.1" })
    },
    /* @__PURE__ */ React27.createElement(Tabela, { colunas: COLUNAS2, linhas: [{}, {}, {}, {}, {}, {}] })
  );
}
export {
  AbasPlanilha,
  AcaoPrimaria,
  BarraAcoes,
  BarraTitulo,
  Botao,
  BotaoInterruptor,
  BotaoJanela,
  BuscaModular,
  Caixa,
  Campo,
  Dialogo,
  Dica,
  Divisor,
  FaixaAbas,
  FaixaNivel,
  Grupo,
  Janela,
  Lista,
  Menu,
  Opcao,
  Progresso,
  Rodape,
  Rotulo,
  Selecao,
  Tabela,
  TelaEscrituracao,
  TelaSemArquivo,
  cx
};
