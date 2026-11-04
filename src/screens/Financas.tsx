import { useEffect, useState } from 'react'
import { CapturaBancos } from '../components/CapturaBancos'
import { LancamentoForm } from '../components/LancamentoForm'
import { ListaDeEspera } from '../components/ListaDeEspera'
import { Metas } from '../components/Metas'
import { useAgora } from '../hooks'
import { converterExtrato, detectarColunas, lerCSV, type Colunas } from '../csv'
import { haQuanto, saudeDasFontes } from '../fontes'
import { lerOFX, pareceOFX } from '../ofx'
import { apagarConfigPluggy, lerConfigPluggy, salvarConfigPluggy, sincronizarPluggy } from '../pluggy'
import {
  compararComMesesAnteriores,
  diaDeVencimento,
  fixaPagaNoMes,
  palavraDaRegra,
  provaveisAssinaturas,
  previsaoDoMes,
  resumoDoMes,
  saldoDaConta,
  sugerirCategoria,
  useFinancas,
} from '../stores/financas'
import type { ContaFixa, Transacao } from '../types'
import { hora, lerValor, mesISO, nomeDoDia, reais } from '../util'
import { Simbolo } from '../components/Icone'
import { apagarComDesfazer } from '../desfazer'
import { useAvisos, useConfig } from '../stores/config'
import { BotaoInterruptor } from '../tema/megui-react.mjs'

type Sub = 'resumo' | 'lancamentos' | 'fixas' | 'espera' | 'importar' | 'ajustes'

