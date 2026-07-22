use chrono::Local;
use serde_json::{json, Value};
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::Mutex;

static HISTORY_LOCK: Mutex<()> = Mutex::new(());

pub fn history_file_path() -> PathBuf {
    let app_data_dir = dirs::data_local_dir().unwrap_or_else(|| PathBuf::from("."));
    app_data_dir.join("UploadIASD").join("history.json")
}

pub fn record_activity(
    activity_type: &str,
    file_path: &str,
    file_size: u64,
    metadata: Option<&str>,
) -> Result<(), String> {
    let _guard = HISTORY_LOCK
        .lock()
        .map_err(|_| "Erro ao bloquear o histórico para gravação".to_string())?;
    let history_path = history_file_path();

    if let Some(parent) = history_path.parent() {
        fs::create_dir_all(parent)
            .map_err(|e| format!("Erro ao criar diretório do histórico: {}", e))?;
    }

    let mut history = read_history_from(&history_path)?;

    let timestamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map_err(|e| format!("Relógio do sistema inválido: {}", e))?
        .as_secs();

    history.insert(
        0,
        json!({
            "id": format!("{}-{}", timestamp, uuid::Uuid::new_v4().simple()),
            "type": activity_type,
            "file_path": file_path,
            "file_name": Path::new(file_path)
                .file_name()
                .and_then(|name| name.to_str())
                .unwrap_or("arquivo"),
            "file_size": file_size,
            "metadata": metadata.unwrap_or(""),
            "timestamp": timestamp,
            "date": Local::now().format("%Y-%m-%d %H:%M:%S").to_string()
        }),
    );
    history.truncate(1000);

    let serialized = serde_json::to_vec_pretty(&history)
        .map_err(|e| format!("Erro ao serializar histórico: {}", e))?;
    replace_file(&history_path, &serialized)
}

pub fn read_history() -> Result<Vec<Value>, String> {
    let _guard = HISTORY_LOCK
        .lock()
        .map_err(|_| "Erro ao bloquear o histórico para leitura".to_string())?;
    read_history_from(&history_file_path())
}

fn read_history_from(path: &Path) -> Result<Vec<Value>, String> {
    if !path.exists() {
        return Ok(Vec::new());
    }
    let content = fs::read_to_string(path).map_err(|e| format!("Erro ao ler histórico: {}", e))?;
    serde_json::from_str(&content)
        .map_err(|e| format!("Histórico inválido; arquivo preservado: {}", e))
}

fn replace_file(path: &Path, contents: &[u8]) -> Result<(), String> {
    let temp_path = path.with_extension(format!("json.{}.tmp", uuid::Uuid::new_v4().simple()));
    fs::write(&temp_path, contents)
        .map_err(|e| format!("Erro ao gravar histórico temporário: {}", e))?;

    match fs::rename(&temp_path, path) {
        Ok(()) => Ok(()),
        Err(first_error) if path.exists() => {
            let backup_path =
                path.with_extension(format!("json.{}.backup", uuid::Uuid::new_v4().simple()));
            if let Err(error) = fs::rename(path, &backup_path) {
                let _ = fs::remove_file(&temp_path);
                return Err(format!(
                    "Erro ao preservar histórico antes da substituição: {} (tentativa inicial: {})",
                    error, first_error
                ));
            }

            match fs::rename(&temp_path, path) {
                Ok(()) => {
                    let _ = fs::remove_file(backup_path);
                    Ok(())
                }
                Err(error) => {
                    let restore_result = fs::rename(&backup_path, path);
                    if let Err(restore_error) = restore_result {
                        return Err(format!(
                            "Falha ao instalar e restaurar o histórico. Novo: {}. Restauração: {}. \
                             Cópias preservadas em {} e {}",
                            error,
                            restore_error,
                            temp_path.display(),
                            backup_path.display()
                        ));
                    }
                    let _ = fs::remove_file(&temp_path);
                    Err(format!(
                        "Erro ao finalizar histórico: {}. Histórico anterior restaurado.",
                        error
                    ))
                }
            }
        }
        Err(error) => {
            let _ = fs::remove_file(&temp_path);
            Err(format!("Erro ao finalizar histórico: {}", error))
        }
    }
}
