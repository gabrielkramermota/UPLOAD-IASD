use std::process::{Command, Child};
use std::fs;
use std::path::PathBuf;
use std::io::Write;
use std::sync::Mutex;
use std::env;
use serde_json::{Value, json};
use semver::Version;

mod upload_server;

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

// Comando para debug: verificar onde o store salva os arquivos
#[tauri::command]
fn get_store_path() -> Result<String, String> {
    let app_data_dir = dirs::data_local_dir()
        .ok_or("Não foi possível encontrar diretório de dados")?;
    
    let identifier = "com.gabrielkramer.uploadiasddesktop";
    let store_path = app_data_dir.join(identifier).join("store").join("settings.json");
    
    // Listar todos os caminhos possíveis
    let possible_paths = vec![
        store_path.clone(),
        app_data_dir.join("com.tauri.app").join("store").join("settings.json"),
        app_data_dir.join("uploadiasddesktop").join("settings.json"),
    ];
    
    let mut result = format!("Diretório de dados: {}\n\n", app_data_dir.display());
    result.push_str("Caminhos verificados:\n");
    
    for path in &possible_paths {
        let exists = path.exists();
        result.push_str(&format!("  {} - {}\n", 
            path.display(), 
            if exists { "✅ EXISTE" } else { "❌ Não existe" }
        ));
        
        if exists {
            if let Ok(content) = fs::read_to_string(path) {
                result.push_str(&format!("    Conteúdo (primeiros 200 chars): {}\n", 
                    &content.chars().take(200).collect::<String>()));
            }
        }
    }
    
    // Verificar se há arquivos na pasta do identifier
    let identifier_dir = app_data_dir.join(identifier);
    if identifier_dir.exists() {
        result.push_str(&format!("\n📁 Conteúdo de {}:\n", identifier_dir.display()));
        if let Ok(entries) = fs::read_dir(&identifier_dir) {
            for entry in entries.flatten() {
                result.push_str(&format!("  - {}\n", entry.path().display()));
            }
        }
    }
    
    Ok(result)
}

// Obter caminho do arquivo de configuração alternativo
fn get_config_file_path() -> PathBuf {
    let app_data_dir = dirs::data_local_dir().unwrap_or_else(|| PathBuf::from("."));
    app_data_dir.join("UploadIASD").join("config.json")
}

// Comando para salvar caminho de uploads diretamente (alternativa ao Tauri Store)
#[tauri::command]
fn set_uploads_path(path: String) -> Result<String, String> {
    let config_path = get_config_file_path();
    
    // Criar diretório se não existir
    if let Some(parent) = config_path.parent() {
        if let Err(e) = fs::create_dir_all(parent) {
            return Err(format!("Erro ao criar diretório de configuração: {}", e));
        }
    }
    
    // Ler configuração existente ou criar nova
    let mut config: Value = if config_path.exists() {
        if let Ok(content) = fs::read_to_string(&config_path) {
            serde_json::from_str(&content).unwrap_or_else(|_| json!({}))
        } else {
            json!({})
        }
    } else {
        json!({})
    };
    
    // Atualizar caminho de uploads
    config["uploadsPath"] = json!(path);
    
    // Salvar arquivo
    let json_str = serde_json::to_string_pretty(&config)
        .map_err(|e| format!("Erro ao serializar configuração: {}", e))?;
    
    fs::write(&config_path, json_str)
        .map_err(|e| format!("Erro ao salvar configuração: {}", e))?;
    
    Ok(format!("Caminho salvo com sucesso: {}", path))
}

// Obter caminho de uploads das configurações ou usar padrão
fn get_uploads_path() -> Result<PathBuf, String> {
    let app_data_dir = dirs::data_local_dir()
        .ok_or("Não foi possível encontrar diretório de dados")?;
    
    // PRIMEIRO: Tentar arquivo de configuração alternativo (mais confiável)
    let config_path = get_config_file_path();
    if config_path.exists() {
        if let Ok(content) = fs::read_to_string(&config_path) {
            if let Ok(json) = serde_json::from_str::<Value>(&content) {
                if let Some(uploads_path) = json.get("uploadsPath").and_then(|v| v.as_str()) {
                    if !uploads_path.is_empty() {
                        let path = PathBuf::from(uploads_path);
                        if !path.exists() {
                            let _ = fs::create_dir_all(&path);
                        }
                        return Ok(path);
                    }
                }
            }
        }
    }
    
    // SEGUNDO: Tentar Tauri Store v2
    let identifier = "com.gabrielkramer.uploadiasddesktop";
    let store_path = app_data_dir.join(identifier).join("store").join("settings.json");
    
    let possible_paths = vec![
        store_path.clone(),
        app_data_dir.join("com.tauri.app").join("store").join("settings.json"),
        app_data_dir.join("uploadiasddesktop").join("settings.json"),
    ];
    
    for store_path in &possible_paths {
        if store_path.exists() {
            if let Ok(content) = fs::read_to_string(store_path) {
                if let Ok(json) = serde_json::from_str::<Value>(&content) {
                    let settings_obj = json.get("settings")
                        .or_else(|| Some(&json));
                    
                    if let Some(settings_obj) = settings_obj {
                        if let Some(uploads_path) = settings_obj.get("uploadsPath").and_then(|v| v.as_str()) {
                            if !uploads_path.is_empty() {
                                let path = PathBuf::from(uploads_path);
                                if !path.exists() {
                                    let _ = fs::create_dir_all(&path);
                                }
                                return Ok(path);
                            }
                        }
                    }
                }
            }
        }
    }
    
    // Fallback para padrão
    let default_path = app_data_dir.join("UploadIASD").join("uploads");
    fs::create_dir_all(&default_path)
        .map_err(|e| format!("Erro ao criar pasta padrão: {}", e))?;
    Ok(default_path)
}

