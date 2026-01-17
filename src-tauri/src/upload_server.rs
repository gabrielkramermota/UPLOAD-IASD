use axum::{
    extract::{Extension, Multipart, DefaultBodyLimit},
    http::StatusCode,
    response::Html,
    routing::{get, post},
    Json, Router,
};
use serde_json::json;
use std::fs;
use std::io::Write;
use std::path::PathBuf;
use std::sync::Arc;
use tower_http::cors::CorsLayer;
use chrono::Local;
use dirs;
use uuid::Uuid;

// Função auxiliar para formatar tamanho
fn format_size(bytes: usize) -> String {
    if bytes == 0 {
        return "0 Bytes".to_string();
    }
    let k = 1024;
    let sizes = ["Bytes", "KB", "MB", "GB"];
    let i = (bytes as f64).log(k as f64) as usize;
    format!("{:.2} {}", bytes as f64 / (k as f64).powi(i as i32), sizes[i.min(sizes.len() - 1)])
}

#[derive(Clone)]
struct AppState {
    upload_dir: PathBuf,
}

// Função auxiliar para escrever log
fn write_log(message: &str) {
    if let Some(app_data_dir) = dirs::data_local_dir() {
        let logs_dir = app_data_dir.join("UploadIASD").join("logs");
        if let Ok(_) = fs::create_dir_all(&logs_dir) {
            let log_file = logs_dir.join("system.log");
            if let Ok(mut file) = fs::OpenOptions::new()
                .create(true)
                .append(true)
                .open(&log_file)
            {
                let timestamp = Local::now().format("%Y-%m-%d %H:%M:%S");
                let _ = writeln!(file, "[{}] {}", timestamp, message);
            }
        }
    }
}

// Função auxiliar para registrar atividade no histórico
fn record_activity(activity_type: &str, file_path: &str, file_size: u64, metadata: Option<&str>) {
    if let Some(app_data_dir) = dirs::data_local_dir() {
        let history_path = app_data_dir.join("UploadIASD").join("history.json");
        
        // Criar diretório se não existir
        if let Some(parent) = history_path.parent() {
            let _ = fs::create_dir_all(parent);
        }
        
        // Ler histórico existente
        let mut history: Vec<serde_json::Value> = if history_path.exists() {
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
            "id": format!("{}-{}", timestamp, Uuid::new_v4().to_string().chars().take(8).collect::<String>()),
            "type": activity_type,
            "file_path": file_path,
            "file_name": PathBuf::from(file_path).file_name()
                .and_then(|n| n.to_str())
                .map(|s| s.to_string())
                .unwrap_or_else(|| "arquivo".to_string()),
            "file_size": file_size,
            "metadata": metadata.unwrap_or(""),
            "timestamp": timestamp,
            "date": Local::now().format("%Y-%m-%d %H:%M:%S").to_string()
        });
        
        // Adicionar no início (mais recente primeiro)
        history.insert(0, activity);
        
        // Manter apenas últimos 1000 registros
        if history.len() > 1000 {
            history.truncate(1000);
        }
        
        // Salvar histórico
        if let Ok(json_str) = serde_json::to_string_pretty(&history) {
            let _ = fs::write(&history_path, json_str);
        }
    }
}

