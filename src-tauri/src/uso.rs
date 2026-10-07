//! Tempo por programa: a cada 5 segundos, anota qual programa está em primeiro plano.
//! Guarda só o nome do programa (nunca o título da janela) e ignora quando você está longe
//! do computador (2 minutos sem mexer no teclado ou no mouse).

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Mutex;
use std::time::{Duration, Instant};
use tauri::{AppHandle, Manager, State};

const INTERVALO_S: u64 = 5;
const OCIOSO_MS: u32 = 120_000;
const DIAS_GUARDADOS: i64 = 60;
const ARQUIVO: &str = "uso-de-apps.json";

#[derive(Default, Serialize, Deserialize)]
pub struct Uso {
    /// dia (AAAA-MM-DD) → programa → segundos
    dias: HashMap<String, HashMap<String, u64>>,
}

pub struct EstadoUso(Mutex<Uso>);

#[derive(Serialize)]
pub struct RegistroUso {
    dia: String,
    app: String,
    segundos: u64,
}

fn caminho(app: &AppHandle) -> Option<std::path::PathBuf> {
    app.path().app_data_dir().ok().map(|d| d.join(ARQUIVO))
}

fn dia_local(diferenca_dias: i64) -> String {
    (chrono::Local::now() - chrono::Duration::days(diferenca_dias)).format("%Y-%m-%d").to_string()
}

pub fn iniciar(app: AppHandle) {
    let uso: Uso = caminho(&app)
        .and_then(|f| std::fs::read_to_string(f).ok())
        .and_then(|t| serde_json::from_str(&t).ok())
        .unwrap_or_default();
    app.manage(EstadoUso(Mutex::new(uso)));

    std::thread::spawn(move || {
        let mut nomes = janela::Nomes::default();
        let mut ultimo_salvo = Instant::now();
        loop {
            std::thread::sleep(Duration::from_secs(INTERVALO_S));
            if let Some(programa) = nomes.programa_em_uso() {
                let estado = app.state::<EstadoUso>();
                let mut uso = estado.0.lock().unwrap();
                *uso.dias.entry(dia_local(0)).or_default().entry(programa).or_default() += INTERVALO_S;
            }
            if ultimo_salvo.elapsed() > Duration::from_secs(60) {
                salvar(&app);
                ultimo_salvo = Instant::now();
            }
        }
    });
}

pub fn salvar(app: &AppHandle) {
    let (Some(arquivo), Some(estado)) = (caminho(app), app.try_state::<EstadoUso>()) else { return };
    let mut uso = estado.0.lock().unwrap();
    let limite = dia_local(DIAS_GUARDADOS);
    uso.dias.retain(|dia, _| *dia >= limite);
    if let Some(pasta) = arquivo.parent() {
        let _ = std::fs::create_dir_all(pasta);
    }
    if let Ok(texto) = serde_json::to_string(&*uso) {
        let _ = std::fs::write(arquivo, texto);
    }
}

/// Uso dos últimos `dias` dias (1 = só hoje).
#[tauri::command]
pub fn uso_de_apps(estado: State<EstadoUso>, dias: i64) -> Vec<RegistroUso> {
    let desde = dia_local(dias.max(1) - 1);
    let uso = estado.0.lock().unwrap();
    uso.dias
        .iter()
        .filter(|(dia, _)| **dia >= desde)
        .flat_map(|(dia, apps)| apps.iter().map(move |(app, s)| RegistroUso { dia: dia.clone(), app: app.clone(), segundos: *s }))
        .collect()
}

#[cfg(windows)]
mod janela {
    use super::OCIOSO_MS;
    use std::collections::HashMap;
    use windows::Win32::Foundation::CloseHandle;
    use windows::Win32::Storage::FileSystem::{GetFileVersionInfoSizeW, GetFileVersionInfoW, VerQueryValueW};
    use windows::Win32::System::SystemInformation::GetTickCount;
    use windows::Win32::System::Threading::{OpenProcess, PROCESS_NAME_WIN32, PROCESS_QUERY_LIMITED_INFORMATION, QueryFullProcessImageNameW};
    use windows::Win32::UI::Input::KeyboardAndMouse::{GetLastInputInfo, LASTINPUTINFO};
    use windows::Win32::UI::WindowsAndMessaging::{GetForegroundWindow, GetWindowThreadProcessId};
    use windows::core::{PCWSTR, PWSTR, w};

