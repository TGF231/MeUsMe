// GERADO de components/src/*.tsx. Tipos de megui-react.mjs.
import * as React$1 from 'react';

/** Junta classes, ignorando falsy. */
export declare function cx(...partes: Array<string | false | null | undefined>): string;
export type Densidade = "normal" | "compacta";
export interface BotaoProps extends Omit<React$1.ButtonHTMLAttributes<HTMLButtonElement>, "type"> {
	/** Variante visual. 'acento' é a ação primária; use uma por tela. */
	variante?: "padrao" | "acento" | "perigo";
	densidade?: Densidade;
	/** Ícone Lucide à esquerda do rótulo. Nunca substitui o rótulo. */
	icone?: React$1.ReactNode;
	largura?: number | string;
	type?: "button" | "submit" | "reset";
}
/**
 * Botão de ação. Três variantes, herdadas do QSS do kit:
 * padrão (QPushButton), acento (role="accent") e perigo (role="perigo").
 */
export declare function Botao({ variante, densidade, icone, largura, type, className, style, children, ...resto }: BotaoProps): React$1.JSX.Element;
export type PapelRotulo = "secao" | "corpo" | "info" | "dica" | "mono" | "ok" | "aviso" | "erro" | "titulo" | "destaque";
export interface RotuloProps extends React$1.HTMLAttributes<HTMLElement> {
	/** Papel visual, herdado da propriedade dinâmica role= do QSS. */
	papel?: PapelRotulo;
	as?: React$1.ElementType;
}
/** Texto com papel visual. Substitui a escolha manual de cor e peso. */
export declare function Rotulo({ papel, as: Tag, className, children, ...resto }: RotuloProps): React$1.JSX.Element;
export interface DivisorProps extends React$1.HTMLAttributes<HTMLDivElement> {
	vertical?: boolean;
	/** Margem no eixo transversal, em px. */
	margem?: number;
	/** Usa border_2 em vez de border — para contorno de widget, não grade. */
	forte?: boolean;
}
/** Linha de 1px. Em MegUI a separação é sempre linha, nunca sombra. */
export declare function Divisor({ vertical, margem, forte, className, style, ...resto }: DivisorProps): React$1.JSX.Element;
export interface BotaoJanelaProps extends Omit<React$1.ButtonHTMLAttributes<HTMLButtonElement>, "title"> {
	/** Nome acessível. Obrigatório: é a única peça sem rótulo visível. */
	titulo: string;
	/** Hover vermelho — só para o botão de fechar. */
	perigo?: boolean;
}
/** Botão só de ícone para controles de janela — a única exceção a "sem ícone sem rótulo". */
export declare function BotaoJanela({ titulo, perigo, className, children, ...resto }: BotaoJanelaProps): React$1.JSX.Element;
export interface CampoProps extends Omit<React$1.InputHTMLAttributes<HTMLInputElement>, "readOnly"> {
	/** Fonte monoespaçada — para numeral, código de registro e documento. */
	mono?: boolean;
	densidade?: Densidade;
	/** Borda em status-bad. Acompanhe de um Rotulo papel="erro" dizendo o quê. */
	invalido?: boolean;
	/** Fundo somente_leitura — célula ou valor derivado. */
	somenteLeitura?: boolean;
	largura?: number | string;
}
/** Campo de texto. Fundo rebaixado, foco em accent_linha. */
export declare function Campo({ mono, densidade, invalido, somenteLeitura, largura, type, className, style, ...resto }: CampoProps): React$1.JSX.Element;
export type OpcaoSelecao = string | {
	valor: string;
	texto: string;
};
export interface SelecaoProps extends React$1.SelectHTMLAttributes<HTMLSelectElement> {
	opcoes?: OpcaoSelecao[];
	densidade?: Densidade;
	largura?: number | string;
}
/** Campo de escolha. Fundo de painel, não rebaixado — escolher não é digitar. */
export declare function Selecao({ opcoes, densidade, largura, className, style, ...resto }: SelecaoProps): React$1.JSX.Element;
export interface CaixaProps extends Omit<React$1.InputHTMLAttributes<HTMLInputElement>, "type" | "checked"> {
	marcada?: boolean;
	children?: React$1.ReactNode;
}
/** Caixa de marcação de 14px, preenchida em acento quando marcada. */
export declare function Caixa({ marcada, disabled, onChange, className, style, children, ...resto }: CaixaProps): React$1.JSX.Element;
export interface OpcaoProps extends Omit<React$1.InputHTMLAttributes<HTMLInputElement>, "type" | "checked"> {
	marcada?: boolean;
	children?: React$1.ReactNode;
}
/** Botão de opção. Única peça redonda do sistema — a forma carrega a semântica de escolha única. */
export declare function Opcao({ marcada, disabled, onChange, className, style, children, ...resto }: OpcaoProps): React$1.JSX.Element;
export interface GrupoProps extends React$1.FieldsetHTMLAttributes<HTMLFieldSetElement> {
	titulo?: string;
}
/** Agrupador com título embutido na borda. Use no lugar de card com sombra. */
export declare function Grupo({ titulo, className, children, ...resto }: GrupoProps): React$1.JSX.Element;
export interface ColunaTabela {
	chave: string;
	titulo: string;
	largura?: number | string;
	/** Alinha à direita e usa mono. */
	numerica?: boolean;
	mono?: boolean;
	somenteLeitura?: boolean;
	/** Esta coluna recebe a cor de divergência quando a linha é divergente. */
	estado?: boolean;
}
/** Valores renderizados como texto; chaves extras (ex.: filhos) são ignoradas. */
export type LinhaTabela = Record<string, unknown> & {
	id?: string | number;
	divergente?: boolean;
};
export interface TabelaProps extends React$1.HTMLAttributes<HTMLDivElement> {
	colunas?: ColunaTabela[];
	linhas?: LinhaTabela[];
	selecionada?: number;
	densidade?: Densidade;
	aoSelecionar?: (indice: number) => void;
}
/** Grade de dado. Linha alternada, seleção em acento suave com o texto preservado. */
export declare function Tabela({ colunas, linhas, selecionada, densidade, aoSelecionar, className, ...resto }: TabelaProps): React$1.JSX.Element;
export type ItemLista = string | {
	id?: string | number;
	rotulo: string;
	dica?: string;
	valor?: string;
	nivel?: number;
	divergente?: boolean;
};
export interface ListaProps extends React$1.HTMLAttributes<HTMLDivElement> {
	itens?: ItemLista[];
	selecionado?: number;
	aoSelecionar?: (indice: number) => void;
}
/** Lista de uma coluna. É no que a Tabela vira em retrato. */
export declare function Lista({ itens, selecionado, aoSelecionar, className, ...resto }: ListaProps): React$1.JSX.Element;
export interface NivelFaixa {
	rotulo: string;
	itens: Array<{
		rotulo: string;
		ativo?: boolean;
	}>;
}
export interface FaixaNivelProps extends React$1.HTMLAttributes<HTMLDivElement> {
	/** Até 5 níveis; os 3 últimos ficam visíveis e os anteriores colapsam em trilha. */
	niveis?: NivelFaixa[];
	aoEscolher?: (nivel: string, item: string) => void;
}
/** Faixas de nível do layout, acima da grade (modelo PVA do SPED). Módulo opcional. */
export declare function FaixaNivel({ niveis, aoEscolher, className, ...resto }: FaixaNivelProps): React$1.JSX.Element;
export interface AbasPlanilhaProps extends React$1.HTMLAttributes<HTMLDivElement> {
	/** Os FILHOS da linha selecionada, com a contagem de cada um. */
	abas?: Array<{
		rotulo: string;
		contagem: number;
	}>;
	ativa?: number;
	aoTrocar?: (indice: number) => void;
}
/** Abas de planilha abaixo da grade (modelo Excel). Contagem zero desabilita, mas a aba continua visível. */
export declare function AbasPlanilha({ abas, ativa, aoTrocar, className, ...resto }: AbasPlanilhaProps): React$1.JSX.Element;
export interface JanelaProps extends React$1.HTMLAttributes<HTMLDivElement> {
	/** BarraTitulo. */
	barra?: React$1.ReactNode;
	/** FaixaAbas — contextos abertos em paralelo, nunca etapas de um fluxo. */
	abas?: React$1.ReactNode;
	/** Faixas de nível, entre as abas e o conteúdo. */
	faixas?: React$1.ReactNode;
	/** BarraAcoes no topo do conteúdo. */
	acoes?: React$1.ReactNode;
	/** Rodape — só informação. */
	rodape?: React$1.ReactNode;
	/** AcaoPrimaria. Quando presente, reserva 64px no fim do conteúdo rolável. */
	acao?: React$1.ReactNode;
	/** Altura da janela; 'tela' ocupa a viewport inteira (app desktop, Tauri). */
	altura?: number | string | "tela";
}
/** Esqueleto de janela MegUI: barra → abas → conteúdo (ações, dado, ação primária) → rodapé. */
export declare function Janela({ barra, abas, faixas, acoes, rodape, acao, altura, className, style, children, ...resto }: JanelaProps): React$1.JSX.Element;
export interface BarraTituloProps extends React$1.HTMLAttributes<HTMLDivElement> {
	app: string;
	/** O que está aberto. É o título da tela — não repita no conteúdo. */
	contexto?: string;
	/** Placeholder da busca. Omita onde não há conteúdo buscável. */
	busca?: string;
	/** Ocupa o espaço da busca quando ela não existe nesta aba. */
	informacao?: string;
	retrato?: boolean;
	aoAbrirMenu?: () => void;
	aoBuscar?: (texto: string) => void;
	/** Controles de janela; passe false quando o sistema já desenha os seus (Tauri com decorations, web). */
	controles?: boolean;
	aoMinimizar?: () => void;
	aoMaximizar?: () => void;
	aoFechar?: () => void;
}
/** Barra de título de 32px. O título da tela vive aqui e em nenhum outro lugar (lei 1). */
export declare function BarraTitulo({ app, contexto, busca, informacao, retrato, aoAbrirMenu, aoBuscar, controles, aoMinimizar, aoMaximizar, aoFechar, className, ...resto }: BarraTituloProps): React$1.JSX.Element;
export interface FaixaAbasProps extends React$1.HTMLAttributes<HTMLDivElement> {
	/** Contextos abertos em paralelo — nunca etapas de um fluxo. */
	abas?: Array<string | {
		rotulo: string;
	}>;
	ativa?: number;
	aoTrocar?: (indice: number) => void;
	aoFechar?: (indice: number) => void;
	aoAdicionar?: () => void;
}
/** Faixa de abas de 32px, no modelo de navegador. O fechar fica sempre à direita. */
export declare function FaixaAbas({ abas, ativa, aoTrocar, aoFechar, aoAdicionar, className, ...resto }: FaixaAbasProps): React$1.JSX.Element;
export interface BuscaModularProps extends Omit<React$1.HTMLAttributes<HTMLDivElement>, "onChange"> {
	placeholder?: string;
	largura?: number | string;
	aoBuscar?: (texto: string) => void;
}
/** Módulo de busca da barra de título. Existe só onde há conteúdo buscável (lei 8). */
export declare function BuscaModular({ placeholder, largura, aoBuscar, className, style, ...resto }: BuscaModularProps): React$1.JSX.Element;
export interface BarraAcoesProps extends React$1.HTMLAttributes<HTMLDivElement> {
	/** Contagem alinhada à direita, em mono. */
	contagem?: string;
}
/** Faixa de ações no topo do conteúdo. Em retrato vira linha rolável — nunca menu. */
export declare function BarraAcoes({ contagem, className, children, ...resto }: BarraAcoesProps): React$1.JSX.Element;
export interface BotaoInterruptorProps extends React$1.ButtonHTMLAttributes<HTMLButtonElement> {
	ligado?: boolean;
	densidade?: Densidade;
}
/** Botão que mantém estado. A moldura de acento enquanto ligado distingue estado de clique que passou. */
export declare function BotaoInterruptor({ ligado, densidade, className, children, ...resto }: BotaoInterruptorProps): React$1.JSX.Element;
export interface AcaoPrimariaProps extends React$1.ButtonHTMLAttributes<HTMLButtonElement> {
	/** Ícone Lucide de 20px. Nunca substitui o rótulo. */
	icone?: React$1.ReactNode;
	/** Estica até as margens, na altura do polegar. */
	retrato?: boolean;
}
/**
 * Ação primária flutuante: o único elemento com acento na tela (lei 3). Quadrada em 4px,
 * contorno de 1px em vez de sombra, sempre com rótulo. Exige pai com position: relative.
 */
