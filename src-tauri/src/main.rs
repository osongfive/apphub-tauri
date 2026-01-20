// src-tauri/src/main.rs
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;
use base64::{engine::general_purpose, Engine as _};

// -- DATA STRUCTURES --

#[derive(Debug, Serialize, Deserialize, Clone)]
struct AppData {
    id: String,
    name: String,
    path: String,
    category: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
struct AppOverride {
    category: Option<String>,
}

// -- HELPERS --

fn get_config_path() -> PathBuf {
    let mut path = dirs::home_dir().expect("Could not find home directory");
    path.push(".app-launcher-config.json");
    path
}

fn load_overrides(path: &Path) -> HashMap<String, AppOverride> {
    if let Ok(data) = fs::read_to_string(path) {
        if let Ok(map) = serde_json::from_str(&data) {
            return map;
        }
    }
    HashMap::new()
}

fn guess_category(name: &str) -> String {
    let lower = name.to_lowercase();
    if lower.contains("code") || lower.contains("term") || lower.contains("xcode") { return "Development".to_string(); }
    if lower.contains("discord") || lower.contains("slack") || lower.contains("mail") || lower.contains("message") { return "Social".to_string(); }
    if lower.contains("spotify") || lower.contains("music") || lower.contains("tv") || lower.contains("photo") { return "Media".to_string(); }
    if lower.contains("chrome") || lower.contains("safari") || lower.contains("firefox") { return "Internet".to_string(); }
    if lower.contains("figma") || lower.contains("adobe") { return "Design".to_string(); }
    if lower.contains("settings") || lower.contains("preference") || lower.contains("activity") { return "System".to_string(); }
    "Other".to_string()
}

// -- COMMANDS --

#[tauri::command]
fn get_installed_apps() -> Vec<AppData> {
    let mut apps = Vec::new();
    
    // NOW SCANNING BOTH LOCATIONS
    let folders_to_scan = vec![
        "/Applications", 
        "/System/Applications", 
        "/System/Applications/Utilities" 
    ];

    let config_path = get_config_path();
    let overrides = load_overrides(&config_path);
    let mut id_counter = 0;

    for folder_path in folders_to_scan {
        let path = Path::new(folder_path);
        
        if let Ok(entries) = fs::read_dir(path) {
            for entry in entries {
                if let Ok(entry) = entry {
                    let path_buf = entry.path();
                    let path_str = path_buf.to_string_lossy().to_string();

                    // Check for .app extension
                    if path_buf.extension().and_then(|s| s.to_str()) == Some("app") {
                        if let Some(stem) = path_buf.file_stem().and_then(|s| s.to_str()) {
                            
                            // Skip some internal helper apps if you want, but for now we list everything
                            if stem.starts_with('.') { continue; }

                            let mut category = guess_category(stem);
                            
                            // Apply Override
                            if let Some(over) = overrides.get(&path_str) {
                                if let Some(c) = &over.category { category = c.clone(); }
                            }

                            apps.push(AppData {
                                id: id_counter.to_string(),
                                name: stem.to_string(),
                                path: path_str,
                                category,
                            });
                            id_counter += 1;
                        }
                    }
                }
            }
        }
    }
    
    // Sort alphabetically
    apps.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));
    apps
}

#[tauri::command]
fn get_app_icon(app_path: String) -> Option<String> {
    let path = Path::new(&app_path);
    
    // 1. Find Info.plist
    let plist_path = path.join("Contents/Info.plist");
    
    // 2. Read Plist to find icon filename
    let icon_name = if let Ok(file) = fs::File::open(&plist_path) {
        let value: serde_json::Value = plist::from_reader(file).ok()?;
        value.get("CFBundleIconFile")?.as_str()?.to_string()
    } else {
        return None; 
    };

    // 3. Construct path to .icns
    let mut icon_path = path.join("Contents/Resources").join(&icon_name);
    if icon_path.extension().is_none() {
        icon_path.set_extension("icns");
    }

    // 4. Read .icns file
    let file = std::fs::File::open(&icon_path).ok()?;
    let icon_family = icns::IconFamily::read(file).ok()?;
    
    // 5. Extract icon
    let image = icon_family.get_icon_with_type(icns::IconType::RGBA32_128x128_2x)
        .or_else(|_| icon_family.get_icon_with_type(icns::IconType::RGBA32_128x128))
        .or_else(|_| icon_family.get_icon_with_type(icns::IconType::RGBA32_32x32_2x))
        .ok()?; 

    // 6. Convert to PNG
    let mut png_buffer = Vec::new();
    image.write_png(&mut png_buffer).ok()?;
    
    // 7. Encode to Base64
    let base64_str = general_purpose::STANDARD.encode(&png_buffer);
    Some(format!("data:image/png;base64,{}", base64_str))
}

#[tauri::command]
fn save_app_config(path: String, category: String) {
    let config_path = get_config_path();
    let mut overrides = load_overrides(&config_path);

    overrides.insert(path, AppOverride {
        category: Some(category),
    });

    if let Ok(json) = serde_json::to_string_pretty(&overrides) {
        let _ = fs::write(config_path, json);
    }
}

#[tauri::command]
fn launch_app(path: String) {
    let _ = Command::new("open").arg(&path).spawn();
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![get_installed_apps, get_app_icon, launch_app, save_app_config])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}