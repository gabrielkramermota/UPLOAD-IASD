use chrono::Local;
use dirs;
use std::fs;
use std::io::Write;
use std::path::PathBuf;

fn logs_dir_path() -> Option<PathBuf> {
    let app_data_dir = dirs::data_local_dir()?;
    Some(app_data_dir.join("UploadIASD").join("logs"))
}

fn system_log_file_path() -> Option<PathBuf> {
    Some(logs_dir_path()?.join("system.log"))
}

fn issues_log_file_path() -> Option<PathBuf> {
    Some(logs_dir_path()?.join("issues.log"))
}

fn append_line(log_path: &PathBuf, line: &str) {
    if let Some(parent) = log_path.parent() {
        let _ = fs::create_dir_all(parent);
    }
    if let Ok(mut file) = fs::OpenOptions::new()
        .create(true)
        .append(true)
        .open(log_path)
    {
        let _ = writeln!(file, "{}", line);
    }
}

pub fn log_message(level: &str, message: &str) {
    let normalized_level = if level.trim().is_empty() {
        "INFO".to_string()
    } else {
        level.trim().to_uppercase()
    };
    let timestamp = Local::now().format("%Y-%m-%d %H:%M:%S");
    let line = format!("[{}] [{}] {}", timestamp, normalized_level, message);

    if let Some(system_log_path) = system_log_file_path() {
        append_line(&system_log_path, &line);
    }

    if normalized_level == "WARN" || normalized_level == "ERROR" {
        if let Some(issues_log_path) = issues_log_file_path() {
            append_line(&issues_log_path, &line);
        }
    }
}

pub fn log_info(message: &str) {
    log_message("INFO", message);
}

pub fn log_warn(message: &str) {
    log_message("WARN", message);
}

pub fn log_error(message: &str) {
    log_message("ERROR", message);
}
