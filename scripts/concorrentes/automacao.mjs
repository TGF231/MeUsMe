// Integração com apps de automação (Tasker, MacroDroid, Automate). Pesquisa de 02/11/2026.
// Só ideia, sem decisão: não tem onda e não entra em nenhuma fase até você decidir.
// [id, título, situação hoje, a ideia, ganho, custo ou risco, fontes]
export const automacao = [
  ['AU1', 'Tasker, MacroDroid e Automate abrem a captura pelo link',
    'Já funciona: o link meusme://captura?texto=… (A1, V03) aceita a ação "enviar intent" ou "abrir URL" desses apps: o texto vai direto para a Caixa, com o aviso "Guardado na Caixa". O limite é que o MeUsMe abre na tela.',
    'Só documentar o link e os parâmetros (texto, voz) numa página de ajuda.',
    'Automação sem código novo: por exemplo, ao sair do trabalho, abrir a captura por voz.',
    'Nenhum de código. Qualquer app instalado pode abrir o link e pôr texto na Caixa; o aviso aparece, mas não há confirmação antes.',
    ['macrodroidIntent']],
  ['AU2', 'Captura em segundo plano por intent',
    'Não existe. O app já tem uma fila nativa (a mesma das notificações do banco) que o app web lê ao abrir.',
    'Um receptor de intent exportado que põe o texto nessa fila, sem abrir o app; o texto entra na Caixa na próxima vez que o app abrir.',
    'Capturar sem trocar de tela, disparado por qualquer gatilho do app de automação.',
    'Java (trilha 10). Um receptor exportado aceita intents de qualquer app instalado: precisa ficar desligado por padrão em Ajustes e, de preferência, exigir uma chave que a pessoa cola no app de automação. No Android 14 em diante, o intent precisa nomear o pacote do MeUsMe.',
    ['android14', 'owaspReceptor', 'intentShell']],
  ['AU3', 'Plugin do Tasker (padrão Locale)',
    'Não existe. É o padrão que Tasker, MacroDroid e Automate entendem: uma tela de configuração e um receptor que executa a ação.',
    'Ação "Capturar no MeUsMe" com tela própria; depois, eventos como "passo concluído" e consultas como "itens na Caixa".',
    'Configuração guiada em vez de digitar intent e parâmetros à mão.',
    'Mais Java e uma biblioteca da comunidade (taskerpluginlibrary). A API original do Locale está arquivada. O desenvolvedor do Klick\'r aponta que o disparo do plugin é um broadcast aberto, que outro app pode imitar.',
    ['taskerPlugin', 'localeApi', 'klickr']],
  ['AU4', 'Windows: link meusme:// para AutoHotkey e Power Automate',
    'O app tem instância única no Windows, mas não registra o link meusme:// (falta o plugin de deep link do Tauri).',
    'Plugin de deep link do Tauri com o esquema meusme, entregue à instância que já está aberta; a mesma leitura de entrada do Android (src/entrada.ts).',
    'Você passa o expediente no PC (D6): um atalho do AutoHotkey ou um fluxo do Power Automate capturaria sem trocar de janela.',
    'Rust (trilha 11). No Windows o link só funciona com o app instalado, não em modo de desenvolvimento.',
    ['tauriDeepLink']],
]

export const fontesAutomacao = {
  macrodroidIntent: ['Fórum do Obsidian: atalhos do MacroDroid com URIs como intents', 'https://forum.obsidian.md/t/cool-useful-android-shortcuts-made-with-macrodroid-and-a-tutorial-on-using-uris-as-intents-on-android/26683'],
  android14: ['SecurityWeek: mudanças de intents implícitos e receptores no Android 14', 'https://www.securityweek.com/google-describes-privacy-security-improvements-in-android-14/'],
  owaspReceptor: ['OWASP MASTG: receptores de broadcast no Android', 'https://mas.owasp.org/MASTG/knowledge/android/MASVS-PLATFORM/MASTG-KNOW-0134/'],
  intentShell: ['ShizuTools: IntentShell, comandos por broadcast vindos do Tasker ou MacroDroid', 'https://github.com/legendsayantan/ShizuTools/wiki/IntentShell'],
  taskerPlugin: ['Tasker: introdução aos plugins para desenvolvedores', 'https://tasker.joaoapps.com/plugins-intro.html'],
  localeApi: ['Plugin API for Locale (JitPack)', 'https://jitpack.io/p/twofortyfouram/android-plugin-api-for-locale'],
  klickr: ['Klick\'r: discussão sobre plugin para MacroDroid e Tasker', 'https://github.com/Nain57/Smart-AutoClicker/discussions/949'],
  tauriDeepLink: ['Tauri v2: deep linking', 'https://v2.tauri.app/plugin/deep-linking/'],
}
