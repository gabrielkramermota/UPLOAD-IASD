use std::env;
use std::fs;
use std::path::PathBuf;

fn main() {
    tauri_build::build();
    
    // Copiar whatsapp-bot.cjs para o diretório de recursos
    let manifest_dir = PathBuf::from(env::var("CARGO_MANIFEST_DIR").unwrap());
    let bot_script = manifest_dir.join("whatsapp-bot.cjs");
    
    if bot_script.exists() {
        // Obter o diretório de saída do build
        let out_dir = PathBuf::from(env::var("OUT_DIR").unwrap());
        
        // O diretório de recursos fica em target/{profile}/resources
        // Vamos tentar encontrar o diretório target
        let target_dir = out_dir
            .parent().unwrap()  // incremental ou deps
            .parent().unwrap()  // debug ou release
            .parent().unwrap(); // target
        
        let profile = if env::var("PROFILE").unwrap_or_default() == "release" {
            "release"
        } else {
            "debug"
        };
        
        let resources_dir = target_dir.join(profile).join("resources");
        
        // Criar diretório de recursos se não existir
        if let Err(e) = fs::create_dir_all(&resources_dir) {
            println!("cargo:warning=Não foi possível criar diretório de recursos: {}", e);
        } else {
            let dest = resources_dir.join("whatsapp-bot.cjs");
            if let Err(e) = fs::copy(&bot_script, &dest) {
                println!("cargo:warning=Não foi possível copiar whatsapp-bot.cjs: {}", e);
            } else {
                println!("cargo:warning=whatsapp-bot.cjs copiado para: {}", dest.display());
            }
        }
    } else {
        println!("cargo:warning=whatsapp-bot.cjs não encontrado em: {}", bot_script.display());
    }
}
