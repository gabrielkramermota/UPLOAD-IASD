use crate::history::record_activity;
use crate::log::{log_error, log_info};
use axum::{
    extract::{DefaultBodyLimit, Extension, Multipart},
    http::StatusCode,
    response::Html,
    routing::{get, post},
    Json, Router,
};
use serde_json::json;
use std::fs;
use std::path::PathBuf;
use std::sync::Arc;
use tokio::io::AsyncWriteExt;
use tower_http::cors::CorsLayer;

// Função auxiliar para formatar tamanho
fn format_size(bytes: u64) -> String {
    if bytes == 0 {
        return "0 Bytes".to_string();
    }
    let k = 1024;
    let sizes = ["Bytes", "KB", "MB", "GB"];
    let i = (bytes as f64).log(k as f64) as usize;
    format!(
        "{:.2} {}",
        bytes as f64 / (k as f64).powi(i as i32),
        sizes[i.min(sizes.len() - 1)]
    )
}

#[derive(Clone)]
struct AppState {
    upload_dir: PathBuf,
}

fn sanitize_uploaded_filename(filename: &str) -> String {
    let normalized = filename.replace('\\', "/");
    let basename = normalized.rsplit('/').next().unwrap_or("arquivo");
    let mut sanitized = basename
        .chars()
        .map(|c| match c {
            '<' | '>' | ':' | '"' | '/' | '\\' | '|' | '?' | '*' => '_',
            c if c.is_control() => '_',
            _ => c,
        })
        .collect::<String>()
        .trim_matches(['.', ' '])
        .chars()
        .take(180)
        .collect::<String>();

    if sanitized.is_empty() || sanitized == "." || sanitized == ".." {
        sanitized = "arquivo".to_string();
    }

    let stem = PathBuf::from(&sanitized)
        .file_stem()
        .and_then(|value| value.to_str())
        .unwrap_or("")
        .to_ascii_lowercase();
    if matches!(
        stem.as_str(),
        "con"
            | "prn"
            | "aux"
            | "nul"
            | "com1"
            | "com2"
            | "com3"
            | "com4"
            | "com5"
            | "com6"
            | "com7"
            | "com8"
            | "com9"
            | "lpt1"
            | "lpt2"
            | "lpt3"
            | "lpt4"
            | "lpt5"
            | "lpt6"
            | "lpt7"
            | "lpt8"
            | "lpt9"
    ) {
        sanitized.insert(0, '_');
    }
    sanitized
}

fn reserve_upload_path(
    upload_dir: &std::path::Path,
    filename: &str,
) -> Result<(PathBuf, PathBuf), String> {
    let original = PathBuf::from(filename);
    let stem = original
        .file_stem()
        .and_then(|value| value.to_str())
        .unwrap_or("arquivo");
    let extension = original.extension().and_then(|value| value.to_str());
    let mut counter = 0;

    loop {
        let candidate_name = if counter == 0 {
            filename.to_string()
        } else {
            match extension {
                Some(ext) if !ext.is_empty() => format!("{} ({}).{}", stem, counter, ext),
                _ => format!("{} ({})", stem, counter),
            }
        };
        let file_path = upload_dir.join(&candidate_name);
        let reservation_path = upload_dir.join(format!(".{}.upload-reservation", candidate_name));
        counter += 1;

        if file_path.exists() {
            continue;
        }
        match fs::OpenOptions::new()
            .write(true)
            .create_new(true)
            .open(&reservation_path)
        {
            Ok(_) if !file_path.exists() => return Ok((file_path, reservation_path)),
            Ok(_) => {
                let _ = fs::remove_file(&reservation_path);
            }
            Err(error) if error.kind() == std::io::ErrorKind::AlreadyExists => {}
            Err(error) => {
                return Err(format!(
                    "Erro ao reservar o nome do arquivo {}: {}",
                    candidate_name, error
                ));
            }
        }
    }
}

