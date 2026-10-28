import { useState } from 'react'
import { EventoForm } from '../components/EventoForm'
import { LancamentoForm } from '../components/LancamentoForm'
import { LembreteForm } from '../components/LembreteForm'
import { PassoForm } from '../components/PassoForm'
import { useStore } from '../store'
import { useConfig } from '../stores/config'
import { useFinancas } from '../stores/financas'
import type { Captura } from '../types'
import { lerGasto, reais } from '../util'
import { BotaoVoz } from '../components/BotaoVoz'

type Modo =
  | { tipo: 'passo'; projetoId: string | null }
  | { tipo: 'projeto' }
  | { tipo: 'gasto' }
  | { tipo: 'lembrete' }
  | { tipo: 'evento' }
  | null

function Processar({ captura }: { captura: Captura }) {
  const s = useStore()
  const [modo, setModo] = useState<Modo>(null)
  const [chegada, setChegada] = useState('')
  const [titulo, setTitulo] = useState(captura.texto)
  const ativos = s.projetos.filter((p) => !p.concluidoEm)
  const gasto = lerGasto(captura.texto)
  const resolver = () => s.descartarCaptura(captura.id)
  const adiarCompra = useFinancas((f) => f.adiarCompra)
  const horasDeEspera = useConfig((c) => c.horasDeEspera)
  const cancelar = () => setModo(null)

  if (modo?.tipo === 'gasto')
    return <LancamentoForm inicial={gasto ?? { descricao: captura.texto }} onPronto={resolver} onCancelar={cancelar} />
  if (modo?.tipo === 'lembrete') return <LembreteForm inicial={captura.texto} onPronto={resolver} onCancelar={cancelar} />
  if (modo?.tipo === 'evento') return <EventoForm inicial={{ titulo: captura.texto }} onPronto={resolver} onCancelar={cancelar} />

  if (modo?.tipo === 'passo') {
    return (
      <PassoForm
        inicial={captura.texto}
        projetoId={modo.projetoId}
        onSalvar={(t, e) => {
          s.criarPasso(modo.projetoId, t, e)
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

  return (
    <div className="linha acoes">
      {gasto && (
        <button className="primario" onClick={() => setModo({ tipo: 'gasto' })}>
          Registrar gasto de {reais(gasto.valor)}
        </button>
      )}
      <button onClick={() => setModo({ tipo: 'passo', projetoId: null })}>Tarefa solta</button>
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
      {!gasto && <button onClick={() => setModo({ tipo: 'gasto' })}>Gasto</button>}
      <button
        onClick={() => {
          adiarCompra(gasto?.descricao ?? captura.texto, gasto?.valor, horasDeEspera)
          resolver()
        }}
        title={`Vai para Finanças → Antes de comprar, e o app pergunta de novo em ${horasDeEspera}h`}
      >
        Quero comprar: esperar {horasDeEspera}h
      </button>
      <button onClick={() => setModo({ tipo: 'evento' })}>Compromisso</button>
      <button onClick={() => setModo({ tipo: 'lembrete' })}>Lembrete</button>
      <button
        onClick={() => {
          s.estacionarIdeia(captura.texto, null)
          s.descartarCaptura(captura.id)
        }}
      >
        É só uma ideia
      </button>
      <button className="discreto" onClick={() => s.descartarCaptura(captura.id)}>
        Apagar
      </button>
    </div>
  )
}

export function Caixa() {
  const s = useStore()
  const [texto, setTexto] = useState('')
  const soltas = s.ideias.filter((i) => !i.projetoId)

  return (
    <section className="tela">
      <div className="colunas">
        <div className="col">
          <form
            className="cartao compacto"
            onSubmit={(e) => {
              e.preventDefault()
              if (!texto.trim()) return
              s.capturar(texto.trim())
              setTexto('')
            }}
          >
            <label className="rotulo">Tire da cabeça. Organizar fica para depois.</label>
            <div className="linha">
              <input value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Qualquer coisa…" aria-label="Capturar na Caixa" />
              <BotaoVoz onTexto={setTexto} />
              <button type="submit" className="primario">
                Guardar
              </button>
            </div>
          </form>

          {s.capturas.length === 0 ? (
            <p className="vazio-texto">Caixa vazia. Sua cabeça agradece.</p>
          ) : (
            <>
              <h2>Para processar ({s.capturas.length})</h2>
              {s.capturas.map((c) => (
                <div key={c.id} className="cartao">
                  <p className="passo pequeno">{c.texto}</p>
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
