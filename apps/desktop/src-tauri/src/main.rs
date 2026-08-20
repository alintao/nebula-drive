// NebulaDrive 星云网盘 - 桌面客户端（Tauri v2）
// 通过子进程调用同步引擎 CLI（apps/sync/dist/cli.js），以 --json 输出解析结构化数据。
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::io::{BufRead, BufReader};
use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};
use std::sync::Mutex;

use serde_json::Value;
use tauri::menu::{Menu, MenuItem, PredefinedMenuItem};
use tauri::{Emitter, Manager};

struct AppState {
    watch: Mutex<Option<std::process::Child>>,
}

fn find_node() -> Result<PathBuf, String> {
    if let Ok(p) = std::env::var("NEBULA_NODE") {
        return Ok(PathBuf::from(p));
    }
    if let Ok(path_var) = std::env::var("PATH") {
        for dir in path_var.split(';') {
            let cand = Path::new(dir).join("node.exe");
            if cand.is_file() {
                return Ok(cand);
            }
        }
    }
    let fallback = PathBuf::from(r"C:\Program Files\nodejs\node.exe");
    if fallback.is_file() {
        return Ok(fallback);
    }
    Err("未找到 node.exe：请安装 Node.js 或设置 NEBULA_NODE 环境变量".into())
}

fn find_cli() -> Result<PathBuf, String> {
    if let Ok(p) = std::env::var("NEBULA_SYNC_CLI") {
        return Ok(PathBuf::from(p));
    }
    let mut candidates: Vec<PathBuf> = vec![
        PathBuf::from("apps/sync/dist/cli.js"),
        PathBuf::from(concat!(env!("CARGO_MANIFEST_DIR"), "/../../sync/dist/cli.js")),
    ];
    if let Ok(exe) = std::env::current_exe() {
        if let Some(dir) = exe.parent() {
            // target/debug 或 target/release 向上 4 层 = apps/
            candidates.push(dir.join("../../../../sync/dist/cli.js"));
        }
    }
    for c in candidates {
        if let Ok(abs) = c.canonicalize() {
            if abs.is_file() {
                return Ok(abs);
            }
        }
    }
    Err("未找到同步引擎 cli.js：请设置 NEBULA_SYNC_CLI 环境变量指向 apps/sync/dist/cli.js".into())
}

fn state_dir(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    if let Ok(p) = std::env::var("NEBULA_SYNC_STATE") {
        let p = PathBuf::from(p);
        std::fs::create_dir_all(&p).map_err(|e| e.to_string())?;
        return Ok(p);
    }
    let d = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let d = d.join("sync");
    std::fs::create_dir_all(&d).map_err(|e| e.to_string())?;
    Ok(d)
}

fn run_cli(state_dir: &Path, args: &[String], json: bool) -> Result<String, String> {
    let node = find_node()?;
    let cli = find_cli()?;
    let mut cmd = Command::new(&node);
    cmd.arg(&cli);
    // --state-dir 是程序级选项，必须放在子命令之前
    cmd.arg("--state-dir").arg(state_dir);
    for a in args {
        cmd.arg(a);
    }
    if json {
        cmd.arg("--json");
    }
    let output = cmd.output().map_err(|e| e.to_string())?;
    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).to_string();
    if !output.status.success() {
        let msg = format!("{}{}", stdout, stderr).trim().to_string();
        return Err(if msg.is_empty() {
            "同步引擎执行失败".into()
        } else {
            msg
        });
    }
    Ok(stdout)
}

#[tauri::command]
fn login(app: tauri::AppHandle, url: String, username: String, password: String) -> Result<String, String> {
    let sd = state_dir(&app)?;
    let out = run_cli(&sd, &["login".into(), url, username, password], false)?;
    Ok(out.trim().to_string())
}

#[tauri::command]
fn create_pair(
    app: tauri::AppHandle,
    storage_id: u32,
    remote_path: String,
    mode: String,
    name: Option<String>,
    local_path: Option<String>,
    url: Option<String>,
) -> Result<Value, String> {
    let sd = state_dir(&app)?;
    let mut args: Vec<String> = vec![
        "create-pair".into(),
        "--storage-id".into(),
        storage_id.to_string(),
        "--remote-path".into(),
        remote_path,
        "--mode".into(),
        mode,
    ];
    if let Some(n) = name {
        args.push("--name".into());
        args.push(n);
    }
    if let Some(lp) = local_path {
        args.push("--local-path".into());
        args.push(lp);
    }
    if let Some(u) = url {
        args.push("--url".into());
        args.push(u);
    }
    let out = run_cli(&sd, &args, true)?;
    serde_json::from_str(out.trim()).map_err(|e| e.to_string())
}

#[tauri::command]
fn add_pair(
    app: tauri::AppHandle,
    name: String,
    token: String,
    dir: String,
    mode: String,
    url: Option<String>,
) -> Result<String, String> {
    let sd = state_dir(&app)?;
    let mut args: Vec<String> = vec![
        "add".into(),
        name,
        "--token".into(),
        token,
        "--dir".into(),
        dir,
        "--mode".into(),
        mode,
    ];
    if let Some(u) = url {
        args.push("--url".into());
        args.push(u);
    }
    let out = run_cli(&sd, &args, false)?;
    Ok(out.trim().to_string())
}

#[tauri::command]
fn list_pairs(app: tauri::AppHandle) -> Result<Value, String> {
    let sd = state_dir(&app)?;
    let out = run_cli(&sd, &["list".into()], true)?;
    serde_json::from_str(out.trim()).map_err(|e| e.to_string())
}

