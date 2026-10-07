// Release: sem janela de console no Windows.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    meusme_lib::run()
}
