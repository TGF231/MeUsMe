import { useState } from 'react'
import esquemaSql from '../../supabase/esquema.sql?raw'
import { esquecerEstadoDeSincronizacao, sincronizarAgora, useStatusSync } from '../sync/motor'
import {
  apagarConfigSync,
  apagarConta,
  codigoDeConfiguracao,
  confirmarCodigo,
  enviarCodigo,
  lerCodigoDeConfiguracao,
  lerConfigSync,
  sair,
  salvarConfigSync,
  temServidorEmbutido,
  usandoServidorProprio,
} from '../sync/remoto'
import { hora } from '../util'

function copiar(texto: string, avisar: (m: string) => void, mensagem: string) {
  navigator.clipboard?.writeText(texto).then(
    () => avisar(mensagem),
    () => avisar('Não consegui copiar automaticamente. Selecione o texto e copie à mão.'),
  )
}

/** Configuração de um projeto Supabase próprio (opção avançada). */
function ServidorProprio({ aoMudar }: { aoMudar: () => void }) {
  const [url, setUrl] = useState('')
  const [chave, setChave] = useState('')
  const [codigo, setCodigo] = useState('')
  const [mensagem, setMensagem] = useState('')
  const proprio = usandoServidorProprio()
  const cfg = lerConfigSync()

  if (proprio && cfg)
    return (
      <div className="form">
        <p className="motivo">Este aparelho usa um servidor próprio. Para os outros aparelhos usarem o mesmo, cole este código neles:</p>
        <code className="codigo">{codigoDeConfiguracao(cfg)}</code>
        <div className="linha">
          <button onClick={() => copiar(codigoDeConfiguracao(cfg), setMensagem, 'Código copiado.')}>Copiar código</button>
          <button
            className="discreto"
            onClick={() => {
              apagarConfigSync()
              esquecerEstadoDeSincronizacao()
              aoMudar()
            }}
          >
            {temServidorEmbutido() ? 'Voltar ao servidor do MeUsMe' : 'Esquecer este servidor'}
          </button>
        </div>
        {mensagem && <p className="dica neutra">{mensagem}</p>}
      </div>
    )

  return (
    <div className="form">
      <ol className="passos-guia">
        <li>
          Crie um projeto em <b>supabase.com</b> (plano gratuito).
        </li>
        <li>
          No <b>SQL Editor</b>, rode o script de preparação.{' '}
          <button className="mini-botao" onClick={() => copiar(esquemaSql, setMensagem, 'Script copiado. Cole no SQL Editor e clique em Run.')}>
            Copiar script
          </button>
        </li>
        <li>
          Em <b>Authentication → Email Templates → Magic Link</b>, inclua <code>{'{{ .Token }}'}</code> no texto, para o e-mail trazer o código.
        </li>
        <li>
          Cole abaixo a <b>Project URL</b> e a chave <b>anon/publishable</b> (Project Settings → API).
        </li>
      </ol>
      <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://xxxx.supabase.co" spellCheck={false} aria-label="Project URL" />
      <input value={chave} onChange={(e) => setChave(e.target.value)} placeholder="Chave anon / publishable" spellCheck={false} autoComplete="off" aria-label="Chave" />
      <button
        disabled={!/^https:\/\/.+/.test(url.trim()) || chave.trim().length < 20}
        onClick={() => {
          salvarConfigSync({ url, chave })
          esquecerEstadoDeSincronizacao()
          aoMudar()
        }}
      >
        Usar este servidor
      </button>
      <label className="rotulo">Ou cole o código de outro aparelho:</label>
      <div className="linha">
        <input className="flex" value={codigo} onChange={(e) => setCodigo(e.target.value)} placeholder="Código de configuração" spellCheck={false} />
        <button
          disabled={!codigo.trim()}
          onClick={() => {
            const c = lerCodigoDeConfiguracao(codigo)
            if (!c) return setMensagem('Código inválido. Copie de novo no outro aparelho.')
            salvarConfigSync(c)
            esquecerEstadoDeSincronizacao()
            aoMudar()
          }}
        >
          Usar código
        </button>
      </div>
      {mensagem && <p className="dica neutra">{mensagem}</p>}
    </div>
  )
}