#[tauri::command]
fn remove_pair(app: tauri::AppHandle, id: u32) -> Result<String, String> {
    let sd = state_dir(&app)?;
    let out = run_cli(&sd, &["remove".into(), id.to_string()], false)?;
    Ok(out.trim().to_string())
}

#[tauri::command]
fn status(app: tauri::AppHandle) -> Result<Value, String> {
    let sd = state_dir(&app)?;
    let out = run_cli(&sd, &["status".into()], true)?;
    serde_json::from_str(out.trim()).map_err(|e| e.to_string())
}

#[tauri::command]
fn run_sync(app: tauri::AppHandle, pair_id: Option<String>) -> Result<String, String> {
    let sd = state_dir(&app)?;
    let mut args: Vec<String> = vec!["sync".into()];
    if let Some(id) = pair_id {
        args.push("--pair".into());
        args.push(id);
    }
    let out = run_cli(&sd, &args, false)?;
    Ok(out.trim().to_string())
}

#[tauri::command]
fn default_local_dir(app: tauri::AppHandle, name: String) -> Result<String, String> {
    let d = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let d = d.join("NebulaDrive").join(name);
    std::fs::create_dir_all(&d).map_err(|e| e.to_string())?;
    Ok(d.to_string_lossy().to_string())
}

fn do_start_watch(app: &tauri::AppHandle, pair_id: Option<String>) -> Result<(), String> {
    let state = app.state::<AppState>();
    let mut guard = state.watch.lock().map_err(|e| e.to_string())?;
    if guard.is_some() {
        return Err("同步监听已在运行中".into());
    }
    let node = find_node()?;
    let cli = find_cli()?;
    let sd = state_dir(app)?;
    let mut cmd = Command::new(&node);
    cmd.arg(&cli);
    cmd.arg("--state-dir").arg(&sd);
    cmd.arg("sync");
    if let Some(id) = pair_id {
        cmd.arg("--pair").arg(id);
    }
    cmd.arg("--watch");
    cmd.stdin(Stdio::null());
    cmd.stdout(Stdio::piped());
    cmd.stderr(Stdio::piped());
    let mut child = cmd.spawn().map_err(|e| e.to_string())?;
    let stdout = child.stdout.take().ok_or("无法获取子进程 stdout")?;
    let stderr = child.stderr.take().ok_or("无法获取子进程 stderr")?;
    *guard = Some(child);
    drop(guard);

    let app2 = app.clone();
    std::thread::spawn(move || {
        let emit = |line: &str| {
            let _ = app2.emit("sync-log", line.to_string());
        };
        emit(&format!("[watch] 同步监听已启动（node: {}）", node.display()));
        let so = BufReader::new(stdout);
        for line in so.lines() {
            match line {
                Ok(l) => emit(&l),
                Err(_) => break,
            }
        }
        let se = BufReader::new(stderr);
        for line in se.lines() {
            match line {
                Ok(l) => emit(&format!("[stderr] {l}")),
                Err(_) => break,
            }
        }
        if let Ok(mut g) = app2.state::<AppState>().watch.lock() {
            *g = None;
        }
        emit("[watch] 同步监听进程已退出");
    });
    Ok(())
}

#[tauri::command]
fn start_watch(app: tauri::AppHandle, pair_id: Option<String>) -> Result<(), String> {
    do_start_watch(&app, pair_id)
}

fn do_stop_watch(app: &tauri::AppHandle) -> Result<(), String> {
    let state = app.state::<AppState>();
    let mut guard = state.watch.lock().map_err(|e| e.to_string())?;
    if let Some(child) = guard.as_mut() {
        let _ = child.kill();
        let _ = child.wait();
    }
    *guard = None;
    Ok(())
}

#[tauri::command]
fn stop_watch(app: tauri::AppHandle) -> Result<(), String> {
    do_stop_watch(&app)
}

fn setup_tray(app: &tauri::AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    let Some(tray) = app.tray_by_id("main-tray") else {
        return Ok(());
    };
    let menu = Menu::with_items(
        app,
        &[
            &MenuItem::with_id(app, "start-watch", "启动同步监听", true, None::<&str>)?,
            &MenuItem::with_id(app, "stop-watch", "停止同步监听", true, None::<&str>)?,
            &PredefinedMenuItem::separator(app)?,
            &PredefinedMenuItem::quit(app, None)?,
        ],
    )?;
    tray.set_menu(Some(menu))?;
    tray.on_menu_event(|app, event| {
        let id: &str = &event.id().0;
        match id {
            "start-watch" => {
                if let Err(e) = do_start_watch(app, None) {
                    eprintln!("启动监听失败: {e}");
                }
            }
            "stop-watch" => {
                if let Err(e) = do_stop_watch(app) {
                    eprintln!("停止监听失败: {e}");
                }
            }
            _ => {}
        }
    });
    Ok(())
}

fn main() {
    tauri::Builder::default()
        .manage(AppState {
            watch: Mutex::new(None),
        })
        .invoke_handler(tauri::generate_handler![
            login,
            create_pair,
            add_pair,
            list_pairs,
            remove_pair,
            status,
            run_sync,
            default_local_dir,
            start_watch,
            stop_watch
        ])
        .setup(|app| {
            setup_tray(app.handle())?;
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running NebulaDrive desktop");
}
