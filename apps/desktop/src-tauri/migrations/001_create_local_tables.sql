CREATE TABLE IF NOT EXISTS manual_review_queue (
    id               TEXT    PRIMARY KEY,
    platform_order_id TEXT   NOT NULL,
    platform_id      TEXT    NOT NULL,
    items_json       TEXT    NOT NULL,
    total_value      REAL    NOT NULL,
    received_at      INTEGER NOT NULL,
    expires_at       INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS pending_order_sync (
    id               TEXT    PRIMARY KEY,
    order_payload    TEXT    NOT NULL,
    outcome_status   TEXT    NOT NULL,
    queued_at        INTEGER NOT NULL,
    retry_count      INTEGER NOT NULL DEFAULT 0,
    last_attempted_at INTEGER
);

CREATE TABLE IF NOT EXISTS local_config (
    key        TEXT PRIMARY KEY,
    value_json TEXT    NOT NULL,
    fetched_at INTEGER NOT NULL
);
