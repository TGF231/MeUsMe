import { useEffect, useState } from 'react'
import esquemaSql from '../../supabase/esquema.sql?raw'
import { conectarGoogle, desconectarGoogle, sincronizarGoogle } from '../google'
import { ehNativo } from '../nativo/plataforma'
import { abrirAjusteDeHorarioExato, horarioExatoLiberado, lerPermissao, notificar, pedirPermissao, type Permissao } from '../notificacoes'
import { useAgenda } from '../stores/agenda'
import { useConfig } from '../stores/config'
import { sincronizarAgora, useStatusSync } from '../sync/motor'
import {
  apagarConfigSync,
  codigoDeConfiguracao,
  criarConta,
  entrar,
  lerCodigoDeConfiguracao,
  lerConfigSync,
  sair,
  salvarConfigSync,
} from '../sync/remoto'
import { baixarArquivo, hoje, hora } from '../util'

const CHAVES_BACKUP = ['meusme', 'meusme-financas', 'meusme-agenda', 'meusme-config']

function Notificacoes() {
  const cfg = useConfig()
  const [permissao, setPermissao] = useState<Permissao | null>(null)
  const [exato, setExato] = useState<boolean | null>(null)
  const nativo = ehNativo()

  useEffect(() => {
    const atualizar = () => {
      void lerPermissao().then(setPermissao)
      void horarioExatoLiberado().then(setExato)
    }
    atualizar()
    // Volta da tela de ajustes do Android: relê as permissões.
    document.addEventListener('visibilitychange', atualizar)
    return () => document.removeEventListener('visibilitychange', atualizar)
  }, [])

  return (
    <div className="cartao">
      <h2 className="titulo">Notificações</h2>
      {permissao === 'granted' ? (
        <p className="motivo">Ativadas neste aparelho. ✓</p>
      ) : permissao === 'denied' ? (
        <p className="dica">
          {nativo
            ? 'O Android está bloqueando as notificações do MeUsMe. Libere em Configurações → Apps → MeUsMe → Notificações.'
            : 'O navegador está bloqueando as notificações. Libere nas configurações do site (cadeado ao lado do endereço) e recarregue.'}
        </p>
      ) : permissao === 'indisponivel' ? (
        <p className="dica">
          Este navegador não oferece notificações aqui. No celular elas exigem o app publicado em https e instalado na tela inicial.
        </p>
      ) : permissao === null ? null : (
        <button className="primario" onClick={async () => setPermissao(await pedirPermissao())}>
          Ativar notificações
        </button>
      )}
      {exato === false && (
        <div className="dica">
          Para os avisos chegarem no minuto certo, libere “Alarmes e lembretes” para o MeUsMe. Sem isso o Android pode atrasar alguns minutos.{' '}
          <button className="mini-botao" onClick={() => void abrirAjusteDeHorarioExato().then(() => horarioExatoLiberado().then(setExato))}>
            Liberar
          </button>
        </div>
      )}
      <button onClick={() => void notificar('Teste do MeUsMe', 'Se você está vendo isto, os avisos estão funcionando.', 'teste')}>
        Enviar notificação de teste
      </button>
      <p className="dica neutra">
        {nativo
          ? 'No app Android, os avisos da próxima semana ficam agendados no sistema e tocam mesmo com o app fechado.'
          : 'No navegador, os avisos funcionam enquanto o MeUsMe estiver aberto, mesmo minimizado ou em outra aba. Com o app fechado, só no app Android.'}
      </p>

      <label className="rotulo">Lembrete do check-in diário</label>
      <div className="linha">
        <input className="flex" type="time" value={cfg.horaCheckIn} onChange={(e) => cfg.ajustar({ horaCheckIn: e.target.value })} />
        <button onClick={() => cfg.ajustar({ horaCheckIn: '' })} disabled={!cfg.horaCheckIn}>
          Desligar
        </button>
      </div>

      <label className="rotulo">Aviso de contas a pagar (véspera e dia)</label>
      <div className="linha">
        <input className="flex" type="time" value={cfg.horaContas} onChange={(e) => cfg.ajustar({ horaContas: e.target.value })} />
        <button onClick={() => cfg.ajustar({ horaContas: '' })} disabled={!cfg.horaContas}>
          Desligar
        </button>
      </div>

      <label className="rotulo">Avisar antes de compromissos</label>
      <div className="chips">
        {[0, 5, 10, 15, 30, 60].map((m) => (
          <button key={m} className={cfg.minutosAntesEvento === m ? 'ativo' : ''} onClick={() => cfg.ajustar({ minutosAntesEvento: m })}>
            {m === 0 ? 'Na hora' : `${m} min`}
          </button>
        ))}
      </div>

      <label className="rotulo">Perguntar se quer pausar depois de</label>
      <div className="chips">
        {[0, 15, 25, 45, 60].map((m) => (
          <button key={m} className={cfg.avisoFocoMin === m ? 'ativo' : ''} onClick={() => cfg.ajustar({ avisoFocoMin: m })}>
            {m === 0 ? 'Nunca' : `${m} min`}
          </button>
        ))}
      </div>
      <p className="motivo">Com 1h30 no mesmo passo, o app sempre avisa: é a proteção contra hiperfoco.</p>
    </div>
  )
}

