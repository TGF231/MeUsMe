import { useState } from 'react'
import { BotaoVoz } from '../components/BotaoVoz'
import { ComoEscrever } from '../components/ComoEscrever'
import { EventoForm } from '../components/EventoForm'
import { LancamentoForm } from '../components/LancamentoForm'
import { LembreteForm } from '../components/LembreteForm'
import { PassoForm } from '../components/PassoForm'
import { GravarRecado, OuvirRecado } from '../components/Recado'
import { guardarVarios, organizar } from '../motor/executar'
import { lerDinheiro, type Dinheiro } from '../motor/extratores'
import { aplicarRegras, prepararCompromisso } from '../motor/regras'
import { EXEMPLOS_DE_CAMPO } from '../motor/tutorial'
import { diasDesde, paradas } from '../calculos'
import { apagarComDesfazer } from '../desfazer'
import { dividirEmItens } from '../dividir'
import { useStore } from '../store'
import { useConfig } from '../stores/config'
import { useFinancas } from '../stores/financas'
import { useMotor } from '../stores/motor'
import type { Classe } from '../motor/regras'
import type { Captura } from '../types'
import { dataISO, reais } from '../util'
import { Botao } from '../tema/megui-react.mjs'

type Modo =
  | { tipo: 'passo'; projetoId: string | null }
  | { tipo: 'projeto' }
  | { tipo: 'gasto'; receita?: boolean }
  | { tipo: 'lembrete' }
  | { tipo: 'evento' }
  | null

/** O que todas as partes de Processar usam. */
interface Contexto {
  captura: Captura
  /** Num recado de voz o texto é só o rótulo: os formulários começam vazios para escrever ou ditar. */
  texto: string
  dinheiro: Dinheiro | null
  setModo: (m: Modo) => void
  resolver: () => void
  /** O que você fez com a captura ensina o motor (docs/MOTOR.md, parte 3). */
  aprender: (classe: Classe) => void
}

function NovoProjeto({ ctx }: Readonly<{ ctx: Contexto }>) {
  const s = useStore()
  const [titulo, setTitulo] = useState(ctx.texto)
  const [chegada, setChegada] = useState('')
  return (
    <form
      className="form"
      onSubmit={(e) => {
        e.preventDefault()
        if (!titulo.trim() || !chegada.trim()) return
        s.criarProjeto(titulo.trim(), chegada.trim())
        ctx.resolver()
      }}
    >
      <label className="rotulo">Nome do projeto</label>
      <input required aria-label="Nome do projeto" value={titulo} onChange={(e) => setTitulo(e.target.value)} />
      <label className="rotulo">Linha de chegada: como você vai saber que terminou?</label>
      <input required aria-label="Linha de chegada" autoFocus value={chegada} onChange={(e) => setChegada(e.target.value)} placeholder="Ex.: currículo enviado para 3 vagas" />
      <div className="linha">
        <Botao variante="acento" type="submit">
          Criar projeto
        </Botao>
        <button type="button" onClick={() => ctx.setModo(null)}>
          Cancelar
        </button>
      </div>
    </form>
  )
}

