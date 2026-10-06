import { useState } from 'react'
import { LancamentoForm } from '../components/LancamentoForm'
import { converterExtrato, detectarColunas, lerCSV, type Colunas } from '../csv'
import {
  diaDeVencimento,
  fixaPagaNoMes,
  previsaoDoMes,
  resumoDoMes,
  saldoDaConta,
  sugerirCategoria,
  useFinancas,
} from '../stores/financas'
import type { ContaFixa } from '../types'
import { lerValor, mesISO, nomeDoDia, reais } from '../util'

type Sub = 'resumo' | 'lancamentos' | 'fixas' | 'importar' | 'ajustes'

const SUBS: [Sub, string][] = [
  ['resumo', 'Resumo'],
  ['lancamentos', 'Lançamentos'],
  ['fixas', 'Contas fixas'],
  ['importar', 'Importar'],
  ['ajustes', 'Contas e categorias'],
]

const nomeDoMes = (mes: string) => {
  const nome = new Date(`${mes}-01T12:00:00`).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
  return nome.charAt(0).toUpperCase() + nome.slice(1)
}

const mudarMes = (mes: string, delta: number) => {
  const [a, m] = mes.split('-').map(Number)
  return mesISO(new Date(a, m - 1 + delta, 1))
}

function Resumo() {
  const f = useFinancas()
  const [lancando, setLancando] = useState(false)
  const [verPagas, setVerPagas] = useState(false)
  const mes = mesISO()
  const p = previsaoDoMes(f.contas, f.transacoes, f.fixas)
  const { gastos, receitas, porCategoria } = resumoDoMes(f.transacoes, mes)
  const diaHoje = new Date().getDate()

  const fixasOrdenadas = [...f.fixas].sort((a, b) => diaDeVencimento(a) - diaDeVencimento(b))
  const pendentes = fixasOrdenadas.filter((x) => !fixaPagaNoMes(x, f.transacoes, mes))
  const pagas = fixasOrdenadas.filter((x) => fixaPagaNoMes(x, f.transacoes, mes))

  const categorias = f.categorias
    .filter((c) => c.tipo === 'gasto')
    .map((c) => ({ ...c, gasto: porCategoria.get(c.id) ?? 0 }))
    .filter((c) => c.gasto > 0 || c.orcamento)
    .sort((a, b) => b.gasto - a.gasto)
  const semCategoria = porCategoria.get(null) ?? 0
  const maior = Math.max(1, ...categorias.map((c) => Math.max(c.gasto, c.orcamento ?? 0)), semCategoria)

  const situacao = (x: ContaFixa) => {
    const d = diaDeVencimento(x)
    if (d === diaHoje) return 'vence hoje'
    if (d < diaHoje) return `venceu dia ${d}`
    return `dia ${d}`
  }

  return (
    <>
      <div className="cartao foco destaque">
        <p className="rotulo">Livre para gastar por dia até o fim do mês</p>
        <p className={`grande ${p.porDia < 0 ? 'negativo' : ''}`}>{reais(p.porDia)}</p>
        <p className="motivo">
          Saldo {reais(p.saldo)} · a pagar {reais(p.aPagar)}
          {p.aReceber > 0 && ` · a receber ${reais(p.aReceber)}`} · {p.diasRestantes} dia{p.diasRestantes > 1 ? 's' : ''}
        </p>
        {p.livre < 0 && (
          <p className="dica">O mês está apertado: faltam {reais(-p.livre)} para cobrir as contas fixas. Melhor saber agora do que no dia.</p>
        )}
      </div>

      {lancando ? (
        <div className="cartao">
          <LancamentoForm onPronto={() => setLancando(false)} onCancelar={() => setLancando(false)} />
        </div>
      ) : (
        <button className="primario grande-botao" onClick={() => setLancando(true)}>
          Registrar gasto ou entrada
        </button>
      )}

      {f.fixas.length > 0 && (
        <>
          <h2>Contas de {nomeDoMes(mes).split(' ')[0].toLowerCase()}</h2>
          <div className="cartao">
            {pendentes.length === 0 && <p className="motivo">Tudo pago este mês. ✓</p>}
            {pendentes.map((x) => (
              <div key={x.id} className="linha entre item">
                <span>
                  <b>{x.nome}</b>
                  <br />
                  <span className={`motivo ${diaDeVencimento(x) <= diaHoje && x.tipo === 'gasto' ? 'atencao' : ''}`}>
                    {x.tipo === 'receita' ? 'entra' : 'sai'} {reais(x.valor)} · {situacao(x)}
                  </span>
                </span>
                <button onClick={() => f.pagarFixa(x.id)}>{x.tipo === 'gasto' ? 'Paguei' : 'Recebi'}</button>
              </div>
            ))}
            {pagas.length > 0 && (
              <button className="discreto" onClick={() => setVerPagas(!verPagas)}>
                {verPagas ? 'Esconder' : `✓ ${pagas.length} já resolvida${pagas.length > 1 ? 's' : ''}`}
              </button>
            )}
            {verPagas &&
              pagas.map((x) => (
                <p key={x.id} className="feito">
                  ✓ {x.nome} · {reais(x.valor)}
                </p>
              ))}
          </div>
        </>
      )}

      <h2>Para onde foi o dinheiro em {nomeDoMes(mes).split(' ')[0].toLowerCase()}</h2>
      <div className="cartao">
        <p className="linha entre">
          <span className="motivo">Entrou {reais(receitas)}</span>
          <span className="motivo">Saiu {reais(gastos)}</span>
        </p>
        {categorias.length === 0 && semCategoria === 0 && <p className="motivo">Nenhum gasto registrado ainda este mês.</p>}
        {categorias.map((c) => {
          const estourou = c.orcamento !== undefined && c.gasto > c.orcamento
          return (
            <div key={c.id} className="barra-linha">
              <div className="linha entre">
                <span>{c.nome}</span>
                <span className={estourou ? 'atencao' : 'motivo'}>
                  {reais(c.gasto)}
                  {c.orcamento ? ` de ${reais(c.orcamento)}` : ''}
                </span>
              </div>
              <div className="barra">
                <div className={estourou ? 'cheia atencao-fundo' : 'cheia'} style={{ width: `${(c.gasto / maior) * 100}%` }} />
                {c.orcamento ? <div className="limite" style={{ left: `${(c.orcamento / maior) * 100}%` }} /> : null}
              </div>
            </div>
          )
        })}
        {semCategoria > 0 && (
          <div className="barra-linha">
            <div className="linha entre">
              <span>Sem categoria</span>
              <span className="motivo">{reais(semCategoria)}</span>
            </div>
            <div className="barra">
              <div className="cheia neutra" style={{ width: `${(semCategoria / maior) * 100}%` }} />
            </div>
          </div>
        )}
      </div>
    </>
  )
}

