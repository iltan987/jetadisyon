use sqlx::SqlitePool;
use tauri::State;

use crate::util::now_ms;

pub enum LocalConfigKey {
    Restaurant,
    Platforms,
    UpcomingOverrides,
}

impl LocalConfigKey {
    pub fn as_str(&self) -> &'static str {
        match self {
            LocalConfigKey::Restaurant => "restaurant",
            LocalConfigKey::Platforms => "platforms",
            LocalConfigKey::UpcomingOverrides => "upcoming_overrides",
        }
    }
}

#[tauri::command]
pub async fn set_config(
    pool: State<'_, SqlitePool>,
    key: String,
    value: String,
) -> Result<(), String> {
    set_config_internal(&pool, &key, &value)
        .await
        .map_err(|e| e.to_string())
}

pub async fn set_config_internal(
    pool: &SqlitePool,
    key: &str,
    value: &str,
) -> Result<(), sqlx::Error> {
    let now = now_ms();
    sqlx::query(
        "INSERT INTO local_config (key, value_json, fetched_at) VALUES (?, ?, ?)
         ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json, fetched_at = excluded.fetched_at",
    )
    .bind(key)
    .bind(value)
    .bind(now)
    .execute(pool)
    .await?;
    Ok(())
}

#[tauri::command]
pub async fn get_config(
    pool: State<'_, SqlitePool>,
    key: String,
) -> Result<Option<String>, String> {
    let row: Option<(String,)> =
        sqlx::query_as("SELECT value_json FROM local_config WHERE key = ?")
            .bind(&key)
            .fetch_optional(&*pool)
            .await
            .map_err(|e| e.to_string())?;
    Ok(row.map(|(v,)| v))
}