async fn stream_field_to_disk(
    mut field: axum::extract::multipart::Field<'_>,
    upload_dir: &std::path::Path,
    filename: &str,
) -> Result<(PathBuf, u64, String), String> {
    let sanitized_filename = sanitize_uploaded_filename(filename);
    let (file_path, reservation_path) = reserve_upload_path(upload_dir, &sanitized_filename)?;
    let temp_path = upload_dir.join(format!(".{}.uploading", uuid::Uuid::new_v4().simple()));
    let mut output = match tokio::fs::File::create(&temp_path).await {
        Ok(file) => file,
        Err(error) => {
            let _ = fs::remove_file(&reservation_path);
            return Err(format!("Erro ao criar arquivo temporário: {}", error));
        }
    };
    let mut total_size = 0_u64;

    let write_result: Result<(), String> = async {
        loop {
            let next_chunk =
                tokio::time::timeout(std::time::Duration::from_secs(300), field.chunk())
                    .await
                    .map_err(|_| format!("Timeout ao receber {}", filename))?
                    .map_err(|e| format!("Erro ao receber {}: {}", filename, e))?;

            let Some(chunk) = next_chunk else {
                break;
            };
            total_size = total_size
                .checked_add(chunk.len() as u64)
                .ok_or_else(|| "Tamanho do arquivo excedeu o limite suportado".to_string())?;
            output
                .write_all(&chunk)
                .await
                .map_err(|e| format!("Erro ao gravar {}: {}", filename, e))?;
        }
        output
            .flush()
            .await
            .map_err(|e| format!("Erro ao finalizar {}: {}", filename, e))?;
        output
            .sync_all()
            .await
            .map_err(|e| format!("Erro ao sincronizar {}: {}", filename, e))?;
        Ok(())
    }
    .await;

    drop(output);
    if let Err(err) = write_result {
        let _ = tokio::fs::remove_file(&temp_path).await;
        let _ = tokio::fs::remove_file(&reservation_path).await;
        return Err(err);
    }

    if let Err(err) = tokio::fs::rename(&temp_path, &file_path).await {
        let _ = tokio::fs::remove_file(&temp_path).await;
        let _ = tokio::fs::remove_file(&reservation_path).await;
        return Err(format!("Erro ao concluir {}: {}", filename, err));
    }
    let _ = tokio::fs::remove_file(&reservation_path).await;

    Ok((file_path, total_size, sanitized_filename))
}

fn cleanup_incomplete_uploads(upload_dir: &std::path::Path) {
    let Ok(entries) = fs::read_dir(upload_dir) else {
        return;
    };
    for entry in entries.flatten() {
        let path = entry.path();
        let is_incomplete = path
            .file_name()
            .and_then(|name| name.to_str())
            .is_some_and(|name| {
                name.starts_with('.')
                    && (name.ends_with(".uploading") || name.ends_with(".upload-reservation"))
            });
        if is_incomplete {
            let _ = fs::remove_file(path);
        }
    }
}