/** O formulário do tipo escolhido, já preenchido com o que as regras do motor entenderam. */
function FormularioDaCaptura({ ctx, modo }: Readonly<{ ctx: Contexto; modo: NonNullable<Modo> }>) {
  const s = useStore()
  const { texto, dinheiro, aprender, resolver } = ctx
  const cancelar = () => ctx.setModo(null)
  // O que as regras entendem, e o título e o dia de um compromisso sem hora ("consulta dermato dia 12").
  const [regra] = useState(() => (texto ? aplicarRegras(texto, new Date()) : null))
  const [semHora] = useState(() => {
    const { titulo, data } = prepararCompromisso(texto, new Date())
    return { titulo, data: data && dataISO(data) }
  })
  const pronto = (classe: Classe) => () => {
    aprender(classe)
    resolver()
  }

  switch (modo.tipo) {
    case 'gasto':
      return (
        <LancamentoForm
          inicial={
            dinheiro
              ? { valor: dinheiro.valor, descricao: dinheiro.descricao, tipo: (modo.receita ?? dinheiro.direcao === 'entrada') ? 'receita' : 'gasto' }
              : { descricao: texto }
          }
          onPronto={(tipo) => pronto(tipo === 'receita' ? 'receita' : 'despesa')()}
          onCancelar={cancelar}
        />
      )
    case 'lembrete':
      return <LembreteForm inicial={regra?.classe === 'lembrete' ? regra.titulo : texto} onPronto={pronto('lembrete')} onCancelar={cancelar} />
    case 'evento':
      return (
        <EventoForm
          inicial={regra?.classe === 'compromisso' ? { titulo: regra.titulo, data: regra.quando ? dataISO(regra.quando) : undefined } : semHora}
          onPronto={pronto('compromisso')}
          onCancelar={cancelar}
        />
      )
    case 'passo':
      return (
        <PassoForm
          inicial={texto}
          projetoId={modo.projetoId}
          onSalvar={(t, e, d) => {
            s.criarPasso(modo.projetoId, t, e, undefined, d)
            pronto('passo')()
          }}
          onCancelar={cancelar}
        />
      )
    case 'projeto':
      return <NovoProjeto ctx={ctx} />
  }
}

/** Uma escolha: nome e, embaixo, o que ela quer dizer, para não haver dúvida entre duas parecidas. */
function Opcao({ nome, diz, sugerida, onClick }: Readonly<{ nome: string; diz: string; sugerida?: boolean; onClick: () => void }>) {
  return (
    <button type="button" className={`opcao${sugerida ? ' sugerida' : ''}`} onClick={onClick}>
      <b>
        {nome}
        {sugerida && <span className="selo">Sugerido</span>}
      </b>
      <span>{diz}</span>
    </button>
  )
}

/**
 * As escolhas da captura, sempre nos mesmos lugares e agrupadas por pergunta (fazer, hora marcada, dinheiro, sem
 * ação). Cada uma diz o que é. O tipo provável (regras ou rede, docs/MOTOR.md) ganha a marca "Sugerido" no lugar
 * dele, sem mudar a ordem: a posição fixa evita procurar o botão a cada item.
 */
