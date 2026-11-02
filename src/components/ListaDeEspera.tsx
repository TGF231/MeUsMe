import { useState } from 'react'
import { useAgora } from '../hooks'
import { useConfig } from '../stores/config'
import { efeitoDaCompra } from '../compra'
import { previsaoDoMes, useFinancas } from '../stores/financas'
import type { Desejo } from '../types'
import { lerDinheiro } from '../motor/extratores'
import { dataISO, hora, lerValor, nomeDoDia, reais } from '../util'
import { LancamentoForm } from './LancamentoForm'

const PRAZOS = [24, 48, 72, 168]
const nomePrazo = (h: number) => (h === 168 ? '1 semana' : `${h}h`)

/**
 * Antes de comprar: a vontade espera um prazo e o app pergunta de novo.
 * Impulso fica mais fraco com o tempo; a pergunta chega quando a decisão já não é no calor do momento.
 */
export function ListaDeEspera() {
  const f = useFinancas()
  const cfg = useConfig()
  const agora = useAgora(60_000)
  const [texto, setTexto] = useState('')
  const [comprando, setComprando] = useState<Desejo | null>(null)

  const esperando = f.desejos.filter((d) => !d.decisao).sort((a, b) => a.decidirEm - b.decidirEm)
  const desistidos = f.desejos.filter((d) => d.decisao === 'desisti')
  const previsao = previsaoDoMes(f.contas, f.transacoes, f.fixas)
  const economia = desistidos.reduce((t, d) => t + (d.valor ?? 0), 0)

  if (comprando)
    return (
      <div className="cartao">
        <p className="rotulo">Registrar a compra de “{comprando.texto}”</p>
        <LancamentoForm
          inicial={{ descricao: comprando.texto, valor: comprando.valor }}
          onPronto={() => {
            f.decidirCompra(comprando.id, 'comprei')
            setComprando(null)
          }}
          onCancelar={() => setComprando(null)}
        />
      </div>
    )

  return (
    <>
      <form
        className="cartao form"
        onSubmit={(e) => {
          e.preventDefault()
          if (!texto.trim()) return
          // Aqui o campo já é de valor: "250 fone novo" vale sem R$.
          const g = lerDinheiro(texto, { exigirMoeda: false })
          f.adiarCompra(g?.descricao ?? texto.trim(), g?.valor ?? lerValor(texto) ?? undefined, cfg.horasDeEspera)
          setTexto('')
        }}
      >
        <label className="rotulo">Vontade de comprar algo? Anote e espere antes de decidir.</label>
        <div className="linha">
          <input aria-label="O que você quer comprar" className="flex" value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Ex.: 250 fone novo" />
          <button type="submit" className="primario">
            Esperar {nomePrazo(cfg.horasDeEspera)}
          </button>
        </div>
        <div className="chips" role="group" aria-label="Quanto tempo esperar">
          {PRAZOS.map((h) => (
            <button type="button" key={h} className={cfg.horasDeEspera === h ? 'ativo' : ''} aria-pressed={cfg.horasDeEspera === h} onClick={() => cfg.ajustar({ horasDeEspera: h })}>
              {nomePrazo(h)}
            </button>
          ))}
        </div>
      </form>

      {esperando.length === 0 && <p className="vazio-texto">Nada esperando. Quando der vontade de comprar, anote aqui ou na Caixa.</p>}
      {esperando.map((d) => {
        const pronto = d.decidirEm <= agora
        return (
          <div key={d.id} className="cartao linha entre">
            <span>
              {d.texto}
              {d.valor ? ` · ${reais(d.valor)}` : ''}
              <br />
              {d.valor ? <EfeitoDaCompra valor={d.valor} previsao={previsao} /> : null}
              <span className="motivo">
                {pronto ? 'O prazo passou. Ainda quer?' : `Decida a partir de ${nomeDoDia(dataISO(d.decidirEm)).toLowerCase()} às ${hora(d.decidirEm)}`}
              </span>
            </span>
            <span className="linha">
              {pronto && (
                <button className="primario" onClick={() => setComprando(d)}>
                  Comprei
                </button>
              )}
              <button onClick={() => f.decidirCompra(d.id, 'desisti')}>Desisti</button>
            </span>
          </div>
        )
      })}

      {desistidos.length > 0 && (
        <div className="cartao compacto">
          <p>
            Você deixou passar {desistidos.length} compra{desistidos.length > 1 ? 's' : ''}
            {economia > 0 && (
              <>
                , <b>{reais(economia)}</b> que ficaram no bolso
              </>
            )}
            .
          </p>
        </div>
      )}
    </>
  )
}

/** Efeito da compra no "livre por dia" até o fim do mês, antes de decidir (D27). Em tom neutro: é informação, não bronca. */
function EfeitoDaCompra({ valor, previsao }: { valor: number; previsao: ReturnType<typeof previsaoDoMes> }) {
  const e = efeitoDaCompra(previsao, valor)
  return (
    <span className="motivo">
      {e.falta > 0
        ? `Passa do que está livre no mês em ${reais(e.falta)}.`
        : `Se comprar, o livre por dia vai de ${reais(e.porDiaAntes)} para ${reais(e.porDiaDepois)}${e.diasDeLivre ? ` (≈ ${String(e.diasDeLivre).replace('.', ',')} dias do livre de hoje)` : ''}.`}
      <br />
    </span>
  )
}
