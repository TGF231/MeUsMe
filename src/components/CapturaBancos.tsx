import { useEffect, useState } from 'react'
import { BANCOS } from '../nativo/bancos'
import { Captura, processarCapturas } from '../nativo/captura'
import { ehAndroid } from '../nativo/plataforma'
import { Botao } from '../tema/megui-react.mjs'

interface Candidato {
  pacote: string
  nome: string
  vezes: number
}

/** Configuração da captura de notificações bancárias (só Android). */
export function CapturaBancos() {
  const [permitido, setPermitido] = useState<boolean | null>(null)
  const [pacotes, setPacotes] = useState<string[]>([])
  const [candidatos, setCandidatos] = useState<Candidato[]>([])

  useEffect(() => {
    if (!ehAndroid()) return
    const atualizar = async () => {
      const e = await Captura.estado()
      setPermitido(e.permitido)
      setPacotes(e.pacotes)
      setCandidatos((await Captura.candidatos()).candidatos)
      if (e.permitido) void processarCapturas()
    }
    void atualizar()
    // Relê a permissão ao voltar das configurações do sistema.
    const aoVoltar = () => document.visibilityState === 'visible' && void atualizar()
    document.addEventListener('visibilitychange', aoVoltar)
    return () => document.removeEventListener('visibilitychange', aoVoltar)
  }, [])

  if (!ehAndroid() || permitido === null) return null

  const alternar = async (pacote: string) => {
    const novos = pacotes.includes(pacote) ? pacotes.filter((p) => p !== pacote) : [...pacotes, pacote]
    await Captura.definirPacotes({ pacotes: novos })
    setPacotes(novos)
  }
  const outros = candidatos.filter((c) => !BANCOS[c.pacote])

  return (
    <div className="cartao">
      <h2 className="titulo">Gastos pelas notificações do banco</h2>
      <p className="motivo">
        Quando o banco avisa “Compra de R$ 35,90 aprovada em iFood”, o MeUsMe registra o gasto na hora, mesmo fechado. Quando o Open Finance
        trouxer o lançamento oficial, ele substitui este automaticamente.
      </p>
      <p className="motivo">
        Propaganda com valor, compra recusada e avisos de limite ou saldo são descartados. Dinheiro guardado ou resgatado de cofrinho, caixinha
        ou porquinho entra como transferência, sem contar como gasto; no resgate, o que vier a mais que o guardado entra como rendimento.
      </p>
      {permitido ? (
        <p className="motivo">Acesso liberado.</p>
      ) : (
        <>
          <Botao variante="acento" onClick={() => void Captura.abrirAjustes()}>
            Liberar acesso às notificações
          </Botao>
          <details>
            <summary>A opção aparece bloqueada (“configuração restrita”)?</summary>
            <p className="motivo">
              O Android bloqueia isso em apps instalados por arquivo APK. Para liberar: abra as informações do app, toque nos três pontos (⋮) no
              canto superior e escolha <b>Permitir configurações restritas</b>. Depois volte aqui e toque em “Liberar acesso” de novo.
            </p>
            <button onClick={() => void Captura.abrirInfoDoApp()}>Abrir informações do app</button>
          </details>
        </>
      )}

      <label className="rotulo">Apps lidos</label>
      {[...Object.entries(BANCOS), ...outros.map((c) => [c.pacote, c.nome] as const)].map(([pacote, nome]) => (
        <label key={pacote} className="check">
          <input type="checkbox" checked={pacotes.includes(pacote)} onChange={() => void alternar(pacote)} />
          {nome}
          {!BANCOS[pacote] && <span className="motivo"> · mandou {candidatos.find((c) => c.pacote === pacote)?.vezes} aviso(s) com R$</span>}
        </label>
      ))}
      <p className="motivo">
        Só o conteúdo das notificações dos apps marcados é lido. De outros apps que mencionam “R$”, o MeUsMe guarda apenas o nome, para você
        poder marcar se for um banco.
      </p>
    </div>
  )
}
