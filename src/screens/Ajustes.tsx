import { useEffect, useState } from 'react'
import { conectarGoogle, desconectarGoogle, sincronizarGoogle } from '../google'
import { atalhoAtual, atalhoLegivel, definirIniciaComWindows, iniciaComWindows } from '../nativo/desktop'
import { Sincronizacao } from '../components/Sincronizacao'
import { Sobre } from '../components/Sobre'
import { ehDesktop, ehNativo } from '../nativo/plataforma'
import { abrirAjusteDeHorarioExato, horarioExatoLiberado, lerPermissao, notificar, pedirPermissao, type Permissao } from '../notificacoes'
import { useAgenda } from '../stores/agenda'
import { useConfig } from '../stores/config'
import { useStatusSync } from '../sync/motor'
import { ACENTOS_PRONTOS, pareceSemantica, resolverAcento } from '../tema/cores'
import { temaEfetivo } from '../tema/aplicar'
import { baixarArquivo, hoje } from '../util'

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
    // Relê ao voltar das configurações do sistema.
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

      <label className="rotulo">Revisão da semana (aviso às 10h)</label>
      <div className="chips">
        {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((nome, d) => (
          <button key={d} className={cfg.diaRevisao === d ? 'ativo' : ''} onClick={() => cfg.ajustar({ diaRevisao: d })}>
            {nome}
          </button>
        ))}
        <button className={cfg.diaRevisao < 0 ? 'ativo' : ''} onClick={() => cfg.ajustar({ diaRevisao: -1 })}>
          Desligada
        </button>
      </div>
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

function Aparencia() {
  const cfg = useConfig()
  const livre = !ACENTOS_PRONTOS.some((a) => a.id === cfg.acento)
  const modo = temaEfetivo()
  const amostra = (id: string) => resolverAcento(id)[modo].acento
  const conflito = pareceSemantica(resolverAcento(cfg.acento))

  return (
    <div className="cartao">
      <h2 className="titulo">Aparência</h2>
      <label className="rotulo">Tema</label>
      <div className="segmentado">
        {(
          [
            ['auto', 'Automático'],
            ['claro', 'Claro'],
            ['escuro', 'Escuro'],
          ] as const
        ).map(([id, nome]) => (
          <button key={id} className={cfg.tema === id ? 'ativo' : ''} onClick={() => cfg.ajustar({ tema: id })}>
            {nome}
          </button>
        ))}
      </div>
      <p className="motivo">Automático segue o tema do sistema. Vale só para este aparelho.</p>

      <label className="rotulo">Cor de destaque</label>
      <div className="amostras" role="radiogroup" aria-label="Cor de destaque">
        {ACENTOS_PRONTOS.map((a) => (
          <button
            key={a.id}
            role="radio"
            aria-checked={cfg.acento === a.id}
            className={`amostra ${cfg.acento === a.id ? 'ativo' : ''}`}
            onClick={() => cfg.ajustar({ acento: a.id })}
          >
            <span className="bolinha" style={{ background: amostra(a.id) }} />
            {a.nome}
          </button>
        ))}
        <label className={`amostra ${livre ? 'ativo' : ''}`}>
          <span className="bolinha" style={{ background: livre ? amostra(cfg.acento) : 'conic-gradient(var(--erro), var(--aviso), var(--ok), var(--info), var(--erro))' }} />
          Outra cor
          <input
            type="color"
            value={livre ? cfg.acento : resolverAcento(cfg.acento).claro.acento.toLowerCase()}
            onChange={(e) => cfg.ajustar({ acento: e.target.value.toUpperCase() })}
            aria-label="Escolher outra cor de destaque"
          />
        </label>
      </div>
      {conflito && (
        <p className="dica">
          Essa cor fica parecida com a de {conflito === 'erro' ? 'erro' : conflito === 'aviso' ? 'aviso' : '“tudo certo”'}. Com as duas iguais, os
          alertas passam despercebidos. Prefira um tom mais escuro ou outra cor.
        </p>
      )}
      <div className="linha previa">
        <button className="primario">Botão principal</button>
        <button className="ativo">Selecionado</button>
        <span className="selo">etiqueta</span>
      </div>
      <p className="motivo">
        A Assinatura é a mesma dos seus programas PySide6. Em outra cor, o app ajusta sozinho a versão do tema escuro e o texto por cima para
        continuarem legíveis. A cor de destaque acompanha você em todos os aparelhos.
      </p>
    </div>
  )
}

function Windows() {
  const [atalho, setAtalho] = useState('')
  const [autostart, setAutostart] = useState<boolean | null>(null)

  useEffect(() => {
    if (!ehDesktop()) return
    void atalhoAtual().then(setAtalho)
    void iniciaComWindows().then(setAutostart)
  }, [])

  if (!ehDesktop()) return null
  return (
    <div className="cartao">
      <h2 className="titulo">Windows</h2>
      <p className="motivo">
        Captura rápida de qualquer programa: <kbd className="tecla">{atalho ? atalhoLegivel(atalho) : '…'}</kbd>
      </p>
      {atalho && !atalho.startsWith('super') && (
        <p className="dica">O Windows não liberou Win + Ctrl + Alt + Espaço; o atalho acima é o reserva.</p>
      )}
      <label className="check">
        <input
          type="checkbox"
          checked={autostart ?? false}
          disabled={autostart === null}
          onChange={async (e) => {
            await definirIniciaComWindows(e.target.checked)
            setAutostart(await iniciaComWindows())
          }}
        />
        Iniciar junto com o Windows (fica na bandeja, perto do relógio)
      </label>
      <p className="motivo">
        Fechar a janela não encerra o MeUsMe: ele continua na bandeja medindo o tempo por programa e mandando avisos. Para sair de verdade, use o
        ícone da bandeja → Sair.
      </p>
    </div>
  )
}

function Backup() {
  const [mensagem, setMensagem] = useState('')
  return (
    <div className="cartao">
      <h2 className="titulo">Backup</h2>
      <p className="motivo">
        Um arquivo com todos os seus dados. Exporte de vez em quando: é a garantia de que nada se perde, com ou sem sincronização.
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
                // Valida tudo antes de gravar qualquer coisa: um arquivo pela metade não pode deixar dados pela metade.
                const validos = CHAVES_BACKUP.filter((k) => typeof backup.dados?.[k] === 'string')
                if (validos.length === 0) throw new Error('O backup está vazio.')
                for (const k of validos) {
                  const conteudo = JSON.parse(backup.dados[k]) as { state?: unknown }
                  if (!conteudo || typeof conteudo.state !== 'object') throw new Error('O backup está danificado. Nada foi alterado.')
                }
                const sincronizando = ['ociosa', 'sincronizando', 'erro'].includes(useStatusSync.getState().situacao)
                const aviso = sincronizando
                  ? 'Substituir TODOS os dados pelo backup? A sincronização está ligada: o conteúdo do backup também vai substituir o que está nos seus outros aparelhos.'
                  : 'Substituir TODOS os dados deste aparelho pelo backup?'
                if (!confirm(aviso)) return
                for (const k of CHAVES_BACKUP) {
                  const v = backup.dados?.[k]
                  if (typeof v === 'string') localStorage.setItem(k, v)
                }
                location.reload()
              } catch (x) {
                setMensagem(x instanceof SyntaxError ? 'O arquivo não é um backup válido. Nada foi alterado.' : (x as Error).message)
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
      <Aparencia />
      <Sincronizacao />
      <Windows />
      <Notificacoes />
      <Google />
      <Backup />
      <Sobre />
    </section>
  )
}