export function Sincronizacao() {
  const status = useStatusSync()
  const [email, setEmail] = useState('')
  const [codigo, setCodigo] = useState('')
  const [etapa, setEtapa] = useState<'email' | 'codigo'>('email')
  const [ocupado, setOcupado] = useState(false)
  const [mensagem, setMensagem] = useState('')
  const temServidor = lerConfigSync() !== null
  const logado = status.situacao === 'ociosa' || status.situacao === 'sincronizando' || status.situacao === 'erro'

  const tentar = async (acao: () => Promise<void>) => {
    setOcupado(true)
    setMensagem('')
    try {
      await acao()
    } catch (e) {
      setMensagem((e as Error).message)
    } finally {
      setOcupado(false)
    }
  }

  const avancado = (
    <details>
      <summary>Avançado: usar um servidor próprio</summary>
      <ServidorProprio aoMudar={status.reiniciar} />
    </details>
  )

  // Build sem servidor embutido e sem servidor próprio configurado.
  if (!temServidor)
    return (
      <div className="cartao">
        <h2 className="titulo">Sincronização e backup</h2>
        <p className="motivo">Esta versão do app foi compilada sem servidor de sincronização. Seus dados ficam só neste aparelho.</p>
        {avancado}
      </div>
    )

  if (logado)
    return (
      <div className="cartao">
        <h2 className="titulo">Sincronização e backup</h2>
        <p className="motivo">
          Conectado como <b>{status.email}</b>.{' '}
          {status.situacao === 'sincronizando' ? 'Sincronizando…' : status.ultima ? `Tudo salvo às ${hora(status.ultima)}.` : ''}
        </p>
        {status.situacao === 'erro' && <p className="dica">{status.erro}</p>}
        <p className="motivo">Para usar em outro aparelho, é só entrar nele com o mesmo e-mail.</p>
        <div className="linha">
          <button onClick={() => void sincronizarAgora()} disabled={status.situacao === 'sincronizando'}>
            Sincronizar agora
          </button>
          <button onClick={() => void tentar(async () => (await sair(), status.reiniciar()))}>Sair</button>
        </div>
        {mensagem && <p className="dica">{mensagem}</p>}
        <details>
          <summary>Apagar minha conta</summary>
          <p className="motivo">
            Apaga sua conta e tudo o que está guardado no servidor. Os dados que estão neste aparelho continuam aqui. Não dá para desfazer.
          </p>
          <button
            className="perigo"
            disabled={ocupado}
            onClick={() => {
              if (!confirm(`Apagar a conta ${status.email} e todos os dados do servidor? Não dá para desfazer.`)) return
              void tentar(async () => {
                await apagarConta()
                esquecerEstadoDeSincronizacao()
                status.reiniciar()
              })
            }}
          >
            Apagar conta e dados do servidor
          </button>
        </details>
        {usandoServidorProprio() && avancado}
      </div>
    )

  return (
    <div className="cartao">
      <h2 className="titulo">Sincronização e backup</h2>
      <p className="motivo">
        Seus dados estão só neste aparelho. Entre com seu e-mail para guardar uma cópia na nuvem e usar o MeUsMe no celular e no computador.
        Sem senha: chega um código no seu e-mail.
      </p>
      {etapa === 'email' ? (
        <form
          className="linha"
          onSubmit={(e) => {
            e.preventDefault()
            void tentar(async () => {
              await enviarCodigo(email.trim())
              setEtapa('codigo')
            })
          }}
        >
          <input
            className="flex"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="seu@email.com"
            autoComplete="email"
            aria-label="E-mail"
          />
          <button type="submit" className="primario" disabled={ocupado || !/.+@.+\..+/.test(email)}>
            {ocupado ? 'Enviando…' : 'Enviar código'}
          </button>
        </form>
      ) : (
        <form
          className="form"
          onSubmit={(e) => {
            e.preventDefault()
            void tentar(async () => {
              await confirmarCodigo(email.trim(), codigo)
              setCodigo('')
              status.reiniciar()
            })
          }}
        >
          <label className="rotulo">Digite o código que enviamos para {email}:</label>
          <div className="linha">
            <input
              className="flex codigo-otp"
              value={codigo}
              onChange={(e) => setCodigo(e.target.value)}
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="000000"
              maxLength={10}
              autoFocus
              aria-label="Código"
            />
            <button type="submit" className="primario" disabled={ocupado || codigo.replace(/\D/g, '').length < 6}>
              {ocupado ? 'Entrando…' : 'Entrar'}
            </button>
          </div>
          <div className="linha">
            <button type="button" className="discreto" onClick={() => void tentar(() => enviarCodigo(email.trim()))} disabled={ocupado}>
              Reenviar código
            </button>
            <button type="button" className="discreto" onClick={() => (setEtapa('email'), setCodigo(''), setMensagem(''))}>
              Usar outro e-mail
            </button>
          </div>
        </form>
      )}
      {mensagem && <p className="dica">{mensagem}</p>}
      {avancado}
    </div>
  )
}