// Obter caminho de vídeos das configurações ou usar padrão
fn get_videos_path() -> Result<PathBuf, String> {
    let app_data_dir = dirs::data_local_dir()
        .ok_or("Não foi possível encontrar diretório de dados")?;
    
    // Tentar ler configurações do store
    let possible_paths = vec![
        app_data_dir.join("com.tauri.app").join("store").join("settings.json"),
        app_data_dir.join("uploadiasddesktop").join("settings.json"),
    ];
    
    for store_path in possible_paths {
        if store_path.exists() {
            if let Ok(content) = fs::read_to_string(&store_path) {
                if let Ok(json) = serde_json::from_str::<Value>(&content) {
                    let settings = json.get("settings").or_else(|| Some(&json));
                    if let Some(settings_obj) = settings {
                        if let Some(videos_path) = settings_obj.get("videosPath").and_then(|v| v.as_str()) {
                            if !videos_path.is_empty() {
                                let path = PathBuf::from(videos_path);
                                // Criar pasta se não existir
                                if !path.exists() {
                                    let _ = fs::create_dir_all(&path);
                                }
                                return Ok(path);
                            }
                        }
                    }
                }
            }
        }
    }
    
    // Fallback para Downloads/UploadIASD
    let downloads_dir = dirs::download_dir()
        .ok_or("Não foi possível encontrar a pasta de Downloads")?;
    let default_path = downloads_dir.join("UploadIASD");
    fs::create_dir_all(&default_path)
        .map_err(|e| format!("Erro ao criar pasta padrão: {}", e))?;
    Ok(default_path)
}

// Sanitizar nome do arquivo
fn sanitize_title(title: &str) -> String {
    title
        .chars()
        .map(|c| match c {
            '<' | '>' | ':' | '"' | '/' | '\\' | '|' | '?' | '*' => '_',
            _ if c.is_whitespace() => '_',
            _ => c,
        })
        .collect::<String>()
        .replace("__", "_")
        .trim_matches('_')
        .to_string()
}

// Atualizar yt-dlp
fn update_yt_dlp(path: &PathBuf) -> Result<(), String> {
    // Remover versão antiga
    if path.exists() {
        let _ = fs::remove_file(path);
    }
    
    // Baixar versão mais recente
    download_yt_dlp(path)
}

// Obter ou baixar yt-dlp
fn get_yt_dlp_path() -> Result<PathBuf, String> {
    let app_data_dir = dirs::data_local_dir()
        .ok_or("Não foi possível encontrar diretório de dados")?;
    
    let yt_dlp_dir = app_data_dir.join("UploadIASD");
    fs::create_dir_all(&yt_dlp_dir)
        .map_err(|e| format!("Erro ao criar diretório: {}", e))?;

    let yt_dlp_name = if cfg!(windows) {
        "yt-dlp.exe"
    } else {
        "yt-dlp"
    };

    let yt_dlp_path = yt_dlp_dir.join(yt_dlp_name);

    // Se já existe, usar
    if yt_dlp_path.exists() {
        return Ok(yt_dlp_path);
    }

    // Tentar encontrar no PATH primeiro
    if let Ok(path) = which::which(if cfg!(windows) { "yt-dlp.exe" } else { "yt-dlp" }) {
        return Ok(path);
    }

    // Se não encontrou, baixar automaticamente
    download_yt_dlp(&yt_dlp_path)?;
    Ok(yt_dlp_path)
}

// Baixar yt-dlp automaticamente
fn download_yt_dlp(path: &PathBuf) -> Result<(), String> {
    let url = if cfg!(windows) {
        "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe"
    } else {
        "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp"
    };

    println!("Baixando yt-dlp de: {}", url);
    
    let response = reqwest::blocking::get(url)
        .map_err(|e| format!("Erro ao baixar yt-dlp: {}", e))?;

    if !response.status().is_success() {
        return Err(format!("Erro HTTP ao baixar yt-dlp: {}", response.status()));
    }

    let mut file = fs::File::create(path)
        .map_err(|e| format!("Erro ao criar arquivo: {}", e))?;

    let bytes = response.bytes()
        .map_err(|e| format!("Erro ao ler resposta: {}", e))?;

    file.write_all(&bytes)
        .map_err(|e| format!("Erro ao escrever arquivo: {}", e))?;

    // Tornar executável no Linux/Mac
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        let mut perms = fs::metadata(path)
            .map_err(|e| format!("Erro ao obter metadados: {}", e))?
            .permissions();
        perms.set_mode(0o755);
        fs::set_permissions(path, perms)
            .map_err(|e| format!("Erro ao definir permissões: {}", e))?;
    }

    println!("yt-dlp baixado com sucesso!");
    Ok(())
}

// Limpar URL do YouTube, extraindo apenas o ID do vídeo e removendo parâmetros de playlist
fn clean_youtube_url(url: &str) -> Result<String, String> {
    let url = url.trim();
    
    if url.is_empty() {
        return Err("URL do vídeo não fornecida.".to_string());
    }
    
    // Extrair ID do vídeo de diferentes formatos de URL
    let video_id = if url.contains("youtu.be/") {
        // Formato curto: https://youtu.be/VIDEO_ID?si=...
        url.split("youtu.be/")
            .nth(1)
            .and_then(|s| s.split('?').next())
            .and_then(|s| s.split('&').next())
            .map(|s| s.to_string())
    } else if url.contains("watch?v=") {
        // Formato longo: https://www.youtube.com/watch?v=VIDEO_ID&list=...
        url.split("watch?v=")
            .nth(1)
            .and_then(|s| s.split('&').next())
            .and_then(|s| s.split('?').next())
            .map(|s| s.to_string())
    } else if url.contains("/v/") {
        // Formato alternativo: https://www.youtube.com/v/VIDEO_ID
        url.split("/v/")
            .nth(1)
            .and_then(|s| s.split('?').next())
            .and_then(|s| s.split('&').next())
            .map(|s| s.to_string())
    } else {
        None
    };
    
    match video_id {
        Some(id) if !id.is_empty() => {
            // Reconstruir URL limpa apenas com o ID do vídeo
            Ok(format!("https://www.youtube.com/watch?v={}", id))
        }
        _ => Err("URL do YouTube inválida. Use um dos formatos:\n- https://www.youtube.com/watch?v=VIDEO_ID\n- https://youtu.be/VIDEO_ID".to_string())
    }
}

