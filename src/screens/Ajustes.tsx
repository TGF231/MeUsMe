import { useEffect, useState } from 'react'
import { TAMANHOS_TEXTO } from '../acessibilidade'
import { lerBackup } from '../backup'
import { exportarBackup, quandoFoiOBackup } from '../exportarBackup'
import { ComoEscrever } from '../components/ComoEscrever'
import { paraCSV, paraICS, paraMarkdown } from '../exportar'
import { conectarGoogle, desconectarGoogle, sincronizarGoogle } from '../google'
import { atalhoAtual, atalhoLegivel, definirIniciaComWindows, iniciaComWindows } from '../nativo/desktop'
import { Sincronizacao } from '../components/Sincronizacao'
import { Sobre } from '../components/Sobre'
import { OPCIONAIS, PERFIS, type Aba } from '../navegacao'
import { Captura as PluginCaptura } from '../nativo/captura'
import { ehAndroid, ehDesktop, ehNativo } from '../nativo/plataforma'
import {
  abrirAjusteDeHorarioExato,
  horarioExatoLiberado,
  lerPermissao,
  notificar,
  pedirPermissao,
  testarComAppFechado,
  type Permissao,
} from '../notificacoes'
import { useStore } from '../store'
import { useAgenda } from '../stores/agenda'
import { useConfig } from '../stores/config'
import { useFinancas } from '../stores/financas'
import { useMotor } from '../stores/motor'
import { useStatusSync } from '../sync/motor'
import { ACENTOS_PRONTOS, pareceSemantica, resolverAcento } from '../tema/cores'
import { temaEfetivo } from '../tema/aplicar'
import { baixarArquivo, hoje } from '../util'