// Página HTML para upload
async fn upload_page() -> Html<&'static str> {
    Html(
        r#"
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Upload IASD</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        .container {
            background: white;
            border-radius: 20px;
            padding: 40px;
            max-width: 500px;
            width: 100%;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        }
        h1 {
            color: #333;
            margin-bottom: 10px;
            text-align: center;
        }
        .subtitle {
            color: #666;
            text-align: center;
            margin-bottom: 30px;
        }
        .upload-area {
            border: 3px dashed #667eea;
            border-radius: 10px;
            padding: 40px;
            text-align: center;
            margin-bottom: 20px;
            cursor: pointer;
            transition: all 0.3s;
        }
        .upload-area:hover {
            background: #f0f4ff;
            border-color: #764ba2;
        }
        .upload-area.dragover {
            background: #e8f0fe;
            border-color: #764ba2;
        }
        input[type="file"] {
            display: none;
        }
        .btn {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 8px;
            cursor: pointer;
            font-size: 16px;
            width: 100%;
            margin-top: 10px;
            transition: transform 0.2s;
        }
        .btn:hover {
            transform: translateY(-2px);
        }
        .btn:disabled {
            opacity: 0.6;
            cursor: not-allowed;
        }
        .links-section {
            margin-top: 30px;
            padding-top: 30px;
            border-top: 2px solid #eee;
        }
        textarea {
            width: 100%;
            padding: 12px;
            border: 2px solid #ddd;
            border-radius: 8px;
            font-size: 14px;
            resize: vertical;
            min-height: 100px;
            margin-top: 10px;
        }
        .message {
            margin-top: 20px;
            padding: 12px;
            border-radius: 8px;
            text-align: center;
            display: none;
        }
        .message.success {
            background: #d4edda;
            color: #155724;
            border: 1px solid #c3e6cb;
        }
        .message.error {
            background: #f8d7da;
            color: #721c24;
            border: 1px solid #f5c6cb;
        }
        .file-list {
            margin-top: 15px;
            text-align: left;
        }
        .file-item {
            padding: 8px;
            background: #f8f9fa;
            border-radius: 5px;
            margin-bottom: 5px;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>📤 Upload IASD</h1>
        <p class="subtitle">Envie seus arquivos e links</p>
        
        <div class="upload-area" id="uploadArea">
            <p style="font-size: 48px; margin-bottom: 10px;">📁</p>
            <p><strong>Clique ou arraste arquivos aqui</strong></p>
            <p style="color: #999; font-size: 14px; margin-top: 5px;">Múltiplos arquivos suportados - Todos os tipos de documentos</p>
            <input type="file" id="fileInput" multiple accept="*/*">
        </div>
        
        <div id="fileList" class="file-list"></div>
        
        <button class="btn" id="uploadBtn" onclick="uploadFiles()">Enviar Arquivos</button>
        
        <div class="links-section">
            <h2 style="font-size: 18px; margin-bottom: 10px; color: #333;">🔗 Enviar Links</h2>
            <textarea id="linksInput" placeholder="Cole os links aqui, um por linha..."></textarea>
            <button class="btn" onclick="uploadLinks()" style="margin-top: 10px;">Enviar Links</button>
        </div>
        
        <div id="message" class="message"></div>
    </div>
    
    <script>
        const uploadArea = document.getElementById('uploadArea');
        const fileInput = document.getElementById('fileInput');
        const fileList = document.getElementById('fileList');
        const uploadBtn = document.getElementById('uploadBtn');
        let selectedFiles = [];
        
        uploadArea.addEventListener('click', () => fileInput.click());
        
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('dragover');
        });
        
        uploadArea.addEventListener('dragleave', () => {
            uploadArea.classList.remove('dragover');
        });
        
        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
            const files = Array.from(e.dataTransfer.files);
            handleFiles(files);
        });
        
        fileInput.addEventListener('change', (e) => {
            const files = Array.from(e.target.files);
            handleFiles(files);
        });
        
        function handleFiles(files) {
            selectedFiles = files;
            fileList.innerHTML = '';
            files.forEach((file) => {
                const div = document.createElement('div');
                div.className = 'file-item';
                div.innerHTML = `<strong>${file.name}</strong> (${formatSize(file.size)})`;
                fileList.appendChild(div);
            });
        }
        
        function formatSize(bytes) {
            if (bytes === 0) return '0 Bytes';
            const k = 1024;
            const sizes = ['Bytes', 'KB', 'MB', 'GB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
        }
        
        // Função auxiliar para formatar tamanho (usada no servidor Rust)
        
        async function uploadFiles() {
            if (selectedFiles.length === 0) {
                showMessage('Por favor, selecione arquivos primeiro', 'error');
                return;
            }
            
            uploadBtn.disabled = true;
            uploadBtn.textContent = 'Enviando...';
            
            const formData = new FormData();
            selectedFiles.forEach(file => {
                console.log('Adicionando arquivo:', file.name, 'Tipo:', file.type, 'Tamanho:', file.size);
                formData.append('files', file, file.name);
            });
            
            try {
                // Obter URL completa do servidor
                const serverUrl = window.location.origin;
                console.log('Enviando para:', `${serverUrl}/upload`);
                const response = await fetch(`${serverUrl}/upload`, {
                    method: 'POST',
                    body: formData,
                    // Não definir Content-Type manualmente - o navegador define automaticamente com boundary
                });
                
                let result;
                try {
                    result = await response.json();
                } catch (jsonError) {
                    const text = await response.text();
                    console.error('Erro ao parsear JSON:', text);
                    showMessage('❌ Erro ao processar resposta do servidor', 'error');
                    uploadBtn.disabled = false;
                    uploadBtn.textContent = 'Enviar Arquivos';
                    return;
                }
                
                if (response.ok) {
                    showMessage(`✅ ${result.message}`, 'success');
                    if (result.errors && result.errors !== null) {
                        console.warn('Avisos:', result.errors);
                    }
                    selectedFiles = [];
                    fileInput.value = '';
                    fileList.innerHTML = '';
                } else {
                    const errorMsg = result.error || result.message || 'Erro ao enviar arquivos';
                    showMessage(`❌ ${errorMsg}`, 'error');
                    if (result.errors) {
                        console.error('Erros detalhados:', result.errors);
                    }
                }
            } catch (error) {
                console.error('Erro na requisição:', error);
                let errorMsg = 'Erro de conexão. Verifique se o servidor está rodando.';
                if (error.message) {
                    errorMsg = `❌ Erro: ${error.message}`;
                }
                showMessage(errorMsg, 'error');
                
                // Log detalhado no console
                console.error('Detalhes do erro:', {
                    error: error,
                    files: selectedFiles.map(f => ({ name: f.name, type: f.type, size: f.size }))
                });
            } finally {
                uploadBtn.disabled = false;
                uploadBtn.textContent = 'Enviar Arquivos';
            }
        }
        
        async function uploadLinks() {
            const linksText = document.getElementById('linksInput').value.trim();
            if (!linksText) {
                showMessage('Por favor, insira pelo menos um link', 'error');
                return;
            }
            
            const links = linksText.split('\n').filter(link => link.trim());
            
            try {
                // Obter URL completa do servidor
                const serverUrl = window.location.origin;
                const response = await fetch(`${serverUrl}/links`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ links })
                });
                
                const result = await response.json();
                
                if (response.ok) {
                    showMessage(`✅ ${result.message}`, 'success');
                    document.getElementById('linksInput').value = '';
                } else {
                    showMessage(`❌ ${result.error || 'Erro ao enviar links'}`, 'error');
                }
            } catch (error) {
                showMessage(`❌ Erro: ${error.message}`, 'error');
            }
        }
        
        function showMessage(text, type) {
            const message = document.getElementById('message');
            message.textContent = text;
            message.className = `message ${type}`;
            message.style.display = 'block';
            setTimeout(() => {
                message.style.display = 'none';
            }, 5000);
        }
    </script>
