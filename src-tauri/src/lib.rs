mod uso;

use tauri::menu::{Menu, MenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::{AppHandle, Emitter, Manager, WindowEvent};
use tauri_plugin_autostart::MacosLauncher;
use tauri_plugin_global_shortcut::{GlobalShortcutExt, ShortcutState};

/// Atalho global da captura; usa o reserva se o Windows recusar o preferido.
const ATALHO_PREFERIDO: &str = "super+ctrl+alt+Space";
const ATALHO_RESERVA: &str = "ctrl+alt+Space";

/// Argumento passado pelo autostart: inicia oculto na bandeja.
const ARG_OCULTO: &str = "--oculto";

struct AtalhoAtual(String);

#[tauri::command]
fn atalho_atual(estado: tauri::State<AtalhoAtual>) -> String {
    estado.0.clone()
}

fn mostrar_principal(app: &AppHandle) {
    if let Some(janela) = app.get_webview_window("main") {
        let _ = janela.unminimize();
        let _ = janela.show();
        let _ = janela.set_focus();
    }
}

fn alternar_captura(app: &AppHandle) {
    let Some(janela) = app.get_webview_window("captura") else { return };
    if janela.is_visible().unwrap_or(false) {
        let _ = janela.hide();
    } else {
        let _ = janela.center();
        let _ = janela.show();
        let _ = janela.set_focus();
        let _ = janela.emit("abrir-captura", ());
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        // Segunda instância apenas traz a janela existente para frente.
        .plugin(tauri_plugin_single_instance::init(|app, _args, _pasta| mostrar_principal(app)))
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_autostart::init(MacosLauncher::LaunchAgent, Some(vec![ARG_OCULTO])))
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(|app, _atalho, evento| {
                    if evento.state() == ShortcutState::Pressed {
                        alternar_captura(app);
                    }
                })
                .build(),
        )
        .invoke_handler(tauri::generate_handler![atalho_atual, uso::uso_de_apps])
        .setup(|app| {
            let atalhos = app.global_shortcut();
            let usado = if atalhos.register(ATALHO_PREFERIDO).is_ok() {
                ATALHO_PREFERIDO
            } else {
                let _ = atalhos.register(ATALHO_RESERVA);
                ATALHO_RESERVA
            };
            app.manage(AtalhoAtual(usado.to_string()));

            let abrir = MenuItem::with_id(app, "abrir", "Abrir MeUsMe", true, None::<&str>)?;
            let capturar = MenuItem::with_id(app, "capturar", "Capturar", true, None::<&str>)?;
            let sair = MenuItem::with_id(app, "sair", "Sair", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&abrir, &capturar, &sair])?;
            TrayIconBuilder::with_id("principal")
                .icon(app.default_window_icon().cloned().expect("ícone do app"))
                .tooltip("MeUsMe")
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_menu_event(|app, evento| match evento.id.as_ref() {
                    "abrir" => mostrar_principal(app),
                    "capturar" => alternar_captura(app),
                    "sair" => {
                        uso::salvar(app);
                        app.exit(0);
                    }
                    _ => {}
                })
                .on_tray_icon_event(|bandeja, evento| {
                    if let TrayIconEvent::Click { button: MouseButton::Left, button_state: MouseButtonState::Up, .. } = evento {
                        mostrar_principal(bandeja.app_handle());
                    }
                })
                .build(app)?;

            if !std::env::args().any(|a| a == ARG_OCULTO) {
                mostrar_principal(app.handle());
            }
            uso::iniciar(app.handle().clone());
            Ok(())
        })
        .on_window_event(|janela, evento| match evento {
            // Fechar oculta a janela; o app continua na bandeja.
            WindowEvent::CloseRequested { api, .. } => {
                api.prevent_close();
                let _ = janela.hide();
            }
            // Captura rápida fecha ao perder o foco.
            WindowEvent::Focused(false) if janela.label() == "captura" => {
                let _ = janela.hide();
            }
            _ => {}
        })
        .run(tauri::generate_context!())
        .expect("erro ao iniciar o MeUsMe");
}