function AcoesDaCaptura({ ctx }: Readonly<{ ctx: Contexto }>) {
  const s = useStore()
  const { captura, dinheiro, setModo, aprender, resolver } = ctx
  const ativos = s.projetos.filter((p) => !p.concluidoEm)
  const adiarCompra = useFinancas((f) => f.adiarCompra)
  const horasDeEspera = useConfig((c) => c.horasDeEspera)
  const [escolhendoProjeto, setEscolhendoProjeto] = useState(false)
  const sugestao = captura.sugestao
  const semDirecao = dinheiro && !dinheiro.direcao
  const comprar = () => {
    adiarCompra(dinheiro?.descricao || captura.texto, dinheiro?.valor, horasDeEspera)
    aprender('compra')
    resolver()
  }
  const ideia = () => {
    s.estacionarIdeia(captura.texto, null)
    aprender('ideia')
    resolver()
  }
  const apagar = () =>
    // O áudio sai do aparelho junto e não dá para devolver: confirma antes. Texto volta pelo Desfazer.
    captura.audio
      ? confirm('Apagar este recado de voz? O áudio não tem como voltar.') && s.descartarCaptura(captura.id)
      : apagarComDesfazer(useStore, 'capturas', captura.id, captura.texto, () => s.descartarCaptura(captura.id))

  if (escolhendoProjeto)
    return (
      <div className="escolhas">
        <p className="rotulo">Entra em qual projeto?</p>
        <div className="opcoes">
          {ativos.map((p) => (
            <Opcao key={p.id} nome={p.titulo} diz={p.chegada} onClick={() => setModo({ tipo: 'passo', projetoId: p.id })} />
          ))}
        </div>
        <button type="button" className="discreto" onClick={() => setEscolhendoProjeto(false)}>
          Voltar
        </button>
      </div>
    )

  return (
    <div className="escolhas">
      {/* Valor com sinal ou direção clara: o app já sabe que é dinheiro, e o lançamento vem primeiro. */}
      {dinheiro && (
        <div className="linha">
          {semDirecao ? (
            (
              [
                ['Saída', false],
                ['Entrada', true],
              ] as const
            ).map(([rotulo, receita]) => (
              <Botao variante="acento" key={rotulo} onClick={() => setModo({ tipo: 'gasto', receita })}>
                {rotulo} de {reais(dinheiro.valor)}
              </Botao>
            ))
          ) : (
            <Botao variante="acento" onClick={() => setModo({ tipo: 'gasto' })}>
              Registrar {dinheiro.direcao === 'entrada' ? 'entrada' : 'gasto'} de {reais(dinheiro.valor)}
            </Botao>
          )}
        </div>
      )}
      {semDirecao && <p className="motivo">Use + ou - na frente do valor para o app lançar sozinho.</p>}

      <p className="rotulo">Fazer</p>
      <div className="opcoes">
        <Opcao nome="Tarefa" diz="Uma ação só, sem dia marcado" sugerida={sugestao === 'passo'} onClick={() => setModo({ tipo: 'passo', projetoId: null })} />
        {ativos.length > 0 && <Opcao nome="Passo de projeto" diz="Entra num projeto que já existe" onClick={() => setEscolhendoProjeto(true)} />}
        <Opcao nome="Projeto novo" diz="Precisa de vários passos até acabar" onClick={() => setModo({ tipo: 'projeto' })} />
      </div>

      <p className="rotulo">Tem hora marcada</p>
      <div className="opcoes">
        <Opcao nome="Compromisso" diz="Você vai estar lá: reunião, consulta" sugerida={sugestao === 'compromisso'} onClick={() => setModo({ tipo: 'evento' })} />
        <Opcao nome="Lembrete" diz="O app avisa na hora: ligar, pagar" sugerida={sugestao === 'lembrete'} onClick={() => setModo({ tipo: 'lembrete' })} />
      </div>

      <p className="rotulo">Dinheiro</p>
      <div className="opcoes">
        {!dinheiro && (
          <Opcao
            nome="Gasto ou entrada"
            diz="Já aconteceu: registrar"
            sugerida={sugestao === 'despesa' || sugestao === 'receita'}
            onClick={() => setModo({ tipo: 'gasto', receita: sugestao === 'receita' })}
          />
        )}
        {!captura.audio && (
          <Opcao nome="Quero comprar" diz={`Esperar ${horasDeEspera}h antes de decidir`} sugerida={sugestao === 'compra'} onClick={comprar} />
        )}
      </div>

      <p className="rotulo">Sem ação</p>
      <div className="opcoes">
        {!captura.audio && <Opcao nome="Ideia" diz="Guardar, sem obrigação de fazer" sugerida={sugestao === 'ideia'} onClick={ideia} />}
        <Opcao nome="Apagar" diz="Não serve mais" onClick={apagar} />
      </div>
    </div>
  )
}

function Processar({ captura }: Readonly<{ captura: Captura }>) {
  const s = useStore()
  const [modo, setModo] = useState<Modo>(null)
  const registrar = useMotor((m) => m.registrar)
  const texto = captura.audio ? '' : captura.texto
  const ctx: Contexto = {
    captura,
    texto,
    // Só é dinheiro com sinal, R$, "reais" ou vírgula de centavos (docs/MOTOR.md, regra 2).
    dinheiro: lerDinheiro(texto),
    setModo,
    resolver: () => s.descartarCaptura(captura.id),
    aprender: (classe) => {
      if (!captura.audio) registrar(captura.texto, classe)
    },
  }
  return modo ? <FormularioDaCaptura ctx={ctx} modo={modo} /> : <AcoesDaCaptura ctx={ctx} />
}

