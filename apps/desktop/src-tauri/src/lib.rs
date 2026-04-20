use sqlx::{sqlite::SqliteConnectOptions, SqlitePool};
use std::str::FromStr;
use tauri::Manager;

mod local_db;
mod platform_ws;
mod util;

#[tauri::command]
async fn show_window(window: tauri::Window) {
    let _ = window.show();
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let app_data_dir = app.path().app_data_dir()?;
            std::fs::create_dir_all(&app_data_dir)?;
            let db_url = format!("sqlite:{}", app_data_dir.join("app.db").display());

            let pool = tauri::async_runtime::block_on(async {
                let opts = SqliteConnectOptions::from_str(&db_url)?
                    .create_if_missing(true)
                    .journal_mode(sqlx::sqlite::SqliteJournalMode::Wal);
                let pool = SqlitePool::connect_with(opts).await?;
                sqlx::migrate!("./migrations").run(&pool).await?;
                Ok::<SqlitePool, sqlx::Error>(pool)
            })?;

            app.manage(pool);
            platform_ws::spawn_expiry_task(app.handle().clone());
            Ok(())
        })
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            show_window,
            local_db::manual_review_queue::enqueue_order,
            local_db::manual_review_queue::list_queue,
            local_db::manual_review_queue::remove_from_queue,
            local_db::manual_review_queue::clear_expired,
            local_db::local_config::set_config,
            local_db::local_config::get_config,
            local_db::pending_order_sync::enqueue_sync,
            local_db::pending_order_sync::list_pending,
            local_db::pending_order_sync::remove_synced,
            local_db::pending_order_sync::increment_retry,
        ])
        .run(tauri::generate_context!())
        .unwrap_or_else(|e| eprintln!("Error while running Tauri application: {e}"));
}