const SUBS: [Sub, string][] = [
  ['resumo', 'Resumo'],
  ['lancamentos', 'Lançamentos'],
  ['fixas', 'Contas fixas'],
  ['espera', 'Antes de comprar'],
  ['importar', 'Bancos'],
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

/**
 * Assinaturas esquecidas (V29 em docs/CONCORRENTES.md): o que se repetiu nos 3 meses anteriores e ainda não é conta
 * fixa. "Virar conta fixa" passa a avisar o vencimento; "Ainda uso" não pergunta mais.
 */
function Assinaturas({ mes }: { mes: string }) {
  const f = useFinancas()
  const cfg = useConfig()
  const lista = provaveisAssinaturas(f.transacoes, f.fixas, mes, cfg.assinaturasOk).slice(0, 3)
  if (lista.length === 0) return null
  const dispensar = (chave: string) => cfg.ajustar({ assinaturasOk: [...cfg.assinaturasOk, chave] })

  return (
    <div className="cartao compacto">
      <h2 className="rotulo">Parecem assinaturas</h2>
      <p className="motivo">Apareceram todo mês nos últimos 3 meses. Ainda usa?</p>
      {lista.map((a) => (
        <div key={a.chave} className="linha entre item">
          <span>
            {a.descricao} <span className="motivo">· {reais(a.valor)}, por volta do dia {a.dia}</span>
          </span>
          <span className="linha">
            <button
              onClick={() => f.salvarFixa({ nome: a.descricao, valor: a.valor, dia: a.dia, tipo: 'gasto', categoriaId: a.categoriaId, contaId: a.contaId })}
            >
              Virar conta fixa
            </button>
            <button className="discreto" onClick={() => dispensar(a.chave)}>
              Ainda uso
            </button>
          </span>
        </div>
      ))}
    </div>
  )
}

function Resumo({ sync, onVerFontes }: { sync: ReturnType<typeof useSyncAutomatico>; onVerFontes: () => void }) {
  const f = useFinancas()
  const [lancando, setLancando] = useState(false)
  const [verPagas, setVerPagas] = useState(false)
  const agora = useAgora(60_000)
  const mes = mesISO(agora)
  const p = previsaoDoMes(f.contas, f.transacoes, f.fixas)
  const { gastos, receitas, porCategoria } = resumoDoMes(f.transacoes, mes)
  const diaHoje = new Date(agora).getDate()
  const comparacao = compararComMesesAnteriores(f.transacoes, mes, diaHoje)

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
    <div className="colunas">
      <div className="col">
        <StatusBancos sync={sync} />
        <AvisoFontesParadas onVer={onVerFontes} />
        <Assinaturas mes={mes} />
        <div className="cartao foco destaque">
          <h2 className="rotulo">Livre para gastar por dia até o fim do mês</h2>
          <p className={`grande valor ${p.porDia < 0 ? 'negativo' : ''}`}>{reais(p.porDia)}</p>
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
              {pendentes.length === 0 && <p className="motivo">Tudo pago este mês.</p>}
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
                  {verPagas ? 'Esconder' : `${pagas.length} já resolvida${pagas.length > 1 ? 's' : ''}`}
                </button>
              )}
              {verPagas &&
                pagas.map((x) => (
                  <p key={x.id} className="feito">
                    <Simbolo c="✓" diz="Paga" />
                    {x.nome} · {reais(x.valor)}
                  </p>
                ))}
            </div>
          </>
        )}
      </div>
      <div className="col">
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
                    {/* Não só pela cor: quem não distingue o tom de atenção lê que passou. */}
                    {estourou && ' · passou do limite'}
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
        {comparacao.diferencas.length > 0 && (
          <div className="cartao compacto">
            <h2 className="rotulo">Comparado com outros meses</h2>
            <p className="motivo">
              Do dia 1 ao dia {diaHoje}, contra a média do mesmo trecho {comparacao.meses === 1 ? 'no mês anterior' : `nos ${comparacao.meses} meses anteriores`}:
            </p>
            <ul className="lista-simples">
              {comparacao.diferencas.slice(0, 4).map((d) => (
                <li key={d.categoriaId ?? 'sem'}>
                  {f.categorias.find((c) => c.id === d.categoriaId)?.nome ?? 'Sem categoria'}: {reais(d.agora)}{' '}
                  <span className="motivo">
                    ({reais(Math.abs(d.diferenca))} {d.diferenca > 0 ? 'a mais' : 'a menos'} que a média de {reais(d.media)})
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}

/** Corrige descrição, valor e data. O sinal (gasto ou entrada) é mantido. */
function EditarLancamento({ t, onPronto }: { t: Transacao; onPronto: () => void }) {
  const atualizar = useFinancas((f) => f.atualizarTransacao)
  const [descricao, setDescricao] = useState(t.descricao)
  // Valores ficam em centavos (lerValor também devolve centavos).
  const [valorTexto, setValorTexto] = useState((Math.abs(t.valor) / 100).toFixed(2).replace('.', ','))
  const [data, setData] = useState(t.data)
  const valor = lerValor(valorTexto)
  return (
    <form
      className="form"
      onSubmit={(e) => {
        e.preventDefault()
        if (!valor || !data) return
        atualizar(t.id, { descricao: descricao.trim(), valor: Math.sign(t.valor) * Math.abs(valor), data })
        onPronto()
      }}
    >
      <input value={descricao} onChange={(e) => setDescricao(e.target.value)} aria-label="Descrição" placeholder="Descrição" />
      <div className="linha">
        <input required className="flex" inputMode="decimal" value={valorTexto} onChange={(e) => setValorTexto(e.target.value)} aria-label="Valor" />
        <input required type="date" value={data} onChange={(e) => setData(e.target.value)} aria-label="Data" />
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

/**
 * Depois de trocar a categoria de um lançamento, oferece a regra "sempre que a descrição tiver X" (V28 em
 * docs/CONCORRENTES.md). Só com um toque em "Sempre assim"; a regra também arruma os lançamentos sem categoria.
 */
function oferecerRegra(t: Transacao, categoriaId: string | null) {
  const f = useFinancas.getState()
  const palavra = palavraDaRegra(t.descricao)
  const categoria = f.categorias.find((c) => c.id === categoriaId)
  if (!palavra || !categoria || f.regras.some((r) => r.contem === palavra && r.categoriaId === categoria.id)) return
  const avisar = useAvisos.getState().mostrar
  avisar('Categoria trocada', `Usar ${categoria.nome} sempre que a descrição tiver "${palavra}"?`, {
    acao: {
      rotulo: 'Sempre assim',
      fazer: () => {
        const n = useFinancas.getState().criarRegra(palavra, categoria.id)
        avisar('Regra criada', n ? `${n} lançamento${n === 1 ? '' : 's'} sem categoria também ${n === 1 ? 'mudou' : 'mudaram'}.` : 'Vale para os próximos lançamentos.')
      },
    },
  })
}

function Lancamentos() {
  const f = useFinancas()
  const [mes, setMes] = useState(mesISO())
  const [soSemCategoria, setSoSemCategoria] = useState(false)
  const [editando, setEditando] = useState<string | null>(null)
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
        <BotaoInterruptor ligado={soSemCategoria} onClick={() => setSoSemCategoria(!soSemCategoria)}>
          {soSemCategoria ? 'Mostrar todos' : `${semCategoria} sem categoria: organizar`}
        </BotaoInterruptor>
      )}
      {lista.length === 0 && <p className="vazio-texto">Nada neste mês.</p>}
      {dias.map((dia) => (
        <div key={dia} className="cartao">
          <h2 className="rotulo">{nomeDoDia(dia)}</h2>
          {lista
            .filter((t) => t.data === dia)
            .map((t) => (
              <div key={t.id} className="transacao">
                <div className="linha entre">
                  <span className="desc">
                    {t.descricao}
                    {t.provisoria && <span className="selo" title="Veio da notificação do banco; o Open Finance confirma depois">notificação</span>}
                  </span>
                  <b className={t.valor < 0 ? '' : 'positivo'}>{reais(t.valor)}</b>
                </div>
                <div className="linha entre">
                  <select
                    className="mini"
                    value={t.categoriaId ?? ''}
                    onChange={(e) => {
                      f.atualizarTransacao(t.id, { categoriaId: e.target.value || null })
                      oferecerRegra(t, e.target.value || null)
                    }}
                    aria-label="Categoria"
                  >
                    <option value="">Sem categoria</option>
                    {f.categorias
                      .filter((c) => c.tipo === (t.valor < 0 ? 'gasto' : 'receita') || c.tipo === 'transferencia')
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nome}
                        </option>
                      ))}
                  </select>
                  <span className="linha">
                    <button className="discreto" onClick={() => setEditando(editando === t.id ? null : t.id)} aria-label="Editar lançamento">
                      Editar
                    </button>
                    <button
                      className="discreto"
                      onClick={() => apagarComDesfazer(useFinancas, 'transacoes', t.id, `${t.descricao} · ${reais(t.valor)}`, () => f.removerTransacao(t.id))}
                      aria-label={`Apagar lançamento ${t.descricao}`}
                    >
                      Apagar
                    </button>
                  </span>
                </div>
                {editando === t.id && <EditarLancamento t={t} onPronto={() => setEditando(null)} />}
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

  if (f.contas.length === 0) return <p className="dica">Crie uma conta em Finanças → Contas e categorias antes de cadastrar contas fixas.</p>

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
          categoriaId: categoriaId || sugerirCategoria(nome, f.transacoes, f.categorias, f.regras),
          contaId,
        })
        onPronto()
      }}
    >
      <div className="segmentado" role="group" aria-label="Tipo">
        <BotaoInterruptor ligado={tipo === 'gasto'} onClick={() => setTipo('gasto')}>
          Conta a pagar
        </BotaoInterruptor>
        <BotaoInterruptor ligado={tipo === 'receita'} onClick={() => setTipo('receita')}>
          Entrada fixa
        </BotaoInterruptor>
      </div>
      <input required aria-label="Nome" autoFocus value={nome} onChange={(e) => setNome(e.target.value)} placeholder={tipo === 'gasto' ? 'Ex.: Aluguel, Internet' : 'Ex.: Salário'} />
      <div className="linha">
        <input required aria-label="Valor" className="flex" inputMode="decimal" value={valorTexto} onChange={(e) => setValorTexto(e.target.value)} placeholder="Valor" />
        <input required className="flex" type="number" min={1} max={31} value={dia} onChange={(e) => setDia(e.target.value)} aria-label="Dia do mês" />
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
    <div className="estreito">
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
                <button
                  className="discreto"
                  onClick={() => apagarComDesfazer(useFinancas, 'fixas', x.id, x.nome, () => f.removerFixa(x.id))}
                  aria-label={`Remover ${x.nome}`}
                >
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
    </div>
  )
}

async function lerArquivoTexto(arquivo: File) {
  const bytes = await arquivo.arrayBuffer()
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  } catch {
    // Fallback para Latin-1, comum em extratos de bancos brasileiros.
    return new TextDecoder('windows-1252').decode(bytes)
  }
}

const SEIS_HORAS = 6 * 3_600_000

/** Sincroniza o Open Finance ao abrir a tela, no máximo a cada 6 h. */
function useSyncAutomatico() {
  const [estado, setEstado] = useState<{ rodando: boolean; mensagem: string }>({ rodando: false, mensagem: '' })
  const sincronizar = async () => {
    setEstado({ rodando: true, mensagem: '' })
    try {
      const r = await sincronizarPluggy()
      setEstado({
        rodando: false,
        mensagem: [`${r.novas} lançamento${r.novas === 1 ? '' : 's'} novo${r.novas === 1 ? '' : 's'} de ${r.contas} conta${r.contas === 1 ? '' : 's'}.`, ...r.avisos].join(' '),
      })
    } catch (e) {
      setEstado({ rodando: false, mensagem: (e as Error).message })
    }
  }
  useEffect(() => {
    const cfg = lerConfigPluggy()
    if (cfg && Date.now() - (cfg.ultimaSync ?? 0) > SEIS_HORAS) void sincronizar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return { ...estado, sincronizar }
}

/** Fontes automáticas que pararam de trazer lançamentos, em tom neutro (D25). */
function AvisoFontesParadas({ onVer }: { onVer: () => void }) {
  const f = useFinancas()
  const paradas = saudeDasFontes(f.transacoes, f.contas).filter((x) => x.parada)
  if (paradas.length === 0) return null
  return (
    <p className="dica neutra">
      {paradas.map((x) => `${x.nome}: nada chega ${haQuanto(x.diasSemDados)}`).join('; ')}.{' '}
      <button className="discreto" onClick={onVer}>
        Ver as fontes
      </button>
    </p>
  )
}

/** Quando cada fonte trouxe lançamentos pela última vez e o ritmo de costume (D25). */
function SaudeDasFontes() {
  const f = useFinancas()
  const fontes = saudeDasFontes(f.transacoes, f.contas)
  if (fontes.length === 0) return null
  return (
    <div className="cartao">
      <h2 className="rotulo">De onde chegam os lançamentos</h2>
      {fontes.map((x) => (
        <div key={x.chave} className="item">
          <div className="linha entre">
            <span>{x.nome}</span>
            <span className="motivo">último {haQuanto(x.diasSemDados)}</span>
          </div>
          {x.ritmoDias !== null && (
            <p className="motivo">
              Costuma chegar {x.ritmoDias <= 1 ? 'todo dia' : `a cada ${Math.round(x.ritmoDias)} dias`}; {x.diasComDados30} dia
              {x.diasComDados30 === 1 ? '' : 's'} com lançamentos no último mês.
            </p>
          )}
          {x.parada && (
            <p className="dica neutra">
              Faz mais tempo que o normal sem nada dessa fonte. O app do banco pode ter parado de avisar (ou o aviso mudou de texto): confira
              as notificações dele no celular, ou importe o extrato para não ficar buraco.
            </p>
          )}
        </div>
      ))}
    </div>
  )
}

function StatusBancos({ sync }: { sync: ReturnType<typeof useSyncAutomatico> }) {
  const cfg = lerConfigPluggy()
  if (!cfg) return null
  return (
    <div className="linha entre status-bancos">
      <span className="motivo">
        {sync.rodando ? 'Sincronizando bancos…' : cfg.ultimaSync ? `Bancos sincronizados às ${hora(cfg.ultimaSync)}` : 'Bancos conectados'}
        {sync.mensagem && <> · {sync.mensagem}</>}
      </span>
      <button onClick={sync.sincronizar} disabled={sync.rodando}>
        Sincronizar
      </button>
    </div>
  )
}

function OpenFinance({ sync }: { sync: ReturnType<typeof useSyncAutomatico> }) {
  const [cfg, setCfg] = useState(lerConfigPluggy)
  const [editando, setEditando] = useState(!cfg)
  const [clientId, setClientId] = useState(cfg?.clientId ?? '')
  const [clientSecret, setClientSecret] = useState(cfg?.clientSecret ?? '')
  const [itens, setItens] = useState(cfg?.itemIds.join('\n') ?? '')

  if (!editando && cfg)
    return (
      <div className="cartao">
        <h2 className="titulo">Open Finance</h2>
        <p className="motivo">
          {cfg.itemIds.length} conex{cfg.itemIds.length === 1 ? 'ão' : 'ões'} do Meu Pluggy. Sincroniza sozinho ao abrir Finanças (a cada 6 horas no máximo).
        </p>
        <StatusBancos sync={sync} />
        <div className="linha">
          <button onClick={() => setEditando(true)}>Editar conexões</button>
          <button
            className="discreto"
            onClick={() => {
              if (!confirm('Desconectar o Open Finance? Os lançamentos já importados continuam no app.')) return
              apagarConfigPluggy()
              setCfg(null)
              setEditando(true)
            }}
          >
            Desconectar
          </button>
        </div>
      </div>
    )

  return (
    <div className="cartao">
      <h2 className="titulo">Open Finance (automático)</h2>
      <p className="motivo">
        Puxa saldos e lançamentos direto dos seus bancos pelo <b>Meu Pluggy</b>, gratuito para uso pessoal (até 5 conexões do seu CPF).
      </p>
      <details>
        <summary>Como configurar (uma vez só, ~10 minutos)</summary>
        <ol className="passos-guia">
          <li>
            Crie uma conta em <b>pluggy.ai</b>. No Dashboard, crie uma <b>Application</b> e copie o <b>Client ID</b> e o <b>Client Secret</b>.
          </li>
          <li>
            Abra <b>meu.pluggy.ai</b>, entre com a mesma conta e conecte seus bancos pelo Open Finance (a autorização é feita no app do próprio
            banco).
          </li>
          <li>
            Em cada conexão, abra o menu de três pontos e toque em <b>Copiar Item ID</b>.
          </li>
          <li>Cole tudo abaixo.</li>
        </ol>
      </details>
      <label className="rotulo">Client ID</label>
      <input aria-label="Client ID" value={clientId} onChange={(e) => setClientId(e.target.value.trim())} spellCheck={false} autoComplete="off" />
      <label className="rotulo">Client Secret</label>
      <input aria-label="Client Secret" type="password" value={clientSecret} onChange={(e) => setClientSecret(e.target.value.trim())} spellCheck={false} autoComplete="off" />
      <label className="rotulo">Item IDs (um por linha)</label>
      <textarea aria-label="Item IDs, um por linha" rows={3} value={itens} onChange={(e) => setItens(e.target.value)} spellCheck={false} />
      <p className="dica neutra">
        O Client Secret fica salvo só neste aparelho e não vai para o backup. Não configure em computador compartilhado.
      </p>
      <div className="linha">
        <button
          className="primario"
          disabled={!clientId || !clientSecret || !itens.trim() || sync.rodando}
          onClick={async () => {
            const novo = { clientId, clientSecret, itemIds: itens.split(/[\s,;]+/).filter(Boolean), ultimaSync: cfg?.ultimaSync }
            salvarConfigPluggy(novo)
            setCfg(novo)
            setEditando(false)
            await sync.sincronizar()
          }}
        >
          {sync.rodando ? 'Sincronizando…' : 'Salvar e sincronizar'}
        </button>
        {cfg && (
          <button onClick={() => setEditando(false)}>Cancelar</button>
        )}
      </div>
      {sync.mensagem && <p className="dica">{sync.mensagem}</p>}
    </div>
  )
}

function Importar() {
  const f = useFinancas()
  const [linhas, setLinhas] = useState<string[][] | null>(null)
  const [colunas, setColunas] = useState<Colunas | null>(null)
  const [contaId, setContaId] = useState(f.contas[0]?.id ?? '')
  const [inverter, setInverter] = useState(false)
  const [resultado, setResultado] = useState('')
  // OFX dispensa escolher colunas: o texto fica guardado e é lido de novo se a conta mudar.
  const [textoOFX, setTextoOFX] = useState<string | null>(null)

  const cabecalho = linhas?.[0] ?? []
  const deOFX = textoOFX ? lerOFX(textoOFX, contaId) : null
  const convertido = deOFX
    ? { ...deOFX, ok: inverter ? deOFX.ok.map((l) => ({ ...l, valor: -l.valor })) : deOFX.ok }
    : linhas && colunas
      ? converterExtrato(linhas.slice(1), colunas, inverter, contaId)
      : null

  return (
    <div className="estreito">
      <p className="vazio-texto">
        Exporte o extrato do banco em OFX ou CSV (Nubank, Inter, Wallet e a maioria dos bancos têm essa opção) e traga aqui. O OFX entra
        direto, sem escolher colunas. Reimportar o mesmo arquivo não duplica nada.
      </p>
      <div className="cartao">
        <input
          aria-label="Arquivo do extrato (OFX ou CSV)"
          type="file"
          accept=".ofx,.csv,text/csv,application/x-ofx"
          onChange={async (e) => {
            const arquivo = e.target.files?.[0]
            if (!arquivo) return
            const texto = await lerArquivoTexto(arquivo)
            if (pareceOFX(texto)) {
              setTextoOFX(texto)
              setLinhas(null)
              setColunas(null)
            } else {
              const l = lerCSV(texto)
              setTextoOFX(null)
              setLinhas(l)
              setColunas(l.length ? detectarColunas(l[0]) : null)
            }
            setInverter(/fatura|cartao|card|nubank_\d{4}-\d{2}-\d{2}/i.test(arquivo.name))
            setResultado('')
          }}
        />
        {(linhas || textoOFX) && (
          <>
            <label className="rotulo">Para qual conta?</label>
            <select aria-label="Para qual conta" value={contaId} onChange={(e) => setContaId(e.target.value)}>
              {f.contas.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </select>
            {linhas && <label className="rotulo">Colunas do arquivo</label>}
            {(linhas ? (['data', 'valor', 'descricao'] as const) : []).map((campo) => (
              <div key={campo} className="linha entre">
                <span>{campo === 'descricao' ? 'Descrição' : campo === 'data' ? 'Data' : 'Valor'}</span>
                <select aria-label={`Coluna de ${campo === 'descricao' ? 'descrição' : campo}`}
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
                  categoriaId: sugerirCategoria(l.descricao, f.transacoes, f.categorias, f.regras),
                  valor: l.valor,
                  descricao: l.descricao,
                  data: l.data,
                  chaveImport: l.chave,
                })),
              )
              const repetidas = convertido.ok.length - novas
              setResultado(`${novas} lançamento${novas === 1 ? '' : 's'} importado${novas === 1 ? '' : 's'}${repetidas ? `, ${repetidas} já existiam` : ''}.`)
              setLinhas(null)
              setTextoOFX(null)
            }}
          >
            Importar {convertido.ok.length} lançamentos
          </button>
        </div>
      )}
      {linhas && !colunas && <p className="dica">Não reconheci as colunas automaticamente. Escolha acima qual é a data, o valor e a descrição.</p>}
      {resultado && <p className="dica neutra">{resultado} Confira em Lançamentos os que ficaram sem categoria.</p>}
    </div>
  )
}

function AjustesFinancas() {
  const f = useFinancas()
  const [novaConta, setNovaConta] = useState('')
  const [novaCategoria, setNovaCategoria] = useState('')
  const [tipoCategoria, setTipoCategoria] = useState<'gasto' | 'receita'>('gasto')

  return (
    <div className="colunas">
      <div className="col">
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
          <input aria-label="Nova conta" value={novaConta} onChange={(e) => setNovaConta(e.target.value)} placeholder="Nova conta (ex.: Nubank, Cartão)" />
          <button type="submit">Adicionar</button>
        </form>
      </div>
      <div className="col">
        <h2>Categorias e limites mensais</h2>
        <p className="vazio-texto">O limite é opcional. Quando existe, a barra no Resumo mostra quanto falta.</p>
        <div className="cartao">
          {f.categorias.map((c) => (
            <div key={c.id} className="linha entre item">
              <span>
                {c.nome} <span className="motivo">· {c.tipo === 'transferencia' ? 'não conta como gasto' : c.tipo}</span>
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
                {/* Apagar a categoria tira ela dos lançamentos também: confirma em vez de Desfazer. */}
                <button
                  className="discreto"
                  onClick={() => confirm(`Apagar a categoria "${c.nome}"? Os lançamentos dela ficam sem categoria.`) && f.removerCategoria(c.id)}
                  aria-label={`Apagar ${c.nome}`}
                >
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
          <input aria-label="Nova categoria" value={novaCategoria} onChange={(e) => setNovaCategoria(e.target.value)} placeholder="Nova categoria" />
          <select aria-label="Tipo da nova categoria" className="mini" value={tipoCategoria} onChange={(e) => setTipoCategoria(e.target.value as 'gasto' | 'receita')}>
            <option value="gasto">Gasto</option>
            <option value="receita">Receita</option>
          </select>
          <button type="submit">Adicionar</button>
        </form>
        {f.regras.length > 0 && (
          <>
            <h2>Suas regras</h2>
            <p className="vazio-texto">Criadas ao trocar a categoria de um lançamento. Valem antes das sugestões automáticas.</p>
            <div className="cartao">
              {f.regras.map((r) => (
                <div key={r.id} className="linha entre item">
                  <span>
                    Contém "{r.contem}" <span className="motivo">→ {f.categorias.find((c) => c.id === r.categoriaId)?.nome ?? 'categoria apagada'}</span>
                  </span>
                  <button className="discreto" onClick={() => apagarComDesfazer(useFinancas, 'regras', r.id, r.contem, () => f.removerRegra(r.id))} aria-label={`Apagar a regra ${r.contem}`}>
                    ×
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export function Financas() {
  const [sub, setSub] = useState<Sub>('resumo')
  const sync = useSyncAutomatico()
  return (
    <section className="tela">
      <div className="sub-abas" role="tablist">
        {SUBS.map(([id, nome]) => (
          <button key={id} role="tab" aria-selected={sub === id} className={sub === id ? 'ativo' : ''} onClick={() => setSub(id)}>
            {nome}
          </button>
        ))}
      </div>
      {sub === 'resumo' && <Resumo sync={sync} onVerFontes={() => setSub('importar')} />}
      {sub === 'lancamentos' && <Lancamentos />}
      {sub === 'fixas' && <Fixas />}
      {sub === 'espera' && (
        <div className="estreito">
          <ListaDeEspera />
          <Metas />
        </div>
      )}
      {sub === 'importar' && (
        <>
          <div className="estreito">
            <SaudeDasFontes />
            <CapturaBancos />
            {/* Meu Pluggy é restrito a uso pessoal: só aparece em builds com VITE_OPEN_FINANCE=ligado. */}
            {import.meta.env.VITE_OPEN_FINANCE === 'ligado' && <OpenFinance sync={sync} />}
          </div>
          <Importar />
        </>
      )}
      {sub === 'ajustes' && <AjustesFinancas />}
    </section>
  )
}
