use axum::{
    extract::{Extension, Multipart},
    http::StatusCode,
    response::Html,
    routing::{get, post},
    Json, Router,
};
use serde_json::json;
use std::fs;
use std::path::PathBuf;
use std::sync::Arc;
use tower_http::cors::CorsLayer;

#[derive(Clone)]
struct AppState {
    upload_dir: PathBuf,
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
            <p style="color: #999; font-size: 14px; margin-top: 5px;">Múltiplos arquivos suportados</p>
            <input type="file" id="fileInput" multiple>
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
        
        async function uploadFiles() {
            if (selectedFiles.length === 0) {
                showMessage('Por favor, selecione arquivos primeiro', 'error');
                return;
            }
            
            uploadBtn.disabled = true;
            uploadBtn.textContent = 'Enviando...';
            
            const formData = new FormData();
            selectedFiles.forEach(file => {
                formData.append('files', file);
            });
            
            try {
                const response = await fetch('/upload', {
                    method: 'POST',
                    body: formData
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
                showMessage(`❌ Erro de conexão: ${error.message}. Verifique se o servidor está rodando.`, 'error');
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
                const response = await fetch('/links', {
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
                            continue;
                        }
                    };

                    // Ler dados com timeout
                    let data_result = tokio::time::timeout(
                        std::time::Duration::from_secs(600), // 10 minutos para ler o arquivo
                        field.bytes()
                    ).await;

                    let data = match data_result {
                        Ok(Ok(bytes)) => bytes,
                        Ok(Err(e)) => {
                            let err_msg = format!("Erro ao ler dados do arquivo {}: {}", filename, e);
                            errors.push(err_msg);
                            continue;
                        }
                    Err(_) => {
                        let err_msg = format!("Timeout ao ler arquivo {}", filename);
                        errors.push(err_msg);
                            continue;
                        }
                    };

                    // Gerar nome único se arquivo já existir
                    let mut file_path = state.upload_dir.join(&filename);
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
                        }
                        Err(e) => {
                            let err_msg = format!("Erro ao salvar arquivo {}: {}", filename, e);
                            errors.push(err_msg);
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

    match fs::write(&file_path, content) {
        Ok(_) => {
            Ok(Json(json!({
                "message": format!("{} link(s) salvos com sucesso!", links.len()),
                "filename": filename
            })))
        }
        Err(e) => {
            Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({"error": format!("Erro ao salvar arquivo: {}", e)})),
            ))
        }
    }
}

pub async fn start_upload_server(port: u16, upload_dir: PathBuf) -> Result<(), String> {
    fs::create_dir_all(&upload_dir)
        .map_err(|e| format!("Erro ao criar diretório de uploads: {}", e))?;

    let state = Arc::new(AppState { upload_dir: upload_dir.clone() });

    let app = Router::new()
        .route("/", get(upload_page))
        .route("/favicon.ico", get(|| async { StatusCode::NO_CONTENT }))
        .route("/upload", post(upload_files))
        .route("/links", post(upload_links))
        .layer(CorsLayer::permissive())
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