function Google() {
  if (ehNativo())
    return (
      <div className="cartao">
        <h2 className="titulo">Google Agenda</h2>
        <p className="motivo">
          O Google não permite login dentro de apps como este. No celular, seus compromissos do Google chegam pela sincronização: conecte o
          Google no PC (no navegador) e eles aparecem aqui.
        </p>
      </div>
    )
  return <GoogleNavegador />
}

function GoogleNavegador() {
  const agenda = useAgenda()
  const [clientId, setClientId] = useState(agenda.googleClientId)
  const [mensagem, setMensagem] = useState('')
  const origem = location.origin

  return (
    <div className="cartao">
      <h2 className="titulo">Google Agenda</h2>
      {agenda.googleConectado ? (
        <>
          <p className="motivo">Conectado. Seus compromissos aparecem na Agenda e na tela Agora, e o que você agenda aqui vai para o Google.</p>
          <button onClick={() => (desconectarGoogle(), setMensagem('Desconectado.'))}>Desconectar</button>
        </>
      ) : (
        <>
          <label className="rotulo">Client ID do Google</label>
          <input
            value={clientId}
            onChange={(e) => setClientId(e.target.value.trim())}
            placeholder="xxxxxxxx.apps.googleusercontent.com"
            spellCheck={false}
          />
          <button
            className="primario"
            disabled={!clientId.endsWith('.apps.googleusercontent.com')}
            onClick={async () => {
              setMensagem('')
              agenda.configurarGoogle({ googleClientId: clientId })
              try {
                await conectarGoogle()
                const n = await sincronizarGoogle()
                setMensagem(`Conectado! ${n} compromisso${n === 1 ? '' : 's'} nos próximos 30 dias.`)
              } catch (e) {
                setMensagem((e as Error).message)
              }
            }}
          >
            Conectar
          </button>
          <details>
            <summary>Como conseguir o Client ID (uma vez só, ~5 minutos)</summary>
            <ol className="passos-guia">
              <li>
                Abra <b>console.cloud.google.com</b> e crie um projeto (ex.: "MeUsMe").
              </li>
              <li>
                Em <b>APIs e serviços → Biblioteca</b>, ative a <b>Google Calendar API</b>.
              </li>
              <li>
                Em <b>Tela de consentimento OAuth</b>, escolha "Externo", preencha nome e e-mail e adicione seu próprio e-mail como{' '}
                <b>usuário de teste</b>.
              </li>
              <li>
                Em <b>Credenciais → Criar credenciais → ID do cliente OAuth</b>, escolha <b>Aplicativo da Web</b>.
              </li>
              <li>
                Em <b>Origens JavaScript autorizadas</b>, adicione <code>{origem}</code> (e depois o endereço publicado do app).
              </li>
              <li>Copie o Client ID gerado e cole acima.</li>
            </ol>
            <p className="motivo">O Client ID não é senha: ele só identifica o app. O acesso à sua agenda é autorizado por você na tela do Google.</p>
          </details>
        </>
      )}
      {mensagem && <p className="dica neutra">{mensagem}</p>}
    </div>
  )
}