// Obter formato baseado na qualidade (usando formatos mais simples para evitar erro 416)
fn get_quality_format(quality: &str) -> &str {
    match quality {
        "2160p" => "best[height<=2160]",
        "1440p" => "best[height<=1440]",
        "1080p" => "best[height<=1080]",
        "720p" => "best[height<=720]",
        "480p" => "best[height<=480]",
        "360p" => "best[height<=360]",
        "240p" => "best[height<=240]",
        "best" => "best",
        _ => "best[height<=1080]",
    }
}

#[tauri::command]
fn get_video_info(url: String) -> Result<String, String> {
    // Limpar URL, extraindo apenas o ID do vídeo e removendo parâmetros de playlist
    let clean_url = clean_youtube_url(&url)?;

    // Obter ou baixar yt-dlp
    let yt_dlp_path = get_yt_dlp_path()?;

    // Obter metadados do vídeo
    let mut info_cmd = Command::new(&yt_dlp_path);
    info_cmd.args(&[
        "--dump-single-json",
        "--no-warnings",
        "--prefer-free-formats",
        &clean_url,
    ]);

    let info_output = info_cmd
        .output()
        .map_err(|e| format!("Erro ao obter informações do vídeo: {}", e))?;

    if !info_output.status.success() {
        let stderr = String::from_utf8_lossy(&info_output.stderr);
        return Err(format!("Erro ao obter informações: {}", stderr));
    }

    // Retornar JSON como string
    let json_str = String::from_utf8_lossy(&info_output.stdout);
    Ok(json_str.to_string())
}

