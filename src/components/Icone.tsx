const CAMINHOS = {
  agora: (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="3.5" />
    </>
  ),
  agenda: (
    <>
      <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" />
      <path d="M3.5 10h17M8 3v4M16 3v4" />
    </>
  ),
  caixa: (
    <>
      <path d="M3.5 13.5 6 5.5h12l2.5 8v5a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z" />
      <path d="M3.5 13.5H8.5l1.5 2.5h4l1.5-2.5h5" />
    </>
  ),
  financas: (
    <>
      <rect x="3" y="6" width="18" height="13" rx="2.5" />
      <path d="M3 10h18M16 14.5h2" />
    </>
  ),
  projetos: (
    <>
      <path d="M5 21V4" />
      <path d="M5 4h11l-2 4 2 4H5" />
    </>
  ),
  historico: (
    <>
      <path d="M3.5 12a8.5 8.5 0 1 0 2.6-6.1" />
      <path d="M3 3.5V8h4.5" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
  buscar: (
    <>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="m15.5 15.5 5 5" />
    </>
  ),
  ajustes: (
    <>
      <path d="M4 7h10M18 7h2M4 17h2M10 17h10" />
      <circle cx="16" cy="7" r="2" />
      <circle cx="8" cy="17" r="2" />
    </>
  ),
  capturar: <path d="M12 5v14M5 12h14" />,
}

export type NomeIcone = keyof typeof CAMINHOS

/** 22px na navegação de toque; 20px na ação primária e 16px na janela de computador, como no MegUI. */
export function Icone({ nome, tamanho = 22 }: { nome: NomeIcone; tamanho?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={tamanho} height={tamanho} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {CAMINHOS[nome]}
    </svg>
  )
}

/**
 * Símbolo no meio do texto (✓, ★, 📅…). O leitor de tela não lê o desenho ("marca de seleção", "estrela preta"):
 * lê `diz`, quando o símbolo carrega sentido, ou nada, quando é só enfeite.
 */
export function Simbolo({ c, diz }: Readonly<{ c: string; diz?: string }>) {
  return (
    <>
      <span aria-hidden="true">{c} </span>
      {diz && <span className="so-leitor">{diz}: </span>}
    </>
  )
}
