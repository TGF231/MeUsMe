import { useState } from 'react'
import { BotaoVoz } from '../components/BotaoVoz'
import { ComoEscrever } from '../components/ComoEscrever'
import { EventoForm } from '../components/EventoForm'
import { LancamentoForm } from '../components/LancamentoForm'
import { LembreteForm } from '../components/LembreteForm'
import { PassoForm } from '../components/PassoForm'
import { GravarRecado, OuvirRecado } from '../components/Recado'
import { organizar } from '../motor/executar'
import { lerDinheiro } from '../motor/extratores'
import { aplicarRegras } from '../motor/regras'
import { EXEMPLOS_DE_CAMPO } from '../motor/tutorial'
import { useStore } from '../store'
import { useConfig } from '../stores/config'
import { useFinancas } from '../stores/financas'
import { useMotor } from '../stores/motor'
import type { Classe } from '../motor/regras'
import type { Captura } from '../types'
import { dataISO, reais } from '../util'

type Modo =
  | { tipo: 'passo'; projetoId: string | null }
  | { tipo: 'projeto' }
  | { tipo: 'gasto'; receita?: boolean }
  | { tipo: 'lembrete' }
  | { tipo: 'evento' }
  | null

function Processar({ captura }: { captura: Captura }) {
  const s = useStore()
  const [modo, setModo] = useState<Modo>(null)
  const [chegada, setChegada] = useState('')
  // Num recado de voz o texto é só o rótulo: os formulários começam vazios para escrever ou ditar.
  const texto = captura.audio ? '' : captura.texto
  const [titulo, setTitulo] = useState(texto)
  const ativos = s.projetos.filter((p) => !p.concluidoEm)
  // Só é dinheiro com R$, "reais" ou vírgula de centavos (docs/MOTOR.md, regra 2).
  const dinheiro = lerDinheiro(texto)
  // O que as regras do motor entendem, para os formulários já virem preenchidos.
  const [regra] = useState(() => (texto ? aplicarRegras(texto, new Date()) : null))
  const resolver = () => s.descartarCaptura(captura.id)
  // O que você fez com a captura ensina o motor (docs/MOTOR.md, parte 3). Recado de voz não tem texto para aprender.
  const registrar = useMotor((m) => m.registrar)
  const aprender = (classe: Classe) => !captura.audio && registrar(captura.texto, classe)
  const adiarCompra = useFinancas((f) => f.adiarCompra)
  const horasDeEspera = useConfig((c) => c.horasDeEspera)
  const cancelar = () => setModo(null)

  if (modo?.tipo === 'gasto')
    return (
      <LancamentoForm
        inicial={
          dinheiro
            ? {
                valor: dinheiro.valor,
                descricao: dinheiro.descricao,
                tipo: (modo.receita ?? dinheiro.direcao === 'entrada') ? 'receita' : 'gasto',
              }
            : { descricao: texto }
        }
        onPronto={(tipo) => {
          aprender(tipo === 'receita' ? 'receita' : 'despesa')
          resolver()
        }}
        onCancelar={cancelar}
      />
    )
  if (modo?.tipo === 'lembrete')
    return (
      <LembreteForm
        inicial={regra?.classe === 'lembrete' ? regra.titulo : texto}
        onPronto={() => {
          aprender('lembrete')
          resolver()
        }}
        onCancelar={cancelar}
      />
    )
  if (modo?.tipo === 'evento')
    return (
      <EventoForm
        inicial={regra?.classe === 'compromisso' ? { titulo: regra.titulo, data: regra.quando ? dataISO(regra.quando) : undefined } : { titulo: texto }}
        onPronto={() => {
          aprender('compromisso')
          resolver()
        }}
        onCancelar={cancelar}
      />
    )

  if (modo?.tipo === 'passo') {
    return (
      <PassoForm
        inicial={texto}
        projetoId={modo.projetoId}
        onSalvar={(t, e) => {
          s.criarPasso(modo.projetoId, t, e)
          aprender('passo')
          s.descartarCaptura(captura.id)
        }}
        onCancelar={() => setModo(null)}
      />
    )
  }

  if (modo?.tipo === 'projeto') {
    return (
      <form
        className="form"
        onSubmit={(e) => {
          e.preventDefault()
          if (!titulo.trim() || !chegada.trim()) return
          s.criarProjeto(titulo.trim(), chegada.trim())
          s.descartarCaptura(captura.id)
        }}
      >
        <label className="rotulo">Nome do projeto</label>
        <input value={titulo} onChange={(e) => setTitulo(e.target.value)} />
        <label className="rotulo">Linha de chegada: como você vai saber que terminou?</label>
        <input
          autoFocus
          value={chegada}
          onChange={(e) => setChegada(e.target.value)}
          placeholder="Ex.: currículo enviado para 3 vagas"
        />
        <div className="linha">
          <button type="submit" className="primario">
            Criar projeto
          </button>
          <button type="button" onClick={() => setModo(null)}>
            Cancelar
          </button>
        </div>
      </form>
    )
  }

  const sugestao = captura.sugestao
  const semDirecao = dinheiro && !dinheiro.direcao
  const tarefa = () => setModo({ tipo: 'passo', projetoId: null })
  const comprar = () => {
    adiarCompra(dinheiro?.descricao || captura.texto, dinheiro?.valor, horasDeEspera)
    aprender('compra')
    resolver()
  }
  const ideia = () => {
    s.estacionarIdeia(captura.texto, null)
    aprender('ideia')
    s.descartarCaptura(captura.id)
  }

  // O tipo provável (regras ou rede, docs/MOTOR.md) vem primeiro, e o botão comum dele some.
  const SUGESTOES: Partial<Record<Classe, [string, () => void]>> = {
    lembrete: ['Parece um lembrete', () => setModo({ tipo: 'lembrete' })],
    compromisso: ['Parece um compromisso', () => setModo({ tipo: 'evento' })],
    passo: ['Parece uma tarefa solta', tarefa],
    ...(!captura.audio && { ideia: ['Parece uma ideia', ideia], compra: ['Parece vontade de comprar', comprar] }),
    ...(!dinheiro && {
      despesa: ['Parece um gasto', () => setModo({ tipo: 'gasto', receita: false })],
      receita: ['Parece uma entrada', () => setModo({ tipo: 'gasto', receita: true })],
    }),
  }
  const sugerido = sugestao && SUGESTOES[sugestao]
  const saidaEntrada: [string, boolean][] = [
    ['Saída', false],
    ['Entrada', true],
  ]
  if (sugestao === 'receita') saidaEntrada.reverse()

  return (
    <>
      <div className="linha acoes">
        {sugerido && (
          <button className="primario" onClick={sugerido[1]}>
            {sugerido[0]}
          </button>
        )}
        {dinheiro &&
          semDirecao &&
          saidaEntrada.map(([rotulo, receita]) => (
            <button key={rotulo} className="primario" onClick={() => setModo({ tipo: 'gasto', receita })}>
              {rotulo} de {reais(dinheiro.valor)}
            </button>
          ))}
        {dinheiro && !semDirecao && (
          <button className="primario" onClick={() => setModo({ tipo: 'gasto' })}>
            Registrar {dinheiro.direcao === 'entrada' ? 'entrada' : 'gasto'} de {reais(dinheiro.valor)}
          </button>
        )}
        {sugestao !== 'passo' && <button onClick={tarefa}>Tarefa solta</button>}
        {ativos.length > 0 && (
          <select
            value=""
            onChange={(e) => e.target.value && setModo({ tipo: 'passo', projetoId: e.target.value })}
          >
            <option value="">Passo de projeto…</option>
            {ativos.map((p) => (
              <option key={p.id} value={p.id}>
                {p.titulo}
              </option>
            ))}
          </select>
        )}
        <button onClick={() => setModo({ tipo: 'projeto' })}>Virar projeto</button>
        {!dinheiro && sugestao !== 'despesa' && sugestao !== 'receita' && <button onClick={() => setModo({ tipo: 'gasto' })}>Gasto</button>}
        {!captura.audio && sugestao !== 'compra' && (
          <button onClick={comprar} title={`Vai para Finanças → Antes de comprar, e o app pergunta de novo em ${horasDeEspera}h`}>
            Quero comprar: esperar {horasDeEspera}h
          </button>
        )}
        {sugestao !== 'compromisso' && <button onClick={() => setModo({ tipo: 'evento' })}>Compromisso</button>}
        {sugestao !== 'lembrete' && <button onClick={() => setModo({ tipo: 'lembrete' })}>Lembrete</button>}
        {!captura.audio && sugestao !== 'ideia' && <button onClick={ideia}>É só uma ideia</button>}
        <button className="discreto" onClick={() => s.descartarCaptura(captura.id)}>
          Apagar
        </button>
      </div>
      {semDirecao && <p className="motivo">Use + ou - na frente do valor para o app lançar sozinho.</p>}
    </>
  )
}