#[tauri::command]
fn download_youtube(url: String, format: String, quality: Option<String>) -> Result<String, String> {
    // Limpar URL, extraindo apenas o ID do vídeo e removendo parâmetros de playlist
    let clean_url = clean_youtube_url(&url)?;

    // Obter ou baixar yt-dlp
    let yt_dlp_path = get_yt_dlp_path()?;

    // Obter pasta de vídeos (configurável)
    let output_dir = get_videos_path()?;

    // Criar pasta se não existir
    fs::create_dir_all(&output_dir)
        .map_err(|e| format!("Erro ao criar pasta: {}", e))?;

    // Primeiro, obter metadados do vídeo para gerar nome limpo (similar ao exemplo)
    let mut info_cmd = Command::new(&yt_dlp_path);
    info_cmd.args(&[
        "--dump-single-json",
        "--no-warnings",
        "--prefer-free-formats",
        &clean_url,
    ]);

    let info_output = info_cmd
        .output()
        .map_err(|e| format!("Erro ao obter informações do vídeo: {}", e))?;

    if !info_output.status.success() {
        let stderr = String::from_utf8_lossy(&info_output.stderr);
        return Err(format!("Erro ao obter informações: {}", stderr));
    }

    // Parse JSON para obter título
    let info_json: serde_json::Value = serde_json::from_slice(&info_output.stdout)
        .map_err(|_| "Erro ao processar informações do vídeo".to_string())?;

    let title = info_json["title"]
        .as_str()
        .unwrap_or("video_sem_titulo");
    
    let sanitized_title = sanitize_title(title);
    
    // Construir caminho do arquivo (similar ao exemplo)
    let extension = if format == "audio" { "mp3" } else { "mp4" };
    let output_file = output_dir.join(format!("{}.{}", sanitized_title, extension));
    let temp_file = output_dir.join(format!("{}.temp.{}", sanitized_title, extension));

    // Remover arquivo final anterior, se existir
    if output_file.exists() {
        let _ = fs::remove_file(&output_file);
    }

    // Remover arquivo temporário anterior, se existir
    if temp_file.exists() {
        let _ = fs::remove_file(&temp_file);
    }

    // Construir comando de download com retry e fallback
    let mut download_success = false;
    let mut last_error = String::new();
    
    // Tentar diferentes estratégias de download
    let download_attempts = if format == "audio" {
        vec![
            // Tentativa 1: Formato preferido
            vec!["-x", "--audio-format", "mp3", "--audio-quality", "0"],
            // Tentativa 2: Qualidade menor
            vec!["-x", "--audio-format", "mp3", "--audio-quality", "5"],
            // Tentativa 3: Qualquer formato de áudio
            vec!["-x", "--audio-format", "best"],
        ]
    } else {
        let quality_format = get_quality_format(quality.as_deref().unwrap_or("1080p"));
        vec![
            // Tentativa 1: Qualidade solicitada
            vec!["-f", quality_format],
            // Tentativa 2: Melhor qualidade disponível
            vec!["-f", "best"],
            // Tentativa 3: Qualquer formato de vídeo
            vec!["-f", "bestvideo+bestaudio/best"],
        ]
    };
    
    for (attempt_num, format_args) in download_attempts.iter().enumerate() {
        let mut cmd = Command::new(&yt_dlp_path);
        
        if format == "audio" {
            cmd.args(format_args);
            cmd.args(&[
                "--no-warnings",
                "--prefer-free-formats",
                "--no-part",
                "--no-mtime",
                "--extractor-args", "youtube:player_client=android",
                "-o", &temp_file.to_string_lossy(),
                &clean_url,
            ]);
        } else {
            cmd.args(format_args);
            cmd.args(&[
                "--no-warnings",
                "--prefer-free-formats",
                "--no-part",
                "--no-mtime",
                "--extractor-args", "youtube:player_client=android",
                "-o", &temp_file.to_string_lossy(),
                &clean_url,
            ]);
        }
        
        // Executar comando de download
        let output = match cmd.output() {
            Ok(output) => output,
            Err(e) => {
                last_error = format!("Erro ao executar yt-dlp: {}", e);
                continue;
            }
        };
        
        if output.status.success() {
            download_success = true;
            break;
        } else {
            let stderr = String::from_utf8_lossy(&output.stderr);
            last_error = format!("Tentativa {} falhou: {}", attempt_num + 1, stderr);
            
            // Se o erro for "Did not get any data blocks", tentar atualizar yt-dlp
            if stderr.contains("Did not get any data blocks") || stderr.contains("ERROR") {
                // Limpar arquivo temporário se existir
                let _ = fs::remove_file(&temp_file);
                continue;
            }
        }
    }
    
    if !download_success {
        // Se o erro for "Did not get any data blocks", pode ser yt-dlp desatualizado
        // Tentar atualizar e fazer uma última tentativa
        if last_error.contains("Did not get any data blocks") || 
           last_error.contains("ERROR") && last_error.contains("yt-dlp") {
            
            // Tentar atualizar yt-dlp
            if let Err(update_err) = update_yt_dlp(&yt_dlp_path) {
                return Err(format!("Erro no download: {}. Falha ao atualizar yt-dlp: {}. Verifique sua conexão com a internet.", last_error, update_err));
            }
            
            // Última tentativa com yt-dlp atualizado
            let mut cmd = Command::new(&yt_dlp_path);
            if format == "audio" {
                cmd.args(&[
                    "-x", "--audio-format", "mp3", "--audio-quality", "0",
                    "--no-warnings", "--prefer-free-formats", "--no-part", "--no-mtime",
                    "--extractor-args", "youtube:player_client=android",
                    "-o", &temp_file.to_string_lossy(),
                    &clean_url,
                ]);
            } else {
                cmd.args(&[
                    "-f", "best",
                    "--no-warnings", "--prefer-free-formats", "--no-part", "--no-mtime",
                    "--extractor-args", "youtube:player_client=android",
                    "-o", &temp_file.to_string_lossy(),
                    &clean_url,
                ]);
            }
            
            let output = cmd.output()
                .map_err(|e| format!("Erro ao executar yt-dlp atualizado: {}", e))?;
            
            if !output.status.success() {
                let stderr = String::from_utf8_lossy(&output.stderr);
                return Err(format!("Erro no download após atualização: {}. Verifique a URL do vídeo e sua conexão com a internet.", stderr));
            }
            // Download bem-sucedido após atualização do yt-dlp
        } else {
            return Err(format!("Erro no download: {}. Verifique a URL do vídeo e sua conexão com a internet.", last_error));
        }
    }

    // Aguardar o Windows liberar o arquivo (similar ao exemplo)
    std::thread::sleep(std::time::Duration::from_millis(1000));

    // Verificar se o download gerou o arquivo temporário (similar ao exemplo)
    if !temp_file.exists() {
        return Err("Download não gerou arquivo temporário. Verifique a URL e tente novamente.".to_string());
    }

    // Renomear arquivo temporário para final (similar ao exemplo)
    fs::rename(&temp_file, &output_file)
        .map_err(|e| format!("Erro ao renomear arquivo: {}", e))?;

    // Verificar se o arquivo final existe
    if !output_file.exists() {
        return Err("Erro ao criar arquivo final.".to_string());
    }

    let final_file_path = output_file;

    // Remove quaisquer arquivos temporários restantes (similar ao exemplo)
    if let Ok(entries) = fs::read_dir(&output_dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_file() {
                if let Some(file_name) = path.file_name().and_then(|n| n.to_str()) {
                    if file_name.ends_with(".temp.mp4") || 
                       file_name.ends_with(".temp.temp.mp4") ||
                       file_name.ends_with(".temp.mp3") ||
                       file_name.ends_with(".temp.temp.mp3") {
                        let _ = fs::remove_file(&path);
                    }
                }
            }
        }
    }

    // Registrar atividade no histórico
    let file_size = final_file_path.metadata()
        .ok()
        .and_then(|m| Some(m.len()))
        .unwrap_or(0);
    
    let _ = record_activity("youtube_download", &format!("{}", final_file_path.display()), file_size, Some(&sanitized_title));

    // Retornar caminho completo do arquivo
    Ok(format!(
        "{}|{}",
        final_file_path.display(),
        final_file_path.file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("arquivo")
    ))
}

// Gerenciar processo do bot WhatsApp
static BOT_PROCESS: Mutex<Option<Child>> = Mutex::new(None);

