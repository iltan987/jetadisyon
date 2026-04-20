use serde::{Deserialize, Serialize};
use sqlx::{FromRow, SqlitePool};
use tauri::State;

use crate::util::now_ms;

#[derive(Debug, Serialize, Deserialize, Clone, FromRow)]
pub struct ManualReviewEntry {
    pub id: String,
    pub platform_order_id: String,
    pub platform_id: String,
    pub items_json: String,
    pub total_value: f64,
    pub received_at: i64,
    pub expires_at: i64,
}

#[tauri::command]
pub async fn enqueue_order(
    pool: State<'_, SqlitePool>,
    payload: ManualReviewEntry,
) -> Result<(), String> {
    enqueue_order_internal(&pool, payload)
        .await
        .map_err(|e| e.to_string())
}

pub async fn enqueue_order_internal(
    pool: &SqlitePool,
    entry: ManualReviewEntry,
) -> Result<(), sqlx::Error> {
    sqlx::query(
        "INSERT OR IGNORE INTO manual_review_queue
         (id, platform_order_id, platform_id, items_json, total_value, received_at, expires_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)",
    )
    .bind(&entry.id)
    .bind(&entry.platform_order_id)
    .bind(&entry.platform_id)
    .bind(&entry.items_json)
    .bind(entry.total_value)
    .bind(entry.received_at)
    .bind(entry.expires_at)
    .execute(pool)
    .await?;
    Ok(())
}

#[tauri::command]
pub async fn list_queue(
    pool: State<'_, SqlitePool>,
) -> Result<Vec<ManualReviewEntry>, String> {
    sqlx::query_as::<_, ManualReviewEntry>(
        "SELECT id, platform_order_id, platform_id, items_json, total_value, received_at, expires_at
         FROM manual_review_queue ORDER BY received_at ASC",
    )
    .fetch_all(&*pool)
    .await
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn remove_from_queue(
    pool: State<'_, SqlitePool>,
    id: String,
) -> Result<(), String> {
    sqlx::query("DELETE FROM manual_review_queue WHERE id = ?")
        .bind(&id)
        .execute(&*pool)
        .await
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn clear_expired(pool: State<'_, SqlitePool>) -> Result<Vec<String>, String> {
    clear_expired_internal(&pool)
        .await
        .map(|entries| entries.into_iter().map(|e| e.id).collect())
        .map_err(|e| e.to_string())
}

pub async fn clear_expired_internal(
    pool: &SqlitePool,
) -> Result<Vec<ManualReviewEntry>, sqlx::Error> {
    let now = now_ms();
    let expired = sqlx::query_as::<_, ManualReviewEntry>(
        "SELECT id, platform_order_id, platform_id, items_json, total_value, received_at, expires_at
         FROM manual_review_queue WHERE expires_at < ?",
    )
    .bind(now)
    .fetch_all(pool)
    .await?;

    if !expired.is_empty() {
        sqlx::query("DELETE FROM manual_review_queue WHERE expires_at < ?")
            .bind(now)
            .execute(pool)
            .await?;
    }

    Ok(expired)
}