</body>
</html>
    "#,
    )
}

// Endpoint para upload de arquivos
async fn upload_files(
    Extension(state): Extension<Arc<AppState>>,
    mut multipart: Multipart,
) -> Result<Json<serde_json::Value>, (StatusCode, Json<serde_json::Value>)> {
    let mut uploaded_count = 0;
    let mut errors = Vec::new();

    // Processar campos multipart com timeout e tratamento robusto de erros
    loop {
        let field_result = tokio::time::timeout(
            std::time::Duration::from_secs(300), // 5 minutos de timeout por campo
            multipart.next_field(),
        )
        .await;

        match field_result {
            Ok(Ok(Some(field))) => {
                if field.name() == Some("files") {
                    let filename = match field.file_name() {
                        Some(name) => name.to_string(),
                        None => {
                            log_info("AVISO: Campo 'files' sem nome de arquivo, pulando...");
                            continue;
                        }
                    };

                    // Log do arquivo recebido
                    log_info(&format!(
                        "Recebendo arquivo: {} (tipo: {:?})",
                        filename,
                        field.content_type()
                    ));

                    match stream_field_to_disk(field, &state.upload_dir, &filename).await {
                        Ok((file_path, file_size, sanitized_filename)) => {
                            uploaded_count += 1;
                            log_info(&format!(
                                "Arquivo enviado com sucesso: {} -> {} ({})",
                                filename,
                                sanitized_filename,
                                format_size(file_size)
                            ));

                            if let Err(err) = record_activity(
                                "upload",
                                &file_path.to_string_lossy(),
                                file_size,
                                Some(&sanitized_filename),
                            ) {
                                log_error(&format!(
                                    "Arquivo salvo, mas o histórico falhou: {}",
                                    err
                                ));
                            }
                        }
                        Err(err) => {
                            let err_msg = format!("Erro ao salvar arquivo {}: {}", filename, err);
                            errors.push(err_msg.clone());
                            log_error(&format!("ERRO ao salvar arquivo: {}", err_msg));
                        }
                    }
                }
            }
            Ok(Ok(None)) => {
                break;
            }
            Ok(Err(e)) => {
                let err_msg = format!("Erro ao processar campo multipart: {}", e);
                errors.push(err_msg);
                break;
            }
            Err(_) => {
                let err_msg = "Timeout ao processar campos multipart".to_string();
                errors.push(err_msg);
                break;
            }
        }
    }

    // Sempre retornar uma resposta válida, mesmo se houver erros
    if uploaded_count == 0 && errors.is_empty() {
        return Err((
            StatusCode::BAD_REQUEST,
            Json(json!({
                "error": "Nenhum arquivo foi enviado",
                "count": 0
            })),
        ));
    }

    if uploaded_count == 0 {
        return Err((
            StatusCode::BAD_REQUEST,
            Json(json!({
                "error": "Nenhum arquivo foi enviado com sucesso",
                "errors": errors,
                "count": 0
            })),
        ));
    }

    Ok(Json(json!({
        "message": format!("{} arquivo(s) enviado(s) com sucesso!", uploaded_count),
        "count": uploaded_count,
        "errors": if errors.is_empty() { serde_json::Value::Null } else { json!(errors) }
    })))
}

