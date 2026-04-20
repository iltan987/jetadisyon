pub mod order_handler;

use sqlx::SqlitePool;
use tauri::{AppHandle, Manager};

use crate::local_db::{
    manual_review_queue::clear_expired_internal,
    pending_order_sync::enqueue_sync_internal,
};

pub fn spawn_expiry_task(app: AppHandle) {
    tauri::async_runtime::spawn(async move {
        let mut interval = tokio::time::interval(std::time::Duration::from_secs(10));
        loop {
            interval.tick().await;
            let pool = app.state::<SqlitePool>();
            match clear_expired_internal(&pool).await {
                Ok(expired) => {
                    for entry in expired {
                        let payload = serde_json::json!({
                            "platform_order_id": entry.platform_order_id,
                            "platform_id": entry.platform_id,
                            "items_json": entry.items_json,
                            "total_value": entry.total_value,
                            "received_at": entry.received_at,
                        })
                        .to_string();
                        let _ =
                            enqueue_sync_internal(&pool, payload, "TIMED_OUT".to_string())
                                .await;
                    }
                }
                Err(e) => eprintln!("[expiry_task] clear_expired error: {e}"),
            }
        }
    });
}
