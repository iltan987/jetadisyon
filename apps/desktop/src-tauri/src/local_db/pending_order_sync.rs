use serde::{Deserialize, Serialize};
use sqlx::{FromRow, SqlitePool};
use tauri::State;

use crate::util::now_ms;

#[derive(Debug, Serialize, Deserialize, Clone, FromRow)]
pub struct PendingSyncEntry {
    pub id: String,
    pub order_payload: String,
    pub outcome_status: String,
    pub queued_at: i64,
    pub retry_count: i32,
    pub last_attempted_at: Option<i64>,
}

#[tauri::command]
pub async fn enqueue_sync(
    pool: State<'_, SqlitePool>,
    payload: String,
    outcome_status: String,
) -> Result<(), String> {
    enqueue_sync_internal(&pool, payload, outcome_status)
        .await
        .map_err(|e| e.to_string())
}

pub async fn enqueue_sync_internal(
    pool: &SqlitePool,
    payload: String,
    outcome_status: String,
) -> Result<(), sqlx::Error> {
    let now = now_ms();
    let id = format!("sync_{}_{}", &outcome_status, now);
    sqlx::query(
        "INSERT INTO pending_order_sync (id, order_payload, outcome_status, queued_at, retry_count)
         VALUES (?, ?, ?, ?, 0)",
    )
    .bind(&id)
    .bind(&payload)
    .bind(&outcome_status)
    .bind(now)
    .execute(pool)
    .await?;
    Ok(())
}

#[tauri::command]
pub async fn list_pending(
    pool: State<'_, SqlitePool>,
) -> Result<Vec<PendingSyncEntry>, String> {
    sqlx::query_as::<_, PendingSyncEntry>(
        "SELECT id, order_payload, outcome_status, queued_at, retry_count, last_attempted_at
         FROM pending_order_sync ORDER BY queued_at ASC",
    )
    .fetch_all(&*pool)
    .await
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn remove_synced(
    pool: State<'_, SqlitePool>,
    id: String,
) -> Result<(), String> {
    sqlx::query("DELETE FROM pending_order_sync WHERE id = ?")
        .bind(&id)
        .execute(&*pool)
        .await
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn increment_retry(
    pool: State<'_, SqlitePool>,
    id: String,
) -> Result<(), String> {
    let now = now_ms();
    sqlx::query(
        "UPDATE pending_order_sync
         SET retry_count = retry_count + 1, last_attempted_at = ?
         WHERE id = ?",
    )
    .bind(now)
    .bind(&id)
    .execute(&*pool)
    .await
    .map_err(|e| e.to_string())?;
    Ok(())
}