export function Caixa() {
  const s = useStore()
  const [texto, setTexto] = useState('')
  const soltas = s.ideias.filter((i) => !i.projetoId)
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
              <input value={texto} onChange={(e) => setTexto(e.target.value)} placeholder={`Ex.: ${exemplo}`} aria-label="Capturar na Caixa" />
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
              <button type="submit" className="primario">
                Guardar
              </button>
            </div>
          </form>
          <GravarRecado />
          {tutorial && <ComoEscrever onFechar={() => setTutorial(false)} />}

          {s.capturas.length === 0 ? (
            <p className="vazio-texto">Caixa vazia. Sua cabeça agradece.</p>
          ) : (
            <>
              <h2>Para processar ({s.capturas.length})</h2>
              {s.capturas.map((c) => (
                <div key={c.id} className="cartao">
                  <p className="passo pequeno">{c.texto}</p>
                  {c.audio && <OuvirRecado id={c.id} segundos={c.audio.segundos} />}
                  <Processar captura={c} />
                </div>
              ))}
            </>
          )}
        </div>
        <div className="col">
          {soltas.length > 0 && (
            <>
              <h2>Ideias estacionadas</h2>
              <p className="vazio-texto">Guardadas sem pressão. Nenhuma delas é obrigação.</p>
              {soltas.map((i) => (
                <div key={i.id} className="cartao linha entre">
                  <span>{i.texto}</span>
                  <span className="linha">
                    <button
                      onClick={() => {
                        s.capturar(i.texto)
                        s.removerIdeia(i.id)
                      }}
                    >
                      Agir nela
                    </button>
                    <button className="discreto" onClick={() => s.removerIdeia(i.id)}>
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
