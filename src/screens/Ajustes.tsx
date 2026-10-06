import { useState } from 'react'
import { conectarGoogle, desconectarGoogle, sincronizarGoogle } from '../google'
import { notificar, pedirPermissao, permissaoNotificacao } from '../notificacoes'
import { useAgenda } from '../stores/agenda'
import { useConfig } from '../stores/config'
import { baixarArquivo, hoje } from '../util'

const CHAVES_BACKUP = ['meusme', 'meusme-financas', 'meusme-agenda', 'meusme-config']

function Notificacoes() {
  const cfg = useConfig()
  const [permissao, setPermissao] = useState(permissaoNotificacao())

  return (
    <div className="cartao">
      <h2 className="titulo">Notificações</h2>
      {permissao === 'granted' ? (
        <p className="motivo">Ativadas neste aparelho. ✓</p>
      ) : permissao === 'denied' ? (
        <p className="dica">
          O navegador está bloqueando as notificações. Libere nas configurações do site (cadeado ao lado do endereço) e recarregue.
        </p>
      ) : permissao === 'indisponivel' ? (
        <p className="dica">
          Este navegador não oferece notificações aqui. No celular elas exigem o app publicado em https e instalado na tela inicial.
        </p>
      ) : (
        <button className="primario" onClick={async () => setPermissao(await pedirPermissao())}>
          Ativar notificações
        </button>
      )}
      <button onClick={() => void notificar('Teste do MeUsMe', 'Se você está vendo isto, os avisos estão funcionando.', 'teste')}>
        Enviar notificação de teste
      </button>
      <p className="dica neutra">
        Os avisos funcionam enquanto o MeUsMe estiver aberto, mesmo minimizado ou em outra aba. Com o app totalmente fechado, isso só será
        possível depois de publicar o app com um servidor.
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
      <Notificacoes />
      <Google />
      <Backup />
    </section>
  )
}