function copiar(texto: string, avisar: (m: string) => void, mensagem: string) {
  navigator.clipboard?.writeText(texto).then(
    () => avisar(mensagem),
    () => avisar('Não consegui copiar automaticamente. Selecione o texto e copie à mão.'),
  )
}

function Sincronizacao() {
  const status = useStatusSync()
  const cfg = lerConfigSync()
  const [url, setUrl] = useState('')
  const [chave, setChave] = useState('')
  const [codigo, setCodigo] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const [mensagem, setMensagem] = useState('')
  const [verCodigo, setVerCodigo] = useState(false)

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

  // 1. Ainda sem servidor configurado.
  if (!cfg)
    return (
      <div className="cartao">
        <h2 className="titulo">Sincronização entre aparelhos</h2>
        <p className="motivo">
          Mantém PC e celular com os mesmos dados. Usa um projeto <b>Supabase</b> seu, no plano gratuito: os dados ficam numa conta sua, não
          num servidor de terceiros.
        </p>
        <details>
          <summary>Como configurar (uma vez só, ~10 minutos)</summary>
          <ol className="passos-guia">
            <li>
              Crie uma conta em <b>supabase.com</b> e um projeto novo (região: São Paulo). Guarde a senha do banco em lugar seguro.
            </li>
            <li>
              No projeto, abra o <b>SQL Editor</b>, cole o script de configuração e clique em <b>Run</b>.{' '}
              <button className="mini-botao" onClick={() => copiar(esquemaSql, setMensagem, 'Script copiado. Cole no SQL Editor e clique em Run.')}>
                Copiar script
              </button>
            </li>
            <li>
              Em <b>Project Settings → API</b>, copie a <b>Project URL</b> e a chave <b>anon public</b> (ou <b>publishable</b>) e cole abaixo.
            </li>
            <li>
              Opcional: em <b>Authentication → Sign In / Providers → Email</b>, desligue <i>Confirm email</i> para não precisar confirmar por
              e-mail.
            </li>
          </ol>
        </details>
        <label className="rotulo">Project URL</label>
        <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://xxxx.supabase.co" spellCheck={false} />
        <label className="rotulo">Chave anon / publishable</label>
        <input value={chave} onChange={(e) => setChave(e.target.value)} spellCheck={false} autoComplete="off" />
        <button
          className="primario"
          disabled={!/^https:\/\/.+/.test(url.trim()) || chave.trim().length < 20}
          onClick={() => {
            salvarConfigSync({ url, chave })
            status.reiniciar()
          }}
        >
          Salvar
        </button>
        <label className="rotulo">Já configurou em outro aparelho? Cole o código de lá:</label>
        <div className="linha">
          <input className="flex" value={codigo} onChange={(e) => setCodigo(e.target.value)} placeholder="Código de configuração" spellCheck={false} />
          <button
            disabled={!codigo.trim()}
            onClick={() => {
              const c = lerCodigoDeConfiguracao(codigo)
              if (!c) return setMensagem('Código inválido. Copie de novo no outro aparelho.')
              salvarConfigSync(c)
              status.reiniciar()
            }}
          >
            Usar código
          </button>
        </div>
        {mensagem && <p className="dica neutra">{mensagem}</p>}
      </div>
    )

  // 2. Servidor configurado, falta entrar.
  if (status.situacao === 'sem-login' || status.situacao === 'desligada')
    return (
      <div className="cartao">
        <h2 className="titulo">Sincronização entre aparelhos</h2>
        <p className="motivo">Entre com a mesma conta em todos os aparelhos. Na primeira vez, use “Criar conta”.</p>
        <form
          className="form"
          onSubmit={(e) => {
            e.preventDefault()
            void tentar(async () => {
              await entrar(email.trim(), senha)
              setSenha('')
              status.reiniciar()
            })
          }}
        >
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="E-mail" autoComplete="email" />
          <input
            type="password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            placeholder="Senha (mínimo 6 caracteres)"
            autoComplete="current-password"
          />
          <div className="linha">
            <button type="submit" className="primario" disabled={ocupado || !email || senha.length < 6}>
              Entrar
            </button>
            <button
              type="button"
              disabled={ocupado || !email || senha.length < 6}
              onClick={() =>
                tentar(async () => {
                  const confirmar = await criarConta(email.trim(), senha)
                  if (confirmar) setMensagem('Conta criada. Abra o e-mail do Supabase, confirme e depois toque em Entrar.')
                  else {
                    setSenha('')
                    status.reiniciar()
                  }
                })
              }
            >
              Criar conta
            </button>
          </div>
        </form>
        {mensagem && <p className="dica">{mensagem}</p>}
        <button
          className="discreto"
          onClick={() => {
            apagarConfigSync()
            status.reiniciar()
          }}
        >
          Trocar de servidor
        </button>
      </div>
    )

  // 3. Conectado.
  return (
    <div className="cartao">
      <h2 className="titulo">Sincronização entre aparelhos</h2>
      <p className="motivo">
        Conectado como <b>{status.email}</b>.{' '}
        {status.situacao === 'sincronizando' ? 'Sincronizando…' : status.ultima ? `Última sincronização às ${hora(status.ultima)}.` : ''}
      </p>
      {status.situacao === 'erro' && <p className="dica">{status.erro}</p>}
      <div className="linha">
        <button onClick={() => void sincronizarAgora()} disabled={status.situacao === 'sincronizando'}>
          Sincronizar agora
        </button>
        <button onClick={() => setVerCodigo(!verCodigo)}>Adicionar outro aparelho</button>
      </div>
      {verCodigo && (
        <div className="form">
          <p className="motivo">
            No outro aparelho, abra o MeUsMe → Ajustes → Sincronização, cole este código em “Usar código” e entre com o mesmo e-mail.
          </p>
          <code className="codigo">{codigoDeConfiguracao(cfg)}</code>
          <button onClick={() => copiar(codigoDeConfiguracao(cfg), setMensagem, 'Código copiado.')}>Copiar código</button>
        </div>
      )}
      {mensagem && <p className="dica neutra">{mensagem}</p>}
      <button
        className="discreto"
        onClick={() =>
          tentar(async () => {
            await sair()
            status.reiniciar()
          })
        }
      >
        Sair (os dados continuam neste aparelho)
      </button>
    </div>
  )
}