function Notificacoes() {
  const cfg = useConfig()
  const [permissao, setPermissao] = useState<Permissao | null>(null)
  const [exato, setExato] = useState<boolean | null>(null)
  const [bateria, setBateria] = useState<boolean | null>(null)
  const [testando, setTestando] = useState(false)
  const nativo = ehNativo()

  useEffect(() => {
    const atualizar = () => {
      void lerPermissao().then(setPermissao)
      void horarioExatoLiberado().then(setExato)
      if (ehAndroid()) void PluginCaptura.bateria().then((b) => setBateria(b.otimizado))
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
        <p className="motivo">Ativadas neste aparelho.</p>
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
      {bateria && (
        <div className="dica">
          O Android está economizando bateria do MeUsMe, e isso pode atrasar ou segurar avisos. Na lista que abre, escolha o MeUsMe e marque “Não
          otimizar”.{' '}
          <button className="mini-botao" onClick={() => void PluginCaptura.abrirBateria()}>
            Abrir ajustes de bateria
          </button>
        </div>
      )}
      <div className="linha">
        <button onClick={() => void notificar('Teste do MeUsMe', 'Se você está vendo isto, os avisos estão funcionando.', 'teste')}>
          Enviar notificação de teste
        </button>
        {nativo && (
          <button onClick={() => void testarComAppFechado().then(() => setTestando(true))}>Testar com o app fechado</button>
        )}
      </div>
      {testando && (
        <p className="dica neutra" role="status">
          Agora feche o MeUsMe e espere 1 minuto. Se o aviso não chegar, confira a permissão, os alarmes e a bateria acima.
        </p>
      )}
      <p className="dica neutra">
        {nativo
          ? 'No app Android, os avisos da próxima semana ficam agendados no sistema e tocam mesmo com o app fechado.'
          : 'No navegador, os avisos funcionam enquanto o MeUsMe estiver aberto, mesmo minimizado ou em outra aba. Com o app fechado, só no app Android.'}
      </p>

      <label className="rotulo">Lembrete do check-in diário</label>
      <div className="linha">
        <input className="flex" type="time" aria-label="Hora do check-in diário" value={cfg.horaCheckIn} onChange={(e) => cfg.ajustar({ horaCheckIn: e.target.value })} />
        <button onClick={() => cfg.ajustar({ horaCheckIn: '' })} disabled={!cfg.horaCheckIn}>
          Desligar
        </button>
      </div>

      <label className="rotulo">Aviso de contas a pagar (véspera e dia)</label>
      <div className="linha">
        <input className="flex" type="time" aria-label="Hora do aviso de contas" value={cfg.horaContas} onChange={(e) => cfg.ajustar({ horaContas: e.target.value })} />
        <button onClick={() => cfg.ajustar({ horaContas: '' })} disabled={!cfg.horaContas}>
          Desligar
        </button>
      </div>

      <label className="rotulo">Avisar antes de compromissos</label>
      <div className="chips" role="group" aria-label="Avisar antes de compromissos">
        {[0, 5, 10, 15, 30, 60].map((m) => (
          <button key={m} className={cfg.minutosAntesEvento === m ? 'ativo' : ''} aria-pressed={cfg.minutosAntesEvento === m} onClick={() => cfg.ajustar({ minutosAntesEvento: m })}>
            {m === 0 ? 'Na hora' : `${m} min`}
          </button>
        ))}
      </div>

      <label className="rotulo">Perguntar se quer pausar depois de</label>
      <div className="chips" role="group" aria-label="Perguntar se quer pausar depois de">
        {[0, 15, 25, 45, 60].map((m) => (
          <button key={m} className={cfg.avisoFocoMin === m ? 'ativo' : ''} aria-pressed={cfg.avisoFocoMin === m} onClick={() => cfg.ajustar({ avisoFocoMin: m })}>
            {m === 0 ? 'Nunca' : `${m} min`}
          </button>
        ))}
      </div>
      <p className="motivo">Com 1h30 no mesmo passo, o app sempre avisa, para o tempo não passar sem você perceber.</p>

      <label className="rotulo">Revisão da semana (aviso às 10h)</label>
      <div className="chips" role="group" aria-label="Revisão da semana (aviso às 10h)">
        {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((nome, d) => (
          <button key={d} className={cfg.diaRevisao === d ? 'ativo' : ''} aria-pressed={cfg.diaRevisao === d} onClick={() => cfg.ajustar({ diaRevisao: d })}>
            {nome}
          </button>
        ))}
        <button className={cfg.diaRevisao < 0 ? 'ativo' : ''} aria-pressed={cfg.diaRevisao < 0} onClick={() => cfg.ajustar({ diaRevisao: -1 })}>
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

/**
 * Outras agendas do Google lidas junto com a principal, como a compartilhada com a equipe (D08). Só leitura, pelo ID:
 * listar as agendas da conta pediria outro escopo e nova verificação do Google.
 */
function OutrasAgendas({ onMensagem }: { onMensagem: (m: string) => void }) {
  const agenda = useAgenda()
  const [nome, setNome] = useState('')
  const [id, setId] = useState('')
  const salvar = async (lista: { id: string; nome: string }[]) => {
    agenda.configurarGoogle({ googleAgendas: lista })
    try {
      const n = await sincronizarGoogle()
      onMensagem(`Sincronizado: ${n} compromisso${n === 1 ? '' : 's'} nos próximos 30 dias.`)
    } catch (e) {
      onMensagem((e as Error).message)
    }
  }
  return (
    <details open={agenda.googleAgendas.length > 0}>
      <summary>Outras agendas (só leitura)</summary>
      <p className="motivo">
        Para ver junto uma agenda que não é a sua principal, como a compartilhada com colegas: no Google Agenda, abra Configurações da agenda →
        Integrar agenda e copie o <b>ID da agenda</b>. Os compromissos dela aparecem aqui com o nome que você der, e não são alterados.
      </p>
      {agenda.googleAgendas.map((a) => (
        <div key={a.id} className="linha entre item">
          <span>
            {a.nome} <span className="motivo">· {a.id}</span>
          </span>
          <button className="discreto" aria-label={`Parar de ler ${a.nome}`} onClick={() => void salvar(agenda.googleAgendas.filter((x) => x.id !== a.id))}>
            Remover
          </button>
        </div>
      ))}
      <form
        className="form"
        onSubmit={(e) => {
          e.preventDefault()
          if (!nome.trim() || !id.trim() || agenda.googleAgendas.some((a) => a.id === id.trim())) return
          void salvar([...agenda.googleAgendas, { id: id.trim(), nome: nome.trim() }])
          setNome('')
          setId('')
        }}
      >
        <label className="rotulo" htmlFor="agenda-nome">
          Nome (como vai aparecer)
        </label>
        <input id="agenda-nome" required value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Equipe" />
        <label className="rotulo" htmlFor="agenda-id">
          ID da agenda
        </label>
        <input id="agenda-id" required value={id} onChange={(e) => setId(e.target.value)} placeholder="xxxx@group.calendar.google.com" spellCheck={false} />
        <button type="submit">Ler esta agenda</button>
      </form>
    </details>
  )
}

function GoogleNavegador() {
  const agenda = useAgenda()
  const [clientId, setClientId] = useState(agenda.googleClientId)
  const [mensagem, setMensagem] = useState('')
  const origem = location.origin

  const conectar = async (id: string) => {
    setMensagem('')
    agenda.configurarGoogle({ googleClientId: id })
    try {
      await conectarGoogle()
      const n = await sincronizarGoogle()
      setMensagem(`Conectado! ${n} compromisso${n === 1 ? '' : 's'} nos próximos 30 dias.`)
    } catch (e) {
      setMensagem((e as Error).message)
    }
  }

  return (
    <div className="cartao">
      <h2 className="titulo">Google Agenda</h2>
      {agenda.googleConectado ? (
        <>
          <p className="motivo">Conectado. Seus compromissos aparecem na Agenda e na tela Agora, e o que você agenda aqui vai para o Google.</p>
          <button onClick={() => (desconectarGoogle(), setMensagem('Desconectado.'))}>Desconectar</button>
          <OutrasAgendas onMensagem={setMensagem} />
        </>
      ) : (
        <>
          {agenda.googleClientId ? (
            <>
              <p className="motivo">Traga seus compromissos do Google para a Agenda e a tela Agora. Você autoriza na tela do próprio Google.</p>
              <button className="primario" onClick={() => conectar(agenda.googleClientId)}>
                Conectar ao Google
              </button>
            </>
          ) : (
            <p className="motivo">Esta versão do app foi compilada sem a conexão com o Google. A Agenda funciona normalmente, só com o que você marca aqui.</p>
          )}
          <details>
            <summary>Avançado: usar um Client ID próprio</summary>
            <label className="rotulo">Client ID do Google</label>
            <input
              value={clientId}
              onChange={(e) => setClientId(e.target.value.trim())}
              placeholder="xxxxxxxx.apps.googleusercontent.com"
              aria-label="Client ID do Google"
              spellCheck={false}
            />
            <button disabled={!clientId.endsWith('.apps.googleusercontent.com')} onClick={() => conectar(clientId)}>
              Conectar com este Client ID
            </button>
            <p className="rotulo">Como conseguir o Client ID (uma vez só, ~5 minutos)</p>
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
      {mensagem && (
          <p className="dica neutra" role="status">
            {mensagem}
          </p>
        )}
    </div>
  )
}

function Captura() {
  const organizarSozinho = useConfig((c) => c.organizarSozinho)
  const ajustar = useConfig((c) => c.ajustar)
  const [tutorial, setTutorial] = useState(false)
  const aprendidos = useMotor((m) => m.exemplos.length)
  const esquecer = useMotor((m) => m.esquecer)

  return (
    <div className="cartao">
      <h2 className="titulo">Captura</h2>
      <label className="check">
        <input type="checkbox" checked={organizarSozinho} onChange={(e) => ajustar({ organizarSozinho: e.target.checked })} />
        <span>Organizar capturas sozinho</span>
      </label>
      <p className="motivo">
        {organizarSozinho
          ? 'Hora vira compromisso, "lembrar" vira lembrete e valor com sinal vira lançamento, na hora, com Desfazer. Tudo acontece no aparelho.'
          : 'Tudo vai para a Caixa, com o tipo provável sugerido.'}
      </p>
      <p className="motivo">
        {aprendidos
          ? `O app aprendeu com ${aprendidos} ${aprendidos === 1 ? 'captura organizada' : 'capturas organizadas'} por você na Caixa. Isso fica só neste aparelho.`
          : 'Cada captura que você organiza na Caixa ensina o app a acertar o tipo da próxima. Isso fica só neste aparelho.'}
      </p>
      <div className="linha">
        <button onClick={() => setTutorial(true)}>Como escrever rápido</button>
        {aprendidos > 0 && (
          <>
            {/* Uma frase por linha, {texto, classe}: o formato de dados/motor/avaliacao.jsonl (ver o LEIA-ME de lá). */}
            <button
              className="discreto"
              onClick={() =>
                baixarArquivo(
                  `meusme-aprendizado-${hoje()}.jsonl`,
                  useMotor
                    .getState()
                    .exemplos.map(({ texto, classe }) => JSON.stringify({ texto, classe }))
                    .join('\n') + '\n',
                  'application/x-ndjson',
                )
              }
            >
              Exportar o que aprendeu
            </button>
            <button className="discreto" onClick={esquecer}>
              Esquecer o que aprendeu
            </button>
          </>
        )}
      </div>
      {tutorial && <ComoEscrever onFechar={() => setTutorial(false)} />}
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
      <div className="segmentado" role="group" aria-label="Tema">
        {(
          [
            ['auto', 'Automático'],
            ['claro', 'Claro'],
            ['escuro', 'Escuro'],
          ] as const
        ).map(([id, nome]) => (
          <button key={id} className={cfg.tema === id ? 'ativo' : ''} aria-pressed={cfg.tema === id} onClick={() => cfg.ajustar({ tema: id })}>
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
        Em qualquer cor, o app ajusta sozinho a versão do tema escuro e o texto por cima para continuarem legíveis. A cor de destaque
        acompanha você em todos os aparelhos.
      </p>
    </div>
  )
}

/** Seções do app (D14) e perfis prontos (D13): desligar só tira do menu, os dados continuam. */
function Secoes() {
  const { modulosDesligados, marcos, ajustar } = useConfig()
  const perfilAtual = PERFIS.find((p) => p.desligados.length === modulosDesligados.length && p.desligados.every((d) => modulosDesligados.includes(d)))
  const alternar = (id: Aba, ligar: boolean) =>
    ajustar({ modulosDesligados: ligar ? modulosDesligados.filter((d) => d !== id) : [...modulosDesligados, id] })
  return (
    <div className="cartao">
      <h2 className="titulo">Seções do app</h2>
      <p className="rotulo" id="perfis">
        Começar de um perfil
      </p>
      <div className="chips" role="group" aria-labelledby="perfis">
        {PERFIS.map((p) => (
          <button
            key={p.id}
            className={perfilAtual?.id === p.id ? 'ativo' : ''}
            aria-pressed={perfilAtual?.id === p.id}
            title={p.descricao}
            onClick={() => ajustar({ modulosDesligados: p.desligados })}
          >
            {p.nome}
          </button>
        ))}
      </div>
      {OPCIONAIS.map((m) => (
        <label key={m.id} className="check">
          <input type="checkbox" checked={!modulosDesligados.includes(m.id)} onChange={(e) => alternar(m.id, e.target.checked)} />
          <span>
            {m.nome} <span className="motivo">· {m.descricao}</span>
          </span>
        </label>
      ))}
      <p className="motivo">
        Agora, Caixa e Ajustes ficam sempre. Desligar só tira a seção do menu e da tela Agora: nada é apagado, e ligar de novo traz tudo de volta.
      </p>
      <label className="check">
        <input type="checkbox" checked={marcos} onChange={(e) => ajustar({ marcos: e.target.checked })} />
        <span>
          Marcos <span className="motivo">· uma linha na comemoração do 1º, 10º, 50º, 100º passo… Sem pontos nem sequência.</span>
        </span>
      </label>
    </div>
  )
}

function Acessibilidade() {
  const { tamanhoTexto, alvosGrandes, avisosFicam, contrasteAlto, ajustar } = useConfig()
  return (
    <div className="cartao">
      <h2 className="titulo">Acessibilidade</h2>
      <p className="rotulo" id="tamanho-texto">
        Tamanho do texto
      </p>
      <div className="segmentado" role="group" aria-labelledby="tamanho-texto">
        {TAMANHOS_TEXTO.map(([t, nome]) => (
          <button key={t} className={tamanhoTexto === t ? 'ativo' : ''} aria-pressed={tamanhoTexto === t} onClick={() => ajustar({ tamanhoTexto: t })}>
            {nome}
          </button>
        ))}
      </div>
      <p className="motivo">
        Vale só para este aparelho e soma com o tamanho de fonte do sistema.{ehDesktop() && ' Ctrl + e Ctrl − também mudam, e Ctrl 0 volta ao normal.'}
      </p>
      <label className="check">
        <input type="checkbox" checked={contrasteAlto} onChange={(e) => ajustar({ contrasteAlto: e.target.checked })} />
        <span>Contraste alto</span>
      </label>
      <p className="motivo">Texto secundário no tom do texto principal e bordas mais fortes. Liga sozinho quando o sistema pede mais contraste.</p>
      <label className="check">
        <input type="checkbox" checked={alvosGrandes} onChange={(e) => ajustar({ alvosGrandes: e.target.checked })} />
        <span>Botões maiores</span>
      </label>
      <p className="motivo">Todo botão e campo com pelo menos 48 px de altura e mais espaço entre eles, para tocar sem errar o alvo.</p>
      <label className="check">
        <input type="checkbox" checked={avisosFicam} onChange={(e) => ajustar({ avisosFicam: e.target.checked })} />
        <span>Avisos ficam até eu fechar</span>
      </label>
      <p className="motivo">
        {avisosFicam
          ? 'Nenhum aviso some sozinho, nem o Desfazer depois de organizar uma captura.'
          : 'Os avisos somem em 12 segundos, mas param de contar enquanto o mouse ou o foco está neles.'}{' '}
        No computador, Ctrl+Z (fora de um campo de texto) desfaz o que o app acabou de criar e Alt+1 a Alt+7 trocam de seção.
      </p>
      <p className="motivo">
        O app funciona inteiro pelo teclado e com leitor de tela (TalkBack, NVDA, Narrador). Falar é sempre opcional: o ditado e os recados de voz têm um
        campo para escrever ao lado. Nenhum aviso depende de som.
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
      <p className="motivo">Difícil apertar tudo junto? Com as Teclas de Aderência do Windows (aperte Shift cinco vezes), vai uma tecla de cada vez.</p>
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
  const ultimoBackup = useConfig((c) => c.ultimoBackup)
  const ultimoBackupAuto = useConfig((c) => c.ultimoBackupAuto)
  return (
    <div className="cartao">
      <h2 className="titulo">Backup</h2>
      <p className="motivo">
        Um arquivo com todos os seus dados. Exporte de vez em quando: é a garantia de que nada se perde, com ou sem sincronização. Último backup:{' '}
        {quandoFoiOBackup(ultimoBackup)}.
      </p>
      {(ehAndroid() || ehDesktop()) && (
        <p className="motivo">
          Cópia automática: uma por semana em Documentos/MeUsMe, as 4 mais novas, que continuam lá se o app for desinstalado. Última:{' '}
          {quandoFoiOBackup(ultimoBackupAuto).replace(' neste aparelho', ' ainda')}.
        </p>
      )}
      <div className="linha">
        <button onClick={exportarBackup}>Exportar backup</button>
        <label className="botao-arquivo">
          Restaurar backup
          <input
            type="file"
            accept=".json,application/json"
            onChange={async (e) => {
              const arquivo = e.target.files?.[0]
              if (!arquivo) return
              try {
                const dados = lerBackup(await arquivo.text())
                const sincronizando = ['ociosa', 'sincronizando', 'erro'].includes(useStatusSync.getState().situacao)
                const aviso = sincronizando
                  ? 'Substituir TODOS os dados pelo backup? A sincronização está ligada: o conteúdo do backup também vai substituir o que está nos seus outros aparelhos.'
                  : 'Substituir TODOS os dados deste aparelho pelo backup?'
                if (!confirm(aviso)) return
                for (const [k, v] of Object.entries(dados)) localStorage.setItem(k, v)
                location.reload()
              } catch (x) {
                setMensagem((x as Error).message)
              }
            }}
          />
        </label>
      </div>
      {mensagem && (
        <p className="dica" role="status">
          {mensagem}
        </p>
      )}
      <p className="motivo">Também em formatos abertos, para abrir em qualquer programa: passos em Markdown, lançamentos em CSV (o Excel abre e o Importar lê de volta) e a agenda em .ics.</p>
      <div className="linha">
        <button onClick={() => baixarArquivo(`meusme-passos-${hoje()}.md`, paraMarkdown(useStore.getState(), hoje()), 'text/markdown')}>Passos (.md)</button>
        <button onClick={() => baixarArquivo(`meusme-lancamentos-${hoje()}.csv`, paraCSV(useFinancas.getState()), 'text/csv')}>Lançamentos (.csv)</button>
        <button onClick={() => baixarArquivo(`meusme-agenda-${hoje()}.ics`, paraICS(useAgenda.getState(), Date.now()), 'text/calendar')}>Agenda (.ics)</button>
      </div>
    </div>
  )
}

export function Ajustes() {
  return (
    <section className="tela grade-ajustes">
      <Aparencia />
      <Secoes />
      <Acessibilidade />
      <Captura />
      <Sincronizacao />
      <Windows />
      <Notificacoes />
      <Google />
      <Backup />
      <Sobre />
    </section>
  )
}
