use serde::{Deserialize, Serialize};
use sqlx::SqlitePool;
use time::{OffsetDateTime, UtcOffset};

use crate::{
    local_db::{manual_review_queue::ManualReviewEntry, pending_order_sync::enqueue_sync_internal},
    util::now_ms,
};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ScheduleEntry {
    pub date: String,
    pub is_open: bool,
    pub start_time: Option<String>,
    pub end_time: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone, Default)]
pub struct LocalConfigSnapshot {
    pub upcoming_overrides: Vec<ScheduleEntry>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct RawOrder {
    pub platform_order_id: String,
    pub platform_id: String,
    pub items_json: String,
    pub total_value: f64,
    pub timeout_ms: i64,
}

const TURKEY_OFFSET_SECS: i32 = 3 * 3600;

fn now_turkey() -> OffsetDateTime {
    let offset = UtcOffset::from_whole_seconds(TURKEY_OFFSET_SECS)
        .expect("valid UTC+3 offset");
    OffsetDateTime::now_utc().to_offset(offset)
}

pub fn should_auto_accept(local_config: &LocalConfigSnapshot) -> bool {
    let now = now_turkey();
    let today = format!(
        "{:04}-{:02}-{:02}",
        now.year(),
        now.month() as u8,
        now.day()
    );
    let current_time = format!("{:02}:{:02}", now.hour(), now.minute());

    let Some(schedule) = local_config
        .upcoming_overrides
        .iter()
        .find(|e| e.date == today)
    else {
        return false;
    };

    if !schedule.is_open {
        return false;
    }

    let (Some(start), Some(end)) = (&schedule.start_time, &schedule.end_time) else {
        return false;
    };

    current_time >= *start && current_time <= *end
}

pub async fn handle_incoming_order(
    order: RawOrder,
    local_config: &LocalConfigSnapshot,
    pool: &SqlitePool,
) {
    let id = format!("{}:{}", order.platform_id, order.platform_order_id);
    let now = now_ms();

    if should_auto_accept(local_config) {
        let payload = serde_json::to_string(&order).unwrap_or_default();
        let _ = enqueue_sync_internal(pool, payload, "AUTO_ACCEPTED".to_string()).await;
    } else {
        let entry = ManualReviewEntry {
            id,
            platform_order_id: order.platform_order_id,
            platform_id: order.platform_id,
            items_json: order.items_json,
            total_value: order.total_value,
            received_at: now,
            expires_at: now + order.timeout_ms,
        };
        let _ =
            crate::local_db::manual_review_queue::enqueue_order_internal(pool, entry).await;
    }
}