function Backup() {
  const [mensagem, setMensagem] = useState('')
  return (
    <div className="cartao">
      <h2 className="titulo">Backup</h2>
      <p className="motivo">
        Seus dados ficam só neste aparelho. Exporte de vez em quando, e use o mesmo arquivo para levar tudo para outro aparelho.
      </p>
      <div className="linha">
        <button
          onClick={() => {
            const dados = Object.fromEntries(CHAVES_BACKUP.map((k) => [k, localStorage.getItem(k)]))
            baixarArquivo(`meusme-backup-${hoje()}.json`, JSON.stringify({ app: 'MeUsMe', versao: 1, dados }, null, 2))
          }}
        >
          Exportar backup
        </button>
        <label className="botao-arquivo">
          Restaurar backup
          <input
            type="file"
            accept=".json,application/json"
            onChange={async (e) => {
              const arquivo = e.target.files?.[0]
              if (!arquivo) return
              try {
                const backup = JSON.parse(await arquivo.text())
                if (backup.app !== 'MeUsMe') throw new Error('Este arquivo não é um backup do MeUsMe.')
                if (!confirm('Substituir TODOS os dados deste aparelho pelo backup?')) return
                for (const k of CHAVES_BACKUP) {
                  const v = backup.dados?.[k]
                  if (typeof v === 'string') localStorage.setItem(k, v)
                }
                location.reload()
              } catch (x) {
                setMensagem((x as Error).message)
              }
            }}
          />
        </label>
      </div>
      {mensagem && <p className="dica">{mensagem}</p>}
    </div>
  )
}

export function Ajustes() {
  return (
    <section className="tela grade-ajustes">
      <Sincronizacao />
      <Notificacoes />
      <Google />
      <Backup />
    </section>
  )
}
