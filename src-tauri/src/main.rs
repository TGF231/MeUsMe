// Em versão final, não abre uma janela de console junto com o app.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    meusme_lib::run()
}
