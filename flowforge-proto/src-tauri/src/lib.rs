mod code_generator;

use std::fs;
use std::path::PathBuf;
use tauri::Manager;

#[tauri::command]
fn save_file(path: String, content: String) -> Result<(), String> {
    if let Some(parent) = PathBuf::from(&path).parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    fs::write(&path, &content).map_err(|e| e.to_string())
}

#[tauri::command]
fn open_file(path: String) -> Result<String, String> {
    fs::read_to_string(&path).map_err(|e| e.to_string())
}

#[tauri::command]
fn list_flow_files(dir: String) -> Result<Vec<String>, String> {
    let mut files = Vec::new();
    let entries = fs::read_dir(&dir).map_err(|e| e.to_string())?;
    for entry in entries {
        let entry = entry.map_err(|e| e.to_string())?;
        let path = entry.path();
        if path.extension().map_or(false, |ext| ext == "flow") {
            if let Some(name) = path.file_name() {
                files.push(name.to_string_lossy().to_string());
            }
        }
    }
    Ok(files)
}

#[tauri::command]
fn read_sample_file(app_handle: tauri::AppHandle) -> Result<String, String> {
    let resource_path = app_handle
        .path()
        .resource_dir()
        .map_err(|e| e.to_string())?
        .join("resources")
        .join("sample.flow.json");
    fs::read_to_string(&resource_path).map_err(|e| {
        format!("Failed to read sample file at {:?}: {}", resource_path, e)
    })
}

#[tauri::command]
fn gen_runtime_cs(
    node_defs: String,
    output_dir: String,
    force_runtime: Option<bool>,
) -> Result<code_generator::GenerateResult, String> {
    code_generator::generate_runtime_cs(
        &node_defs,
        &output_dir,
        force_runtime.unwrap_or(false),
    )
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            save_file,
            open_file,
            list_flow_files,
            read_sample_file,
            gen_runtime_cs,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
