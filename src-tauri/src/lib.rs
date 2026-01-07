use std::process::{Command, Child};
use std::fs;
use std::path::PathBuf;
use std::io::Write;
use std::sync::Mutex;
use std::env;
use serde_json::{Value, json};

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
    // Remover parâmetros extras da URL
    let clean_url = url.split('&').next().unwrap_or(&url).trim();
    
    if clean_url.is_empty() {
        return Err("URL do vídeo não fornecida.".to_string());
    }

    // Obter ou baixar yt-dlp
    let yt_dlp_path = get_yt_dlp_path()?;

    // Obter metadados do vídeo
    let mut info_cmd = Command::new(&yt_dlp_path);
    info_cmd.args(&[
        "--dump-single-json",
        "--no-warnings",
        "--prefer-free-formats",
        clean_url,
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
    // Remover parâmetros extras da URL
    let clean_url = url.split('&').next().unwrap_or(&url).trim();
    
    if clean_url.is_empty() {
        return Err("URL do vídeo não fornecida.".to_string());
    }

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
        clean_url,
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

    // Construir comando de download
    let mut cmd = Command::new(&yt_dlp_path);
    
    if format == "audio" {
        // Baixar apenas áudio em formato MP3
        cmd.args(&[
            "-x",
            "--audio-format", "mp3",
            "--audio-quality", "0",
            "--no-warnings",
            "--prefer-free-formats",
            "--no-part",
            "-o", &temp_file.to_string_lossy(),
            clean_url,
        ]);
    } else {
        // Baixar vídeo com qualidade selecionada (similar ao exemplo)
        let quality_format = get_quality_format(quality.as_deref().unwrap_or("1080p"));
        cmd.args(&[
            "-f", quality_format,
            "-o", &temp_file.to_string_lossy(),
            "--no-warnings",
            "--prefer-free-formats",
            "--no-part",
            clean_url,
        ]);
    }

    // Executar comando de download
    let output = cmd
        .output()
        .map_err(|e| format!("Erro ao executar yt-dlp: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Erro no download: {}", stderr));
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

    // Caminho do script do bot (relativo ao diretório do executável)
    let exe_dir = env::current_exe()
        .map_err(|e| format!("Erro ao obter diretório do executável: {}", e))?
        .parent()
        .ok_or("Não foi possível obter diretório pai")?
        .to_path_buf();
    
    let mut bot_script = exe_dir.join("whatsapp-bot.cjs");
    
    // Se não encontrar no diretório do executável, tentar no diretório de desenvolvimento
    if !bot_script.exists() {
        bot_script = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("whatsapp-bot.cjs");
    }
    
    if !bot_script.exists() {
        return Err(format!("Script do bot não encontrado. Procurado em: {}", bot_script.display()));
    }

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
        
        // Limpar cache e sessão após parar
        let app_data_dir = dirs::data_local_dir()
            .ok_or("Não foi possível encontrar diretório de dados")?;
        let bot_dir = app_data_dir.join("UploadIASD");
        let session_path = bot_dir.join(".wwebjs_auth");
        let cache_path = bot_dir.join(".wwebjs_cache");
        let qr_code_path = bot_dir.join("qr-code.txt");
        let status_path = bot_dir.join("bot-status.json");
        
        // Limpar cache e sessão
        println!("Limpando cache e sessão...");
        let _ = fs::remove_dir_all(&session_path);
        let _ = fs::remove_dir_all(&cache_path);
        
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
        
        // Limpar cache e sessão
        let _ = fs::remove_dir_all(&session_path);
        let _ = fs::remove_dir_all(&cache_path);
        
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
            // Configurar ícone da janela (já configurado automaticamente via bundle.icon no tauri.conf.json)
            // O ícone icon.ico será usado automaticamente para a janela
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
            set_uploads_path
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