#[tauri::command]
fn start_whatsapp_bot() -> Result<String, String> {
    let mut bot_process = BOT_PROCESS.lock().map_err(|e| format!("Erro ao acessar processo: {}", e))?;
    
    if bot_process.is_some() {
        return Err("Bot já está em execução".to_string());
    }

    // Obter diretórios
    let app_data_dir = dirs::data_local_dir()
        .ok_or("Não foi possível encontrar diretório de dados")?;
    
    let bot_dir = app_data_dir.join("UploadIASD");
    
    // Obter pasta de uploads (configurável)
    let uploads_dir = get_uploads_path()?;
    fs::create_dir_all(&uploads_dir)
        .map_err(|e| format!("Erro ao criar diretório: {}", e))?;

    let qr_code_path = bot_dir.join("qr-code.txt");
    let status_path = bot_dir.join("bot-status.json");
    let session_path = bot_dir.join(".wwebjs_auth");
    let cache_path = bot_dir.join(".wwebjs_cache");

    // Limpar cache e sessão antes de iniciar
    let _ = fs::remove_dir_all(&session_path);
    let _ = fs::remove_dir_all(&cache_path);

    // Encontrar Node.js
    let node_path = which::which("node")
        .or_else(|_| which::which("node.exe"))
        .map_err(|_| "Node.js não encontrado. Por favor, instale o Node.js primeiro.")?;

    // Procurar o script do bot em vários locais possíveis
    let exe_dir = env::current_exe()
        .map_err(|e| format!("Erro ao obter diretório do executável: {}", e))?
        .parent()
        .ok_or("Não foi possível obter diretório pai")?
        .to_path_buf();
    
    // Lista de locais possíveis para procurar o script
    let mut possible_paths = vec![
        // 1. No diretório do executável (produção - quando copiado manualmente)
        exe_dir.join("whatsapp-bot.cjs"),
        // 2. Em um subdiretório resources (produção - quando incluído no bundle)
        exe_dir.join("resources").join("whatsapp-bot.cjs"),
    ];
    
    // 3. No diretório pai do executável (caso o exe esteja em uma subpasta)
    if let Some(parent) = exe_dir.parent() {
        possible_paths.push(parent.join("whatsapp-bot.cjs"));
        possible_paths.push(parent.join("resources").join("whatsapp-bot.cjs"));
    }
    
    // 4. No diretório de desenvolvimento (para debug)
    possible_paths.push(PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("whatsapp-bot.cjs"));
    
    // Procurar o primeiro caminho que existe
    let bot_script = possible_paths
        .into_iter()
        .find(|path| path.exists());
    
    let bot_script = bot_script.ok_or_else(|| {
        format!(
            "Script do bot não encontrado. Procurado em:\n- {}\n- {}\n- {}",
            exe_dir.join("whatsapp-bot.cjs").display(),
            exe_dir.join("resources").join("whatsapp-bot.cjs").display(),
            PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("whatsapp-bot.cjs").display()
        )
    })?;

    // Iniciar processo Node.js
    let child = Command::new(&node_path)
        .arg(&bot_script)
        .arg(&uploads_dir.to_string_lossy().to_string())
        .arg(&qr_code_path.to_string_lossy().to_string())
        .arg(&status_path.to_string_lossy().to_string())
        .arg(&session_path.to_string_lossy().to_string())
        .arg(&cache_path.to_string_lossy().to_string())
        .spawn()
        .map_err(|e| format!("Erro ao iniciar bot: {}", e))?;

    *bot_process = Some(child);
    Ok("Bot iniciado com sucesso".to_string())
}