function Lancamentos() {
  const f = useFinancas()
  const [mes, setMes] = useState(mesISO())
  const [soSemCategoria, setSoSemCategoria] = useState(false)
  const { doMes, gastos, receitas } = resumoDoMes(f.transacoes, mes)
  const lista = doMes
    .filter((t) => !soSemCategoria || !t.categoriaId)
    .sort((a, b) => b.data.localeCompare(a.data) || b.criadoEm - a.criadoEm)
  const dias = [...new Set(lista.map((t) => t.data))]
  const semCategoria = doMes.filter((t) => !t.categoriaId).length

  return (
    <>
      <div className="linha entre">
        <button onClick={() => setMes(mudarMes(mes, -1))} aria-label="Mês anterior">
          ‹
        </button>
        <b className="mes">{nomeDoMes(mes)}</b>
        <button onClick={() => setMes(mudarMes(mes, 1))} aria-label="Próximo mês">
          ›
        </button>
      </div>
      <p className="linha entre motivo">
        <span>Entrou {reais(receitas)}</span>
        <span>Saiu {reais(gastos)}</span>
        <span>Resultado {reais(receitas - gastos)}</span>
      </p>
      {semCategoria > 0 && (
        <button className={soSemCategoria ? 'ativo' : ''} onClick={() => setSoSemCategoria(!soSemCategoria)}>
          {soSemCategoria ? 'Mostrar todos' : `${semCategoria} sem categoria: organizar`}
        </button>
      )}
      {lista.length === 0 && <p className="vazio-texto">Nada neste mês.</p>}
      {dias.map((dia) => (
        <div key={dia} className="cartao">
          <p className="rotulo">{nomeDoDia(dia)}</p>
          {lista
            .filter((t) => t.data === dia)
            .map((t) => (
              <div key={t.id} className="transacao">
                <div className="linha entre">
                  <span className="desc">{t.descricao}</span>
                  <b className={t.valor < 0 ? '' : 'positivo'}>{reais(t.valor)}</b>
                </div>
                <div className="linha entre">
                  <select
                    className="mini"
                    value={t.categoriaId ?? ''}
                    onChange={(e) => f.atualizarTransacao(t.id, { categoriaId: e.target.value || null })}
                    aria-label="Categoria"
                  >
                    <option value="">Sem categoria</option>
                    {f.categorias
                      .filter((c) => c.tipo === (t.valor < 0 ? 'gasto' : 'receita'))
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nome}
                        </option>
                      ))}
                  </select>
                  <button className="discreto" onClick={() => f.removerTransacao(t.id)} aria-label="Apagar lançamento">
                    Apagar
                  </button>
                </div>
              </div>
            ))}
        </div>
      ))}
    </>
  )
}

