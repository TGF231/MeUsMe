import { useState } from 'react'
import { useErros, usoDoArmazenamento } from '../erros'
import { ehDesktop, ehNativo } from '../nativo/plataforma'
import { useConfig } from '../stores/config'

const PRINCIPIOS: [string, string][] = [
  ['Uma coisa por vez', 'Escolher entre muitas opções gasta a energia que seria do começo. A tela Agora decide a ordem; você só decide se começa.'],
  ['Tudo fora da cabeça', 'Guardar tudo de cabeça cansa. Captura em um toque, e a ideia que surge no meio do foco fica estacionada, sem desviar.'],
  ['Tempo visível', 'Saber quanto as coisas demoram não é fácil. Anel do bloco, aviso antes dos compromissos e palpite × real no Histórico.'],
  ['Começo pequeno', 'Combinado de 5 minutos, passos de 2 minutos e o alerta de ideia vaga reduzem a barreira para começar.'],
  ['Fim que dá para ver', 'Linha de chegada definida no início e barra de progresso: perto do fim a meta não foge.'],
  ['Recompensa agora', 'Recompensas distantes pesam menos. Cada passo feito é comemorado na hora, não só o projeto.'],
  ['Sem culpa', 'Nada de vermelho por atraso nem sequência quebrada. Voltar depois de dias sumido é recebido, não cobrado.'],
  ['Plano da semana', 'Olhar a semana inteira de uma vez, com agenda e lista lado a lado, mostra o que vem primeiro e evita surpresas.'],
  ['Freio no impulso', 'Compras esperam um prazo antes da decisão, e as contas fixas avisam na véspera.'],
]

export function Sobre() {
  const erros = useErros()
  const ajustar = useConfig((c) => c.ajustar)
  const [uso] = useState(usoDoArmazenamento)

  return (
    <div className="cartao">
      <h2 className="titulo">Sobre o MeUsMe</h2>
      <p className="motivo">Versão {__VERSAO__}. Seus dados ficam no aparelho; com a sincronização ligada, também no servidor, só para a sua conta.</p>

      <p className={uso > 0.7 ? 'dica' : 'motivo'}>
        Espaço usado neste aparelho: {Math.max(1, Math.round(uso * 100))}%.{' '}
        {uso > 0.7 && 'Está ficando cheio: exporte um backup agora e fale com o suporte (e-mail na política de privacidade).'}
      </p>

      <details>
        <summary>Por que o app funciona assim</summary>
        <dl className="principios">
          {PRINCIPIOS.map(([t, d]) => (
            <div key={t}>
              <dt>{t}</dt>
              <dd>{d}</dd>
            </div>
          ))}
        </dl>
        <p className="motivo">
          O MeUsMe é um programa de organização de tarefas.
        </p>
      </details>

      {/* Plano de saída (D21 em docs/CONCORRENTES.md): se o app acabar, nada fica preso nele. */}
      <details>
        <summary>Plano de saída: levar tudo embora</summary>
        <ul className="lista-simples">
          <li>O backup (abaixo) é um arquivo JSON com todos os dados, legível em qualquer editor de texto, e restaura tudo em outro aparelho.</li>
          <li>Os formatos abertos, logo abaixo do backup, abrem sem o MeUsMe: passos em Markdown, lançamentos em CSV (Excel) e a agenda em .ics (Google Agenda, Outlook).</li>
          <li>Os dados moram no aparelho. Mesmo que o servidor da sincronização pare, o app continua funcionando com o que já está aqui.</li>
        </ul>
      </details>

      <details>
        <summary>Privacidade</summary>
        <ul className="lista-simples">
          <li>Sem anúncios, sem venda de dados, sem rastreamento de uso.</li>
          <li>Notificações de banco são lidas só dos apps que você marcar, no próprio celular. Só valor e descrição viram lançamento.</li>
          <li>O tempo por programa no Windows guarda só o nome do programa, nunca o título da janela.</li>
          <li>Exportar tudo: Backup, abaixo. Apagar a conta e os dados do servidor: Sincronização.</li>
        </ul>
        {/* Nos apps, o arquivo local não abre num navegador externo; o texto completo fica no site. */}
        {!ehNativo() && !ehDesktop() && (
          <p className="linha">
            <a href="privacidade.html" target="_blank" rel="noreferrer">
              Política de privacidade completa
            </a>
            <a href="termos.html" target="_blank" rel="noreferrer">
              Termos de uso
            </a>
          </p>
        )}
      </details>

      {erros.lista.length > 0 && (
        <details>
          <summary>Erros recentes ({erros.lista.length})</summary>
          <p className="motivo">Ficam só neste aparelho. Se for pedir ajuda, copie e envie junto.</p>
          <pre className="codigo erros">
            {erros.lista.map((e) => `${new Date(e.quando).toLocaleString('pt-BR')} · v${e.versao} · ${e.origem}\n${e.mensagem}`).join('\n\n')}
          </pre>
          <div className="linha">
            <button onClick={() => void navigator.clipboard?.writeText(JSON.stringify(erros.lista, null, 2))}>Copiar</button>
            <button className="discreto" onClick={erros.limpar}>
              Limpar
            </button>
          </div>
        </details>
      )}

      <button className="discreto" onClick={() => ajustar({ introducaoVista: false })}>
        Ver a introdução de novo
      </button>
    </div>
  )
}