/**
 * Texto colado com várias linhas ou frases (V04 em docs/CONCORRENTES.md): mostra os itens antes de guardar, para
 * desmarcar o que não serve. Cada um vai para a Caixa com a sugestão do app; nada é criado sozinho.
 */
function SepararColados({ itens, onFechar }: Readonly<{ itens: string[]; onFechar: () => void }>) {
  const [tirados, setTirados] = useState<Set<number>>(new Set())
  const marcados = itens.filter((_, i) => !tirados.has(i))
  return (
    <div className="cartao compacto">
      <h2 className="rotulo">Separar em {itens.length} itens?</h2>
      <p className="motivo">Uma captura por linha ou frase. Desmarque o que não quiser guardar.</p>
      {itens.map((t, i) => (
        <label key={i} className="check">
          <input
            type="checkbox"
            checked={!tirados.has(i)}
            onChange={(e) => {
              const n = new Set(tirados)
              if (e.target.checked) n.delete(i)
              else n.add(i)
              setTirados(n)
            }}
          />
          <span>{t}</span>
        </label>
      ))}
      <div className="linha">
        {marcados.length > 0 && (
          <Botao
            variante="acento"
            onClick={() => {
              void guardarVarios(marcados)
              onFechar()
            }}
          >
            Guardar {marcados.length === 1 ? '1 item' : `${marcados.length} itens`}
          </Botao>
        )}
        <button
          onClick={() => {
            useStore.getState().capturar(itens.join('\n'))
            onFechar()
          }}
        >
          Guardar como um item só
        </button>
        <button className="discreto" onClick={onFechar}>
          Cancelar
        </button>
      </div>
    </div>
  )
}

/**
 * Organizar um item por vez: só o da vez mostra as escolhas; o resto da pilha fica numa lista curta embaixo, para
 * escolher outro ou só ver quantos faltam. As paradas há 30 dias ou mais (D09) vêm primeiro, com a pergunta delas.
 */