#[tauri::command]
fn stop_whatsapp_bot() -> Result<String, String> {
    let mut bot_process = BOT_PROCESS.lock().map_err(|e| format!("Erro ao acessar processo: {}", e))?;
    
    if let Some(mut child) = bot_process.take() {
        let pid = child.id();
        println!("Parando bot WhatsApp (PID: {})", pid);
        
        // No Windows, usar taskkill para matar processo e filhos
        #[cfg(windows)]
        {
            println!("Tentando matar processo {} e seus filhos...", pid);
            let output = Command::new("taskkill")
                .args(&["/F", "/T", "/PID", &pid.to_string()])
                .output();
            
            match output {
                Ok(result) => {
                    if result.status.success() {
                        println!("Processo {} e filhos mortos com sucesso via taskkill", pid);
                    } else {
                        let stderr = String::from_utf8_lossy(&result.stderr);
                        println!("taskkill retornou erro (pode ser que o processo já estava morto): {}", stderr);
                        // Continuar e tentar kill normal também
                    }
                }
                Err(e) => {
                    println!("Erro ao executar taskkill: {}", e);
                }
            }
        }
        
        // Tentar kill normal (funciona em Unix e como fallback no Windows)
        match child.kill() {
            Ok(_) => {
                println!("Sinal de kill enviado ao processo {}", pid);
            }
            Err(e) => {
                println!("Erro ao enviar kill ao processo {}: {} (pode já estar morto)", pid, e);
            }
        }
        
        // Aguardar o processo terminar (com timeout de 3 segundos)
        let child_clone = std::thread::spawn(move || {
            child.wait()
        });
        
        // Aguardar até 3 segundos
        let start = std::time::Instant::now();
        let mut finished = false;
        while start.elapsed().as_secs() < 3 && !finished {
            if child_clone.is_finished() {
                finished = true;
                break;
            }
            std::thread::sleep(std::time::Duration::from_millis(100));
        }
        
        if finished {
            if let Ok(Ok(status)) = child_clone.join() {
                println!("Processo terminou com status: {:?}", status);
            }
        } else {
            println!("Timeout ao aguardar processo terminar, continuando...");
        }
        
    // Limpar cache e sessão após parar (garantir limpeza completa)
    let app_data_dir = dirs::data_local_dir()
        .ok_or("Não foi possível encontrar diretório de dados")?;
    let bot_dir = app_data_dir.join("UploadIASD");
    let session_path = bot_dir.join(".wwebjs_auth");
    let cache_path = bot_dir.join(".wwebjs_cache");
    let qr_code_path = bot_dir.join("qr-code.txt");
    let status_path = bot_dir.join("bot-status.json");
    
    // Aguardar um pouco para garantir que o processo terminou completamente
    std::thread::sleep(std::time::Duration::from_millis(500));
    
    // Limpar cache e sessão completamente
    println!("Limpando cache e sessão...");
    let mut cleaned = false;
    
    // Tentar múltiplas vezes para garantir limpeza
    for _ in 0..3 {
        if session_path.exists() {
            if let Ok(_) = fs::remove_dir_all(&session_path) {
                println!("Cache de sessão removido");
                cleaned = true;
            }
        }
        
        if cache_path.exists() {
            if let Ok(_) = fs::remove_dir_all(&cache_path) {
                println!("Cache .wwebjs_cache removido");
                cleaned = true;
            }
        }
        
        if cleaned {
            break;
        }
        std::thread::sleep(std::time::Duration::from_millis(200));
    }
    
    // Limpar QR code e status
    let _ = fs::write(&qr_code_path, "");
    let _ = fs::write(&status_path, r#"{"status":"stopped","message":"Bot parado"}"#);
    
    println!("Bot parado e cache limpo com sucesso");
    Ok("Bot parado e cache limpo com sucesso".to_string())
    } else {
        // Mesmo se não houver processo registrado, limpar os arquivos
        println!("Nenhum processo registrado, limpando arquivos...");
        let app_data_dir = dirs::data_local_dir()
            .ok_or("Não foi possível encontrar diretório de dados")?;
        let bot_dir = app_data_dir.join("UploadIASD");
        let session_path = bot_dir.join(".wwebjs_auth");
        let cache_path = bot_dir.join(".wwebjs_cache");
        let qr_code_path = bot_dir.join("qr-code.txt");
        let status_path = bot_dir.join("bot-status.json");
        
        // Limpar cache e sessão completamente (múltiplas tentativas)
        for _ in 0..3 {
            let _ = fs::remove_dir_all(&session_path);
            let _ = fs::remove_dir_all(&cache_path);
            if !session_path.exists() && !cache_path.exists() {
                break;
            }
            std::thread::sleep(std::time::Duration::from_millis(200));
        }
        
        // Limpar QR code e status
        let _ = fs::write(&qr_code_path, "");
        let _ = fs::write(&status_path, r#"{"status":"stopped","message":"Bot parado"}"#);
        
        Ok("Cache limpo (processo não estava registrado)".to_string())
    }
}

#[tauri::command]
fn get_whatsapp_qr() -> Result<String, String> {
    let app_data_dir = dirs::data_local_dir()
        .ok_or("Não foi possível encontrar diretório de dados")?;
    
    let qr_code_path = app_data_dir.join("UploadIASD").join("qr-code.txt");
    
    if qr_code_path.exists() {
        fs::read_to_string(&qr_code_path)
            .map_err(|e| format!("Erro ao ler QR code: {}", e))
    } else {
        Ok("".to_string())
    }
}

#[tauri::command]
fn get_whatsapp_status() -> Result<String, String> {
    let app_data_dir = dirs::data_local_dir()
        .ok_or("Não foi possível encontrar diretório de dados")?;
    
    let status_path = app_data_dir.join("UploadIASD").join("bot-status.json");
    
    if status_path.exists() {
        fs::read_to_string(&status_path)
            .map_err(|e| format!("Erro ao ler status: {}", e))
    } else {
        Ok(r#"{"status":"stopped","message":"Bot não iniciado"}"#.to_string())
    }
}

// ==================== SISTEMA DE HISTÓRICO E ATIVIDADES ====================

// Obter caminho do arquivo de histórico
fn get_history_file_path() -> PathBuf {
    let app_data_dir = dirs::data_local_dir().unwrap_or_else(|| PathBuf::from("."));
    app_data_dir.join("UploadIASD").join("history.json")
}

// Registrar atividade no histórico
fn record_activity(activity_type: &str, file_path: &str, file_size: u64, metadata: Option<&str>) -> Result<(), String> {
    let history_path = get_history_file_path();
    
    // Criar diretório se não existir
    if let Some(parent) = history_path.parent() {
        fs::create_dir_all(parent).map_err(|e| format!("Erro ao criar diretório: {}", e))?;
    }
    
    // Ler histórico existente
    let mut history: Vec<Value> = if history_path.exists() {
        if let Ok(content) = fs::read_to_string(&history_path) {
            serde_json::from_str(&content).unwrap_or_else(|_| vec![])
        } else {
            vec![]
        }
    } else {
        vec![]
    };
    
    // Criar entrada de atividade
    let timestamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_secs();
    
    let activity = json!({
        "id": format!("{}-{}", timestamp, uuid::Uuid::new_v4().to_string().chars().take(8).collect::<String>()),
        "type": activity_type, // "upload", "youtube_download", "whatsapp_receive"
        "file_path": file_path,
        "file_name": PathBuf::from(file_path).file_name()
            .and_then(|n| n.to_str())
            .map(|s| s.to_string())
            .unwrap_or_else(|| "arquivo".to_string()),
        "file_size": file_size,
        "metadata": metadata.unwrap_or(""),
        "timestamp": timestamp,
        "date": chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string()
    });
    
    // Adicionar no início (mais recente primeiro)
    history.insert(0, activity);
    
    // Manter apenas últimos 1000 registros
    if history.len() > 1000 {
        history.truncate(1000);
    }
    
    // Salvar histórico
    let json_str = serde_json::to_string_pretty(&history)
        .map_err(|e| format!("Erro ao serializar histórico: {}", e))?;
    
    fs::write(&history_path, json_str)
        .map_err(|e| format!("Erro ao salvar histórico: {}", e))?;
    
    Ok(())
}

// Organização automática por data/tipo
// Função preparada para uso futuro quando a organização automática for ativada
#[allow(dead_code)]
fn organize_file_by_date_type(file_path: &PathBuf, activity_type: &str) -> Result<PathBuf, String> {
    let file_name = file_path.file_name()
        .ok_or("Nome de arquivo inválido")?
        .to_str()
        .ok_or("Erro ao converter nome do arquivo")?;
    
    // Obter data atual
    let now = chrono::Local::now();
    let date_folder = now.format("%Y-%m-%d").to_string();
    
    // Determinar tipo de arquivo
    let file_type = if let Some(ext) = file_path.extension().and_then(|e| e.to_str()) {
        let ext_lower = ext.to_lowercase();
        if ["mp3", "wav", "ogg", "flac", "aac", "m4a"].contains(&ext_lower.as_str()) {
            "audio"
        } else if ["mp4", "avi", "mkv", "mov", "webm", "flv"].contains(&ext_lower.as_str()) {
            "video"
        } else if ["jpg", "jpeg", "png", "gif", "bmp", "webp"].contains(&ext_lower.as_str()) {
            "image"
        } else if ["pdf", "doc", "docx", "txt"].contains(&ext_lower.as_str()) {
            "document"
        } else {
            "other"
        }
    } else {
        "other"
    };
    
    // Determinar pasta base baseado no tipo de atividade
    let base_dir = match activity_type {
        "youtube_download" => get_videos_path()?,
        "whatsapp_receive" | "upload" => get_uploads_path()?,
        _ => get_uploads_path()?,
    };
    
    // Criar estrutura: base/YYYY-MM-DD/tipo/origem/arquivo
    let organized_path = base_dir
        .join(&date_folder)
        .join(file_type)
        .join(activity_type)
        .join(file_name);
    
    // Criar diretórios necessários
    if let Some(parent) = organized_path.parent() {
        fs::create_dir_all(parent)
            .map_err(|e| format!("Erro ao criar diretório organizado: {}", e))?;
    }
    
    // Mover arquivo se necessário (se já existe em outro lugar)
    if file_path.exists() && file_path != &organized_path {
        // Verificar se arquivo de destino já existe
        let mut final_path = organized_path.clone();
        let mut counter = 1;
        
        while final_path.exists() {
            let stem = final_path.file_stem()
                .and_then(|s| s.to_str())
                .unwrap_or("file");
            let extension = final_path.extension()
                .and_then(|s| s.to_str())
                .unwrap_or("");
            
            let new_filename = if extension.is_empty() {
                format!("{} ({})", stem, counter)
            } else {
                format!("{} ({}).{}", stem, counter, extension)
            };
            
            final_path = organized_path.parent()
                .unwrap()
                .join(&new_filename);
            counter += 1;
        }
        
        fs::rename(file_path, &final_path)
            .map_err(|e| format!("Erro ao mover arquivo: {}", e))?;
        
        Ok(final_path)
    } else {
        Ok(organized_path)
    }
}

// Obter histórico de atividades
#[tauri::command]
fn get_activity_history(limit: Option<usize>, activity_type: Option<String>) -> Result<String, String> {
    let history_path = get_history_file_path();
    
    if !history_path.exists() {
        return Ok(json!([]).to_string());
    }
    
    let content = fs::read_to_string(&history_path)
        .map_err(|e| format!("Erro ao ler histórico: {}", e))?;
    
    let mut history: Vec<Value> = serde_json::from_str(&content)
        .map_err(|e| format!("Erro ao parsear histórico: {}", e))?;
    
    // Filtrar por tipo se especificado
    if let Some(filter_type) = activity_type {
        history.retain(|item| {
            item.get("type")
                .and_then(|v| v.as_str())
                .map(|t| t == filter_type)
                .unwrap_or(false)
        });
    }
    
    // Aplicar limite
    let limit_value = limit.unwrap_or(100);
    history.truncate(limit_value);
    
    Ok(json!(history).to_string())
}

// Obter estatísticas
#[tauri::command]
fn get_statistics() -> Result<String, String> {
    let history_path = get_history_file_path();
    
    let mut stats = json!({
        "total_activities": 0,
        "total_size": 0,
        "by_type": {},
        "by_date": {},
        "recent_activities": []
    });
    
    if history_path.exists() {
        if let Ok(content) = fs::read_to_string(&history_path) {
            if let Ok(history) = serde_json::from_str::<Vec<Value>>(&content) {
                let mut by_type: std::collections::HashMap<String, i64> = std::collections::HashMap::new();
                let mut by_date: std::collections::HashMap<String, i64> = std::collections::HashMap::new();
                let mut total_size: u64 = 0;
                
                for activity in &history {
                    // Contar por tipo
                    if let Some(type_str) = activity.get("type").and_then(|v| v.as_str()) {
                        *by_type.entry(type_str.to_string()).or_insert(0) += 1;
                    }
                    
                    // Contar por data
                    if let Some(date_str) = activity.get("date").and_then(|v| v.as_str()) {
                        let date_only = date_str.split(' ').next().unwrap_or(date_str);
                        *by_date.entry(date_only.to_string()).or_insert(0) += 1;
                    }
                    
                    // Somar tamanhos
                    if let Some(size) = activity.get("file_size").and_then(|v| v.as_u64()) {
                        total_size += size;
                    }
                }
                
                // Pegar últimas 10 atividades
                let recent: Vec<&Value> = history.iter().take(10).collect();
                
                stats = json!({
                    "total_activities": history.len(),
                    "total_size": total_size,
                    "by_type": by_type,
                    "by_date": by_date,
                    "recent_activities": recent
                });
            }
        }
    }
    
    Ok(stats.to_string())
}

// Obter logs do sistema
#[tauri::command]
fn get_system_logs(limit: Option<usize>) -> Result<String, String> {
    let app_data_dir = dirs::data_local_dir()
        .ok_or("Não foi possível encontrar diretório de dados")?;
    
    let logs_dir = app_data_dir.join("UploadIASD").join("logs");
    fs::create_dir_all(&logs_dir)
        .map_err(|e| format!("Erro ao criar diretório de logs: {}", e))?;
    
    let log_file = logs_dir.join("system.log");
    
    let logs_content = if log_file.exists() {
        fs::read_to_string(&log_file).unwrap_or_else(|_| String::new())
    } else {
        String::new()
    };
    
    // Processar logs (últimas linhas - mais recentes primeiro)
    let lines: Vec<&str> = logs_content.lines().collect();
    let limit_value = limit.unwrap_or(100);
    // Pegar as últimas linhas e inverter para mostrar as mais recentes primeiro
    let recent_lines: Vec<&str> = lines.iter().rev().take(limit_value).copied().collect();
    
    Ok(json!(recent_lines).to_string())
}

// Sistema de atualizações
#[tauri::command]
fn check_for_updates(current_version: String) -> Result<String, String> {
    // URL do GitHub Releases API (ajuste para seu repositório)
    let github_api_url = "https://api.github.com/repos/gabrielkramermota/UPLOAD-IASD/releases/latest";
    
    // Criar cliente HTTP com User-Agent (GitHub API requer User-Agent)
    let client = reqwest::blocking::Client::builder()
        .user_agent("Upload-IASD-Desktop/2.1.0")
        .build()
        .map_err(|e| format!("Erro ao criar cliente HTTP: {}", e))?;
    
    // Fazer requisição HTTP para verificar a versão mais recente
    let response = client
        .get(github_api_url)
        .send()
        .map_err(|e| format!("Erro ao verificar atualizações: {}", e))?;
    
    // Verificar status da resposta
    let status = response.status();
    if !status.is_success() {
        // Se for 403, pode ser rate limit ou repositório privado
        if status == 403 {
            return Err("Erro ao verificar atualizações: Acesso negado. Verifique se o repositório é público e tente novamente mais tarde.".to_string());
        }
        // Se for 404, repositório não encontrado
        if status == 404 {
            return Err("Repositório não encontrado. Verifique se o nome do repositório está correto.".to_string());
        }
        return Err(format!("Erro ao verificar atualizações: Status {}", status));
    }
    
    let json: Value = response.json()
        .map_err(|e| format!("Erro ao processar resposta: {}", e))?;
    
    // Extrair versão mais recente (formato: "v2.0.0" ou "2.0.0")
    let latest_version_tag = json.get("tag_name")
        .and_then(|v| v.as_str())
        .ok_or("Versão não encontrada na resposta")?;
    
    // Remover "v" do início se existir
    let latest_version = latest_version_tag.trim_start_matches('v');
    
    // Comparar versões usando semver
    let current_semver = Version::parse(&current_version)
        .map_err(|e| format!("Versão atual inválida: {}", e))?;
    
    let latest_semver = Version::parse(latest_version)
        .map_err(|e| format!("Versão mais recente inválida: {}", e))?;
    
    // Verificar se há atualização disponível
    if latest_semver > current_semver {
        // Extrair informações da release
        let release_name = json.get("name")
            .and_then(|v| v.as_str())
            .unwrap_or("Nova versão disponível");
        
        let release_body = json.get("body")
            .and_then(|v| v.as_str())
            .unwrap_or("");
        
        let download_url = json.get("assets")
            .and_then(|assets| assets.as_array())
            .and_then(|assets| assets.first())
            .and_then(|asset| asset.get("browser_download_url"))
            .and_then(|v| v.as_str())
            .unwrap_or("");
        
        // Retornar JSON com informações da atualização
        Ok(json!({
            "hasUpdate": true,
            "currentVersion": current_version,
            "latestVersion": latest_version,
            "releaseName": release_name,
            "releaseNotes": release_body,
            "downloadUrl": download_url
        }).to_string())
    } else {
        // Sem atualização disponível
        Ok(json!({
            "hasUpdate": false,
            "currentVersion": current_version,
            "latestVersion": latest_version
        }).to_string())
    }
}

#[tauri::command]
fn get_app_version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

// Gerenciar servidor de upload
static UPLOAD_SERVER_HANDLE: Mutex<Option<tokio::task::JoinHandle<Result<(), String>>>> = Mutex::new(None);

#[tauri::command]
async fn start_upload_server() -> Result<String, String> {
    let mut handle = UPLOAD_SERVER_HANDLE.lock().map_err(|e| format!("Erro: {}", e))?;
    
    if handle.is_some() {
        return Err("Servidor já está em execução".to_string());
    }
    
    // Obter diretório de uploads (configurável)
    let upload_dir = get_uploads_path()?;
    // Verificar se a pasta existe e tem permissão de escrita
    if !upload_dir.exists() {
        if let Err(e) = fs::create_dir_all(&upload_dir) {
            return Err(format!("Erro ao criar pasta de uploads {}: {}", upload_dir.display(), e));
        }
    }
    
    // Porta padrão
    let port = 8080;
    
    // Iniciar servidor em background
    let upload_dir_clone = upload_dir.clone();
    let server_handle = tokio::spawn(async move {
        upload_server::start_upload_server(port, upload_dir_clone).await
    });
    
    *handle = Some(server_handle);
    
    // Obter IP local
    let local_ip = local_ip_address::local_ip()
        .map_err(|_| "Não foi possível obter IP local".to_string())?;
    
    let url = format!("http://{}:{}", local_ip, port);
    
    Ok(url)
}

#[tauri::command]
fn stop_upload_server() -> Result<String, String> {
    let mut handle = UPLOAD_SERVER_HANDLE.lock().map_err(|e| format!("Erro: {}", e))?;
    
    if let Some(h) = handle.take() {
        h.abort();
        Ok("Servidor parado com sucesso".to_string())
    } else {
        Err("Servidor não está em execução".to_string())
    }
}

#[tauri::command]
fn get_upload_server_url() -> Result<String, String> {
    let handle = UPLOAD_SERVER_HANDLE.lock().map_err(|e| format!("Erro: {}", e))?;
    
    if handle.is_some() {
        let local_ip = local_ip_address::local_ip()
            .map_err(|_| "Não foi possível obter IP local".to_string())?;
        Ok(format!("http://{}:8080", local_ip))
    } else {
        Err("Servidor não está em execução".to_string())
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .setup(|_app| {
            // O ícone da janela é configurado automaticamente via tauri.conf.json
            // O icon.ico gerado do SVG (nítido) será usado automaticamente
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            greet, 
            get_video_info, 
            download_youtube,
            start_whatsapp_bot,
            stop_whatsapp_bot,
            get_whatsapp_qr,
            get_whatsapp_status,
            start_upload_server,
            stop_upload_server,
            get_upload_server_url,
            get_store_path,
            set_uploads_path,
            check_for_updates,
            get_app_version,
            get_activity_history,
            get_statistics,
            get_system_logs
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