    /// Guarda o nome amigável de cada executável, para não reler o arquivo a cada 5 segundos.
    #[derive(Default)]
    pub struct Nomes(HashMap<String, String>);

    impl Nomes {
        pub fn programa_em_uso(&mut self) -> Option<String> {
            if ocioso() {
                return None;
            }
            let executavel = executavel_em_primeiro_plano()?;
            let nome = self.0.entry(executavel.clone()).or_insert_with(|| {
                descricao(&executavel).unwrap_or_else(|| {
                    std::path::Path::new(&executavel).file_stem().map(|s| s.to_string_lossy().into_owned()).unwrap_or(executavel.clone())
                })
            });
            Some(nome.clone())
        }
    }

    fn ocioso() -> bool {
        let mut info = LASTINPUTINFO { cbSize: size_of::<LASTINPUTINFO>() as u32, dwTime: 0 };
        unsafe { GetLastInputInfo(&mut info).as_bool() && GetTickCount().wrapping_sub(info.dwTime) > OCIOSO_MS }
    }

    fn executavel_em_primeiro_plano() -> Option<String> {
        unsafe {
            let hwnd = GetForegroundWindow();
            if hwnd.is_invalid() {
                return None;
            }
            let mut pid = 0u32;
            GetWindowThreadProcessId(hwnd, Some(&mut pid));
            if pid == 0 {
                return None;
            }
            let processo = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, false, pid).ok()?;
            let mut buffer = [0u16; 1024];
            let mut tamanho = buffer.len() as u32;
            let ok = QueryFullProcessImageNameW(processo, PROCESS_NAME_WIN32, PWSTR(buffer.as_mut_ptr()), &mut tamanho);
            let _ = CloseHandle(processo);
            ok.ok()?;
            Some(String::from_utf16_lossy(&buffer[..tamanho as usize]))
        }
    }

    /// "Descrição do arquivo" do executável (ex.: Code.exe → "Visual Studio Code").
    fn descricao(caminho: &str) -> Option<String> {
        let largo: Vec<u16> = caminho.encode_utf16().chain(std::iter::once(0)).collect();
        unsafe {
            let tamanho = GetFileVersionInfoSizeW(PCWSTR(largo.as_ptr()), None);
            if tamanho == 0 {
                return None;
            }
            let mut dados = vec![0u8; tamanho as usize];
            GetFileVersionInfoW(PCWSTR(largo.as_ptr()), None, tamanho, dados.as_mut_ptr().cast()).ok()?;

            let mut ponteiro = std::ptr::null_mut();
            let mut len = 0u32;
            if !VerQueryValueW(dados.as_ptr().cast(), w!("\\VarFileInfo\\Translation"), &mut ponteiro, &mut len).as_bool() || len < 4 {
                return None;
            }
            let traducao = std::slice::from_raw_parts(ponteiro as *const u16, 2);
            let chave: Vec<u16> = format!("\\StringFileInfo\\{:04x}{:04x}\\FileDescription", traducao[0], traducao[1])
                .encode_utf16()
                .chain(std::iter::once(0))
                .collect();
            if !VerQueryValueW(dados.as_ptr().cast(), PCWSTR(chave.as_ptr()), &mut ponteiro, &mut len).as_bool() || len <= 1 {
                return None;
            }
            let texto = String::from_utf16_lossy(std::slice::from_raw_parts(ponteiro as *const u16, (len - 1) as usize));
            let texto = texto.trim().to_string();
            (!texto.is_empty()).then_some(texto)
        }
    }
}

#[cfg(not(windows))]
mod janela {
    #[derive(Default)]
    pub struct Nomes;
    impl Nomes {
        pub fn programa_em_uso(&mut self) -> Option<String> {
            None
        }
    }
}