export declare function AcaoPrimaria({ icone, retrato, className, children, ...resto }: AcaoPrimariaProps): React$1.JSX.Element;
export type ItemMenu = "-" | string | {
	rotulo: string;
	atalho?: string;
	disabled?: boolean;
	separador?: boolean;
};
export interface MenuProps extends React$1.HTMLAttributes<HTMLDivElement> {
	itens?: ItemMenu[];
	aoEscolher?: (rotulo: string) => void;
}
/** Menu suspenso. Em MegUI aparece sobretudo no botão de menu do retrato. */
export declare function Menu({ itens, aoEscolher, className, ...resto }: MenuProps): React$1.JSX.Element;
export type SituacaoRodape = "ok" | "aviso" | "erro" | "info" | "neutro";
export interface RodapeProps extends React$1.HTMLAttributes<HTMLDivElement> {
	estado?: string;
	situacao?: SituacaoRodape;
	contagem?: string;
	versao?: string;
}
/** Rodapé de 24px. Só informação — nunca recebe ação (lei 6). O ponto de cor sempre acompanha texto. */
export declare function Rodape({ estado, situacao, contagem, versao, className, ...resto }: RodapeProps): React$1.JSX.Element;
export interface ProgressoProps extends React$1.HTMLAttributes<HTMLDivElement> {
	/** 0 a 100. */
	valor?: number;
	rotulo?: string;
	indeterminado?: boolean;
}
/** Barra de progresso. Importação é estado da aba atual — mostre o progresso dentro do conteúdo. */
export declare function Progresso({ valor, rotulo, indeterminado, className, style, ...resto }: ProgressoProps): React$1.JSX.Element;
export interface DicaProps extends React$1.HTMLAttributes<HTMLSpanElement> {
	texto: string;
}
/** Dica flutuante (hover e foco). Nunca carregue aqui informação que não exista em algum rótulo. */
export declare function Dica({ texto, className, children, ...resto }: DicaProps): React$1.JSX.Element;
export interface AcaoDialogo {
	rotulo: string;
	variante?: "padrao" | "acento" | "perigo";
	aoClicar?: () => void;
}
export interface DialogoProps extends React$1.HTMLAttributes<HTMLDivElement> {
	titulo: string;
	/** A ação primária vai por último, porque é para ela que a leitura caminha. */
	acoes?: AcaoDialogo[];
	aoFechar?: () => void;
	largura?: number | string;
}
/** Caixa de diálogo. Título na faixa, como na janela. */
export declare function Dialogo({ titulo, acoes, aoFechar, largura, className, style, children, ...resto }: DialogoProps): React$1.JSX.Element;
/**
 * Tela de trabalho do SPED Tables: faixa de abas, módulo de tabela
 * hierárquica, ações no corpo e ação primária flutuante.
 */
export declare function TelaEscrituracao(): React$1.JSX.Element;
/**
 * Conteúdo não alimentado — o padrão que substitui a "tela vazia" (lei 9).
 * A grade existe com seus cabeçalhos, a faixa de ações continua lá, a ação
 * primária continua no mesmo lugar e só troca de rótulo. Nada se esconde.
 */
export declare function TelaSemArquivo({ aoCarregar }: {
	aoCarregar?: () => void;
}): React$1.JSX.Element;

export {};
