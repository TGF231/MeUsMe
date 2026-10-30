import { useState } from 'react'
import { criarNoGoogle, ErroGoogle } from '../google'
import { useAgenda } from '../stores/agenda'
import { useAvisos } from '../stores/config'
import { duracao, hoje, horaInput, juntarDataHora } from '../util'

const DURACOES = [15, 30, 45, 60, 90, 120]

/** Próximo múltiplo de 15 minutos. */
const proximoQuarto = () => horaInput(Math.ceil(Date.now() / 900_000) * 900_000)

interface Props {
  inicial?: { titulo?: string; passoId?: string; data?: string }
  rotulo?: string
  onPronto?: () => void
  onCancelar?: () => void
}

export function EventoForm({ inicial, rotulo = 'Criar compromisso', onPronto, onCancelar }: Props) {
  const agenda = useAgenda()
  const avisar = useAvisos((s) => s.mostrar)
  const [titulo, setTitulo] = useState(inicial?.titulo ?? '')
  const [data, setData] = useState(inicial?.data ?? hoje())
  const [horaTexto, setHoraTexto] = useState(proximoQuarto)
  const [minutos, setMinutos] = useState(30)
  const [noGoogle, setNoGoogle] = useState(agenda.googleConectado)
  const [salvando, setSalvando] = useState(false)

  return (
    <form
      className="form"
      onSubmit={async (e) => {
        e.preventDefault()
        if (!titulo.trim() || !data || !horaTexto) return
        const inicio = juntarDataHora(data, horaTexto)
        const evento = { titulo: titulo.trim(), inicio, fim: inicio + minutos * 60_000, passoId: inicial?.passoId }
        setSalvando(true)
        try {
          if (noGoogle) {
            const googleId = await criarNoGoogle(evento)
            agenda.criarEvento({ ...evento, origem: 'google', googleId })
          } else agenda.criarEvento({ ...evento, origem: 'local' })
        } catch (erro) {
          agenda.criarEvento({ ...evento, origem: 'local' })
          avisar(
            'Salvo só no MeUsMe',
            erro instanceof ErroGoogle && erro.precisaReconectar
              ? 'A conexão com o Google expirou. Toque em Sincronizar na Agenda para reconectar.'
              : String(erro instanceof Error ? erro.message : erro),
          )
        } finally {
          setSalvando(false)
        }
        onPronto?.()
      }}
    >
      <input required autoFocus={!inicial?.titulo} value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="O quê?" aria-label="Título" />
      <div className="linha">
        <input required type="date" value={data} onChange={(e) => setData(e.target.value)} aria-label="Dia" className="flex" />
        <input required type="time" value={horaTexto} onChange={(e) => setHoraTexto(e.target.value)} aria-label="Hora" className="flex" />
      </div>
      <label className="rotulo">Duração</label>
      <div className="chips" role="group" aria-label="Duração">
        {DURACOES.map((d) => (
          <button key={d} type="button" className={minutos === d ? 'ativo' : ''} aria-pressed={minutos === d} onClick={() => setMinutos(d)}>
            {duracao(d)}
          </button>
        ))}
      </div>
      {agenda.googleConectado && (
        <label className="check">
          <input type="checkbox" checked={noGoogle} onChange={(e) => setNoGoogle(e.target.checked)} />
          Também no Google Agenda
        </label>
      )}
      <div className="linha">
        <button type="submit" className="primario" disabled={salvando}>
          {salvando ? 'Salvando…' : rotulo}
        </button>
        {onCancelar && (
          <button type="button" onClick={onCancelar}>
            Cancelar
          </button>
        )}
      </div>
    </form>
  )
}