function FilaParaOrganizar({ velhas, recentes }: Readonly<{ velhas: Captura[]; recentes: Captura[] }>) {
  const s = useStore()
  const fila = [...velhas, ...recentes]
  const [escolhida, setEscolhida] = useState<string | null>(null)
  const atual = fila.find((c) => c.id === escolhida) ?? fila[0]
  const posicao = fila.indexOf(atual)
  const resto = fila.filter((c) => c !== atual)
  const velha = velhas.includes(atual)
  const pular = () => setEscolhida(fila[(posicao + 1) % fila.length].id)

  return (
    <>
      <div key={atual.id} className="cartao organizar">
        <div className="linha entre">
          <h2 className="rotulo">
            Organizar · {posicao + 1} de {fila.length}
          </h2>
          {fila.length > 1 && (
            <button type="button" className="discreto" onClick={pular}>
              Pular
            </button>
          )}
        </div>
        <p className="passo">{atual.texto}</p>
        {velha && <p className="motivo">Em espera há {diasDesde(atual.adiadaEm ?? atual.criadoEm)} dias. Ainda faz sentido?</p>}
        {atual.audio && <OuvirRecado id={atual.id} segundos={atual.audio.segundos} />}
        <Processar captura={atual} />
        {velha && (
          <button type="button" className="discreto" onClick={() => s.adiarCaptura(atual.id)}>
            Ainda não: perguntar daqui a 30 dias
          </button>
        )}
      </div>
      {resto.length > 0 && (
        <div className="cartao">
          <h2 className="rotulo">Depois ({resto.length})</h2>
          <ul className="lista-fila">
            {resto.map((c) => (
              <li key={c.id}>
                <button type="button" onClick={() => setEscolhida(c.id)}>
                  {c.texto}
                  {velhas.includes(c) && <span className="motivo"> · parada há {diasDesde(c.adiadaEm ?? c.criadoEm)} dias</span>}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  )
}

export function Caixa() {
  const s = useStore()
  const [texto, setTexto] = useState('')
  const [colados, setColados] = useState<string[] | null>(null)
  const soltas = s.ideias.filter((i) => !i.projetoId)
  // Paradas há 30 dias ou mais voltam no topo com uma pergunta (D09 em docs/CONCORRENTES.md).
  const velhas = paradas(s.capturas)
  const recentes = s.capturas.filter((c) => !velhas.includes(c))
  // Ideias com validade (D10): depois de 90 dias, perguntam se ainda valem.
  const ideiasVelhas = new Set(paradas(soltas, undefined, 90).map((i) => i.id))
  // O tutorial abre sozinho na primeira visita; depois, pelo "?".
  const [tutorial, setTutorial] = useState(() => !useConfig.getState().tutorialCapturaVisto)
  const [exemplo] = useState(() => EXEMPLOS_DE_CAMPO[Math.floor(Math.random() * EXEMPLOS_DE_CAMPO.length)])

  return (
    <section className="tela">
      <div className="colunas">
        <div className="col">
          <form
            className="cartao compacto"
            onSubmit={(e) => {
              e.preventDefault()
              if (!texto.trim()) return
              void organizar(texto)
              setTexto('')
            }}
          >
            <label className="rotulo">Tire da cabeça. Organizar fica para depois.</label>
            <div className="linha">
              <input
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                onPaste={(e) => {
                  // Várias linhas ou frases: pergunta antes de separar (o campo de uma linha juntaria tudo).
                  const itens = dividirEmItens(e.clipboardData.getData('text'))
                  if (itens.length < 2) return
                  e.preventDefault()
                  setColados(itens)
                }}
                placeholder={`Ex.: ${exemplo}`}
                aria-label="Deixar em espera"
              />
              {/* Falou, guardou: o ditado passa pelo motor na hora, junto do que já estava escrito. */}
              <BotaoVoz
                onTexto={(falado) => {
                  void organizar([texto.trim(), falado].filter(Boolean).join(' '))
                  setTexto('')
                }}
              />
              <button type="button" className="icone-botao" onClick={() => setTutorial(true)} aria-label="Como escrever rápido">
                ?
              </button>
              <Botao variante="acento" type="submit">
                Guardar
              </Botao>
            </div>
          </form>
          {colados && <SepararColados itens={colados} onFechar={() => setColados(null)} />}
          <GravarRecado />
          {tutorial && <ComoEscrever onFechar={() => setTutorial(false)} />}

          {s.capturas.length === 0 ? (
            <p className="vazio-texto">Nada em espera. Sua cabeça agradece.</p>
          ) : (
            <FilaParaOrganizar velhas={velhas} recentes={recentes} />
          )}
        </div>
        <div className="col">
          {soltas.length > 0 && (
            <>
              <h2>Ideias estacionadas</h2>
              <p className="vazio-texto">Guardadas sem pressão. Nenhuma delas é obrigação.</p>
              {soltas.map((i) => (
                <div key={i.id} className="cartao linha entre">
                  <span>
                    {i.texto}
                    {ideiasVelhas.has(i.id) && <span className="motivo"> · guardada há {diasDesde(i.adiadaEm ?? i.criadoEm)} dias. Ainda vale?</span>}
                  </span>
                  <span className="linha">
                    {ideiasVelhas.has(i.id) && (
                      <button className="discreto" onClick={() => s.adiarIdeia(i.id)}>
                        Ainda vale
                      </button>
                    )}
                    <button
                      onClick={() => {
                        s.capturar(i.texto)
                        s.removerIdeia(i.id)
                      }}
                    >
                      Agir nela
                    </button>
                    <button
                      className="discreto"
                      onClick={() => apagarComDesfazer(useStore, 'ideias', i.id, i.texto, () => s.removerIdeia(i.id))}
                      aria-label={`Apagar ${i.texto}`}
                    >
                      Apagar
                    </button>
                  </span>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </section>
  )
}
