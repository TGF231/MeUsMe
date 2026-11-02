//! Cópia automática do backup (D21 em docs/CONCORRENTES.md) em Documentos\MeUsMe, fora da pasta do app:
//! continua lá se o app for desinstalado. Guarda as 4 cópias mais novas, como no Android.

use std::fs;
use std::path::{Path, PathBuf};
use tauri::{AppHandle, Manager};

const PREFIXO: &str = "meusme-backup-";
const MANTER: usize = 4;

/// Grava `conteudo` em Documentos\MeUsMe\`nome` e apaga as cópias além das 4 mais novas. Devolve o caminho.
#[tauri::command]
pub fn salvar_backup(app: AppHandle, nome: String, conteudo: String) -> Result<String, String> {
    let pasta = app.path().document_dir().map_err(|e| e.to_string())?.join("MeUsMe");
    gravar(&pasta, &nome, &conteudo).map(|c| c.to_string_lossy().into_owned())
}

fn gravar(pasta: &Path, nome: &str, conteudo: &str) -> Result<PathBuf, String> {
    // O nome vem do app web; recusa qualquer coisa que não seja um arquivo nosso na própria pasta.
    if !nome.starts_with(PREFIXO) || !nome.ends_with(".json") || nome.contains(['/', '\\', ':']) || nome.contains("..") {
        return Err("nome de backup inválido".into());
    }
    fs::create_dir_all(pasta).map_err(|e| e.to_string())?;
    let caminho = pasta.join(nome);
    fs::write(&caminho, conteudo).map_err(|e| e.to_string())?;

    // Os nomes têm a data (AAAA-MM-DD), então a ordem alfabética é a ordem do tempo.
    let mut copias: Vec<String> = fs::read_dir(pasta)
        .map_err(|e| e.to_string())?
        .filter_map(|e| e.ok()?.file_name().into_string().ok())
        .filter(|n| n.starts_with(PREFIXO) && n.ends_with(".json"))
        .collect();
    copias.sort_unstable_by(|a, b| b.cmp(a));
    for antiga in copias.iter().skip(MANTER) {
        let _ = fs::remove_file(pasta.join(antiga));
    }
    Ok(caminho)
}

#[cfg(test)]
mod testes {
    use super::*;

    #[test]
    fn guarda_as_quatro_mais_novas_e_recusa_nomes_estranhos() {
        let pasta = std::env::temp_dir().join(format!("meusme-teste-backup-{}", std::process::id()));
        let _ = fs::remove_dir_all(&pasta);
        fs::create_dir_all(&pasta).unwrap();
        fs::write(pasta.join("outro.txt"), "fica").unwrap();
        for dia in ["2026-10-01", "2026-10-08", "2026-10-15", "2026-10-22", "2026-11-02"] {
            gravar(&pasta, &format!("meusme-backup-{dia}.json"), "{}").unwrap();
        }
        gravar(&pasta, "meusme-backup-2026-11-02.json", "{\"novo\":1}").unwrap();

        let mut nomes: Vec<String> = fs::read_dir(&pasta).unwrap().map(|e| e.unwrap().file_name().into_string().unwrap()).collect();
        nomes.sort();
        assert_eq!(nomes, ["meusme-backup-2026-10-08.json", "meusme-backup-2026-10-15.json", "meusme-backup-2026-10-22.json", "meusme-backup-2026-11-02.json", "outro.txt"]);
        assert_eq!(fs::read_to_string(pasta.join("meusme-backup-2026-11-02.json")).unwrap(), "{\"novo\":1}");
        assert!(gravar(&pasta, "../meusme-backup-x.json", "{}").is_err());
        assert!(gravar(&pasta, "qualquer.json", "{}").is_err());
        fs::remove_dir_all(&pasta).unwrap();
    }
}