// Endpoint para upload de links
async fn upload_links(
    Extension(state): Extension<Arc<AppState>>,
    Json(payload): Json<serde_json::Value>,
) -> Result<Json<serde_json::Value>, (StatusCode, Json<serde_json::Value>)> {
    let links = payload["links"].as_array().ok_or((
        StatusCode::BAD_REQUEST,
        Json(json!({"error": "Campo 'links' não encontrado ou inválido"})),
    ))?;

    if links.is_empty() {
        return Err((
            StatusCode::BAD_REQUEST,
            Json(json!({"error": "Nenhum link fornecido"})),
        ));
    }

    let content = links
        .iter()
        .filter_map(|v| v.as_str())
        .collect::<Vec<_>>()
        .join("\n");

    let timestamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_secs();

    let filename = format!("links_{}.txt", timestamp);
    let file_path = state.upload_dir.join(&filename);

    match fs::write(&file_path, &content) {
        Ok(_) => {
            // Registrar no log
            log_info(&format!(
                "Links salvos: {} link(s) em {}",
                links.len(),
                filename
            ));

            // Registrar atividade no histórico
            if let Err(err) = record_activity(
                "upload",
                &file_path.to_string_lossy(),
                content.len() as u64,
                Some("links"),
            ) {
                log_error(&format!("Links salvos, mas o histórico falhou: {}", err));
            }

            Ok(Json(json!({
                "message": format!("{} link(s) salvos com sucesso!", links.len()),
                "filename": filename
            })))
        }
        Err(e) => {
            let err_msg = format!("Erro ao salvar arquivo: {}", e);
            log_error(&format!("ERRO: {}", err_msg));
            Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({"error": err_msg})),
            ))
        }
    }
}

pub async fn start_upload_server(
    listener: tokio::net::TcpListener,
    upload_dir: PathBuf,
) -> Result<(), String> {
    fs::create_dir_all(&upload_dir)
        .map_err(|e| format!("Erro ao criar diretório de uploads: {}", e))?;
    cleanup_incomplete_uploads(&upload_dir);

    let port = listener
        .local_addr()
        .map_err(|e| format!("Erro ao consultar endereço do servidor: {}", e))?
        .port();
    log_info(&format!("Servidor de upload iniciado na porta {}", port));

    let state = Arc::new(AppState {
        upload_dir: upload_dir.clone(),
    });

    let app = Router::new()
        .route("/", get(upload_page))
        .route("/favicon.ico", get(|| async { StatusCode::NO_CONTENT }))
        .route("/upload", post(upload_files))
        .route("/links", post(upload_links))
        .layer(CorsLayer::permissive())
        // Aumentar limite do body para 10GB (para suportar vídeos grandes)
        .layer(DefaultBodyLimit::max(10 * 1024 * 1024 * 1024))
        .layer(Extension(state));

    println!("Servidor de upload iniciado em http://0.0.0.0:{}", port);

    axum::serve(listener, app)
        .await
        .map_err(|e| format!("Erro ao executar servidor: {}", e))?;

    Ok(())
}