// Página HTML para upload
async fn upload_page() -> Html<&'static str> {
    Html(r#"
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
    "#)
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
            multipart.next_field()
        ).await;

        match field_result {
            Ok(Ok(Some(field))) => {
                if field.name() == Some("files") {
                    let filename = match field.file_name() {
                        Some(name) => name.to_string(),
                        None => {
                            write_log("AVISO: Campo 'files' sem nome de arquivo, pulando...");
                            continue;
                        }
                    };

                    // Log do arquivo recebido
                    write_log(&format!("Recebendo arquivo: {} (tipo: {:?})", filename, field.content_type()));

                    // Ler dados com timeout (aumentado para arquivos grandes como PDFs)
                    let data_result = tokio::time::timeout(
                        std::time::Duration::from_secs(1800), // 30 minutos para ler o arquivo (PDFs podem ser grandes)
                        field.bytes()
                    ).await;

                    let data = match data_result {
                        Ok(Ok(bytes)) => {
                            write_log(&format!("Arquivo {} lido com sucesso, tamanho: {} bytes", filename, bytes.len()));
                            bytes
                        },
                        Ok(Err(e)) => {
                            let err_msg = format!("Erro ao ler dados do arquivo {}: {}", filename, e);
                            errors.push(err_msg.clone());
                            write_log(&format!("ERRO: {}", err_msg));
                            continue;
                        }
                    Err(_) => {
                        let err_msg = format!("Timeout ao ler arquivo {} (arquivo muito grande ou conexão lenta)", filename);
                        errors.push(err_msg.clone());
                        write_log(&format!("ERRO: {}", err_msg));
                            continue;
                        }
                    };

                    // Sanitizar nome do arquivo (remover caracteres perigosos)
                    let sanitized_filename = filename
                        .chars()
                        .map(|c| match c {
                            '<' | '>' | ':' | '"' | '/' | '\\' | '|' | '?' | '*' => '_',
                            _ => c,
                        })
                        .collect::<String>();
                    
                    // Gerar nome único se arquivo já existir
                    let mut file_path = state.upload_dir.join(&sanitized_filename);
                    let mut counter = 1;
                    
                    // Se arquivo já existe, adicionar número antes da extensão
                    while file_path.exists() {
                        let stem = file_path.file_stem()
                            .and_then(|s| s.to_str())
                            .unwrap_or("file");
                        let extension = file_path.extension()
                            .and_then(|s| s.to_str())
                            .unwrap_or("");
                        
                        let new_filename = if extension.is_empty() {
                            format!("{} ({})", stem, counter)
                        } else {
                            format!("{} ({}).{}", stem, counter, extension)
                        };
                        
                        file_path = state.upload_dir.join(&new_filename);
                        counter += 1;
                    }
                    
                    match fs::write(&file_path, &data) {
                        Ok(_) => {
                            uploaded_count += 1;
                            let file_size = data.len() as u64;
                            
                            // Registrar no log
                            write_log(&format!("Arquivo enviado com sucesso: {} -> {} ({})", filename, sanitized_filename, format_size(data.len())));
                            
                            // Registrar atividade no histórico
                            record_activity("upload", &file_path.to_string_lossy(), file_size, Some(&sanitized_filename));
                        }
                        Err(e) => {
                            let err_msg = format!("Erro ao salvar arquivo {}: {}", filename, e);
                            errors.push(err_msg.clone());
                            write_log(&format!("ERRO ao salvar arquivo: {}", err_msg));
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

    let links = payload["links"]
        .as_array()
        .ok_or((
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
            write_log(&format!("Links salvos: {} link(s) em {}", links.len(), filename));
            
            // Registrar atividade no histórico
            record_activity("upload", &file_path.to_string_lossy(), content.len() as u64, Some("links"));
            
            Ok(Json(json!({
                "message": format!("{} link(s) salvos com sucesso!", links.len()),
                "filename": filename
            })))
        }
        Err(e) => {
            let err_msg = format!("Erro ao salvar arquivo: {}", e);
            write_log(&format!("ERRO: {}", err_msg));
            Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({"error": err_msg})),
            ))
        }
    }
}

pub async fn start_upload_server(port: u16, upload_dir: PathBuf) -> Result<(), String> {
    fs::create_dir_all(&upload_dir)
        .map_err(|e| format!("Erro ao criar diretório de uploads: {}", e))?;

    // Registrar início do servidor
    write_log(&format!("Servidor de upload iniciado na porta {}", port));

    let state = Arc::new(AppState { upload_dir: upload_dir.clone() });

    let app = Router::new()
        .route("/", get(upload_page))
        .route("/favicon.ico", get(|| async { StatusCode::NO_CONTENT }))
        .route("/upload", post(upload_files))
        .route("/links", post(upload_links))
        .layer(CorsLayer::permissive())
        // Aumentar limite do body para 10GB (para suportar vídeos grandes)
        .layer(DefaultBodyLimit::max(10 * 1024 * 1024 * 1024))
        .layer(Extension(state));

    let addr = format!("0.0.0.0:{}", port);

    let listener = tokio::net::TcpListener::bind(&addr)
        .await
        .map_err(|e| format!("Erro ao iniciar servidor: {}", e))?;

    println!("Servidor de upload iniciado em http://{}", addr);

    axum::serve(listener, app)
        .await
        .map_err(|e| format!("Erro ao executar servidor: {}", e))?;

    Ok(())
}