function FormFixa({ onPronto }: { onPronto: () => void }) {
  const f = useFinancas()
  const [nome, setNome] = useState('')
  const [valorTexto, setValorTexto] = useState('')
  const [dia, setDia] = useState('10')
  const [tipo, setTipo] = useState<'gasto' | 'receita'>('gasto')
  const [categoriaId, setCategoriaId] = useState('')
  const [contaId, setContaId] = useState(f.contas[0]?.id ?? '')
  const valor = lerValor(valorTexto)

  return (
    <form
      className="form"
      onSubmit={(e) => {
        e.preventDefault()
        const d = Number(dia)
        if (!nome.trim() || !valor || !contaId || d < 1 || d > 31) return
        f.salvarFixa({
          nome: nome.trim(),
          valor: Math.abs(valor),
          dia: d,
          tipo,
          categoriaId: categoriaId || sugerirCategoria(nome, f.transacoes, f.categorias),
          contaId,
        })
        onPronto()
      }}
    >
      <div className="segmentado">
        <button type="button" className={tipo === 'gasto' ? 'ativo' : ''} onClick={() => setTipo('gasto')}>
          Conta a pagar
        </button>
        <button type="button" className={tipo === 'receita' ? 'ativo' : ''} onClick={() => setTipo('receita')}>
          Entrada fixa
        </button>
      </div>
      <input autoFocus value={nome} onChange={(e) => setNome(e.target.value)} placeholder={tipo === 'gasto' ? 'Ex.: Aluguel, Internet' : 'Ex.: Salário'} />
      <div className="linha">
        <input className="flex" inputMode="decimal" value={valorTexto} onChange={(e) => setValorTexto(e.target.value)} placeholder="Valor" />
        <input className="flex" type="number" min={1} max={31} value={dia} onChange={(e) => setDia(e.target.value)} aria-label="Dia do mês" />
      </div>
      <div className="linha">
        <select className="flex" value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)} aria-label="Categoria">
          <option value="">Categoria automática</option>
          {f.categorias
            .filter((c) => c.tipo === tipo)
            .map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
        </select>
        {f.contas.length > 1 && (
          <select className="flex" value={contaId} onChange={(e) => setContaId(e.target.value)} aria-label="Conta">
            {f.contas.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
        )}
      </div>
      <div className="linha">
        <button type="submit" className="primario">
          Salvar
        </button>
        <button type="button" onClick={onPronto}>
          Cancelar
        </button>
      </div>
    </form>
  )
}

function Fixas() {
  const f = useFinancas()
  const [criando, setCriando] = useState(false)
  const total = (tipo: 'gasto' | 'receita') => f.fixas.filter((x) => x.tipo === tipo).reduce((s, x) => s + x.valor, 0)

  return (
    <>
      <p className="vazio-texto">
        Contas que se repetem todo mês. O app avisa na véspera e no dia, e desconta do "livre por dia" até você marcar como paga.
      </p>
      {criando ? (
        <div className="cartao">
          <FormFixa onPronto={() => setCriando(false)} />
        </div>
      ) : (
        <button className="primario" onClick={() => setCriando(true)}>
          Nova conta fixa
        </button>
      )}
      {f.fixas.length > 0 && (
        <div className="cartao">
          {[...f.fixas]
            .sort((a, b) => a.dia - b.dia)
            .map((x) => (
              <div key={x.id} className="linha entre item">
                <span>
                  <b>{x.nome}</b>
                  <br />
                  <span className="motivo">
                    dia {x.dia} · {x.tipo === 'gasto' ? 'sai' : 'entra'} {reais(x.valor)}
                  </span>
                </span>
                <button className="discreto" onClick={() => f.removerFixa(x.id)}>
                  Remover
                </button>
              </div>
            ))}
          <p className="motivo">
            Por mês: saem {reais(total('gasto'))}
            {total('receita') > 0 && `, entram ${reais(total('receita'))}`}
          </p>
        </div>
      )}
    </>
  )
}

async function lerArquivoTexto(arquivo: File) {
  const bytes = await arquivo.arrayBuffer()
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  } catch {
    // Muitos bancos brasileiros ainda exportam em Latin-1.
    return new TextDecoder('windows-1252').decode(bytes)
  }
}

function Importar() {
  const f = useFinancas()
  const [linhas, setLinhas] = useState<string[][] | null>(null)
  const [colunas, setColunas] = useState<Colunas | null>(null)
  const [contaId, setContaId] = useState(f.contas[0]?.id ?? '')
  const [inverter, setInverter] = useState(false)
  const [resultado, setResultado] = useState('')

  const cabecalho = linhas?.[0] ?? []
  const convertido = linhas && colunas ? converterExtrato(linhas.slice(1), colunas, inverter, contaId) : null

  return (
    <>
      <p className="vazio-texto">
        Exporte o extrato do banco em CSV (Nubank, Inter, Wallet e a maioria dos bancos têm essa opção) e traga aqui. Reimportar o mesmo
        arquivo não duplica nada.
      </p>
      <div className="cartao">
        <input
          type="file"
          accept=".csv,text/csv"
          onChange={async (e) => {
            const arquivo = e.target.files?.[0]
            if (!arquivo) return
            const l = lerCSV(await lerArquivoTexto(arquivo))
            setLinhas(l)
            setColunas(l.length ? detectarColunas(l[0]) : null)
            setInverter(/fatura|cartao|card|nubank_\d{4}-\d{2}-\d{2}/i.test(arquivo.name))
            setResultado('')
          }}
        />
        {linhas && (
          <>
            <label className="rotulo">Para qual conta?</label>
            <select value={contaId} onChange={(e) => setContaId(e.target.value)}>
              {f.contas.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </select>
            <label className="rotulo">Colunas do arquivo</label>
            {(['data', 'valor', 'descricao'] as const).map((campo) => (
              <div key={campo} className="linha entre">
                <span>{campo === 'descricao' ? 'Descrição' : campo === 'data' ? 'Data' : 'Valor'}</span>
                <select
                  className="mini"
                  value={colunas?.[campo] ?? -1}
                  onChange={(e) => setColunas({ data: 0, valor: 0, descricao: 0, ...colunas, [campo]: Number(e.target.value) })}
                >
                  <option value={-1}>Escolha…</option>
                  {cabecalho.map((c, i) => (
                    <option key={i} value={i}>
                      {c || `Coluna ${i + 1}`}
                    </option>
                  ))}
                </select>
              </div>
            ))}
            <label className="check">
              <input type="checkbox" checked={inverter} onChange={(e) => setInverter(e.target.checked)} />
              Valores positivos são gastos (comum em fatura de cartão)
            </label>
          </>
        )}
      </div>

      {convertido && (
        <div className="cartao">
          <p className="rotulo">
            Prévia: {convertido.ok.length} lançamentos
            {convertido.ignoradas > 0 && ` (${convertido.ignoradas} linhas sem data ou valor foram ignoradas)`}
          </p>
          {convertido.ok.slice(0, 6).map((l) => (
            <div key={l.chave} className="linha entre">
              <span className="desc">
                {l.data.split('-').reverse().join('/')} · {l.descricao}
              </span>
              <b className={l.valor < 0 ? '' : 'positivo'}>{reais(l.valor)}</b>
            </div>
          ))}
          <button
            className="primario"
            disabled={convertido.ok.length === 0}
            onClick={() => {
              const novas = f.importar(
                convertido.ok.map((l) => ({
                  contaId,
                  categoriaId: sugerirCategoria(l.descricao, f.transacoes, f.categorias),
                  valor: l.valor,
                  descricao: l.descricao,
                  data: l.data,
                  chaveImport: l.chave,
                })),
              )
              const repetidas = convertido.ok.length - novas
              setResultado(`${novas} lançamento${novas === 1 ? '' : 's'} importado${novas === 1 ? '' : 's'}${repetidas ? `, ${repetidas} já existiam` : ''}.`)
              setLinhas(null)
            }}
          >
            Importar {convertido.ok.length} lançamentos
          </button>
        </div>
      )}
      {linhas && !colunas && <p className="dica">Não reconheci as colunas automaticamente. Escolha acima qual é a data, o valor e a descrição.</p>}
      {resultado && <p className="dica neutra">{resultado} Confira em Lançamentos os que ficaram sem categoria.</p>}
    </>
  )
}

function AjustesFinancas() {
  const f = useFinancas()
  const [novaConta, setNovaConta] = useState('')
  const [novaCategoria, setNovaCategoria] = useState('')
  const [tipoCategoria, setTipoCategoria] = useState<'gasto' | 'receita'>('gasto')

  return (
    <>
      <h2>Contas e carteiras</h2>
      <p className="vazio-texto">O saldo inicial é quanto havia na conta quando você começou a usar o app.</p>
      {f.contas.map((c) => (
        <div key={c.id} className="cartao">
          <div className="linha">
            <input className="flex" value={c.nome} onChange={(e) => f.salvarConta({ ...c, nome: e.target.value })} aria-label="Nome da conta" />
            <button
              className="discreto"
              onClick={() => {
                const qtd = f.transacoes.filter((t) => t.contaId === c.id).length
                if (confirm(qtd ? `Apagar "${c.nome}" e os ${qtd} lançamentos dela?` : `Apagar "${c.nome}"?`)) f.removerConta(c.id)
              }}
            >
              Apagar
            </button>
          </div>
          <div className="linha entre">
            <span className="motivo">Saldo inicial</span>
            <input
              className="mini"
              inputMode="decimal"
              defaultValue={(c.saldoInicial / 100).toFixed(2).replace('.', ',')}
              onBlur={(e) => f.salvarConta({ ...c, saldoInicial: lerValor(e.target.value) ?? 0 })}
              aria-label="Saldo inicial"
            />
          </div>
          <p className="motivo">Saldo atual: {reais(saldoDaConta(c, f.transacoes))}</p>
        </div>
      ))}
      <form
        className="linha"
        onSubmit={(e) => {
          e.preventDefault()
          if (!novaConta.trim()) return
          f.salvarConta({ nome: novaConta.trim(), saldoInicial: 0 })
          setNovaConta('')
        }}
      >
        <input value={novaConta} onChange={(e) => setNovaConta(e.target.value)} placeholder="Nova conta (ex.: Nubank, Cartão)" />
        <button type="submit">Adicionar</button>
      </form>

      <h2>Categorias e limites mensais</h2>
      <p className="vazio-texto">O limite é opcional. Quando existe, a barra no Resumo mostra quanto falta.</p>
      <div className="cartao">
        {f.categorias.map((c) => (
          <div key={c.id} className="linha entre item">
            <span>
              {c.nome} <span className="motivo">· {c.tipo === 'gasto' ? 'gasto' : 'receita'}</span>
            </span>
            <span className="linha">
              {c.tipo === 'gasto' && (
                <input
                  className="mini"
                  inputMode="decimal"
                  placeholder="Sem limite"
                  defaultValue={c.orcamento ? (c.orcamento / 100).toFixed(2).replace('.', ',') : ''}
                  onBlur={(e) => f.salvarCategoria({ ...c, orcamento: lerValor(e.target.value) ?? undefined })}
                  aria-label={`Limite de ${c.nome}`}
                />
              )}
              <button className="discreto" onClick={() => f.removerCategoria(c.id)} aria-label={`Apagar ${c.nome}`}>
                ×
              </button>
            </span>
          </div>
        ))}
      </div>
      <form
        className="linha"
        onSubmit={(e) => {
          e.preventDefault()
          if (!novaCategoria.trim()) return
          f.salvarCategoria({ nome: novaCategoria.trim(), tipo: tipoCategoria })
          setNovaCategoria('')
        }}
      >
        <input value={novaCategoria} onChange={(e) => setNovaCategoria(e.target.value)} placeholder="Nova categoria" />
        <select className="mini" value={tipoCategoria} onChange={(e) => setTipoCategoria(e.target.value as 'gasto' | 'receita')}>
          <option value="gasto">Gasto</option>
          <option value="receita">Receita</option>
        </select>
        <button type="submit">Adicionar</button>
      </form>
    </>
  )
}

export function Financas() {
  const [sub, setSub] = useState<Sub>('resumo')
  return (
    <section className="tela">
      <div className="sub-abas" role="tablist">
        {SUBS.map(([id, nome]) => (
          <button key={id} role="tab" aria-selected={sub === id} className={sub === id ? 'ativo' : ''} onClick={() => setSub(id)}>
            {nome}
          </button>
        ))}
      </div>
      {sub === 'resumo' && <Resumo />}
      {sub === 'lancamentos' && <Lancamentos />}
      {sub === 'fixas' && <Fixas />}
      {sub === 'importar' && <Importar />}
      {sub === 'ajustes' && <AjustesFinancas />}
    </section>
  )
}
