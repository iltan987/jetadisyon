# API Contract: Desktop ↔ Server Sync

**Consuming client**: Tauri desktop app (Rust backend calls via HTTP)
**Server**: NestJS `apps/api`
**Date**: 2026-04-17

All responses include a machine-readable `code` field (shared TypeScript enum in `@repo/types`). `message` is English, developer-only — never displayed to users.

---

## `GET /config/:restaurantId`

Fetch the complete configuration snapshot for a restaurant. Called on startup and every 5 minutes.

**Response** `200 OK`:

```json
{
  "code": "CONFIG_OK",
  "data": {
    "restaurantId": "cuid",
    "name": "Köfte Evi",
    "preAcceptDelayMs": 0,
    "manualAcceptTimeoutMs": 120000,
    "weeklySchedule": [
      {
        "dayOfWeek": 1,
        "isOpen": true,
        "startTime": "09:00",
        "endTime": "22:00"
      }
    ],
    "activePlatforms": [{ "platformId": "cuid", "slug": "yemeksepeti" }],
    "upcomingOverrides": [
      {
        "date": "2026-05-01",
        "effect": "closed",
        "source": "working_day_override"
      },
      {
        "date": "2026-04-23",
        "effect": "open",
        "startTime": "10:00",
        "endTime": "16:00",
        "source": "holiday_policy",
        "holidayName": "23 Nisan — Ulusal Egemenlik"
      }
    ]
  }
}
```

**`upcomingOverrides`**: Effective schedules for the next 90 days where the schedule deviates from or matches a holiday date. Pre-resolved by the server using `@repo/holidays`. Desktop caches this and uses it for auto-accept decisions without calling the server.

**Error codes**: `RESTAURANT_NOT_FOUND`

---

## `POST /orders`

Sync a single order outcome record to the server.

**Request body**:

```json
{
  "restaurantId": "cuid",
  "platformSlug": "yemeksepeti",
  "platformOrderId": "YS-12345",
  "items": [{ "name": "Izgara Köfte", "quantity": 2, "unitPrice": "85.00" }],
  "totalValue": "170.00",
  "receivedAt": "2026-04-17T18:30:00Z",
  "outcomeStatus": "auto_accepted",
  "outcomeAt": "2026-04-17T18:30:01Z"
}
```

**Response** `201 Created`:

```json
{
  "code": "ORDER_SYNCED",
  "data": { "orderId": "cuid" }
}
```

**Idempotency**: If `(restaurantId, platformOrderId)` already exists, returns `200 OK` with `"code": "ORDER_ALREADY_EXISTS"` and the existing `orderId`. No duplicate created.

**Error codes**: `RESTAURANT_NOT_FOUND`, `PLATFORM_NOT_FOUND`, `VALIDATION_ERROR`

---

## `PATCH /orders/:orderId/status`

Record a platform-initiated status change (e.g., customer cancels an order that was already accepted and synced).

**Request body**:

```json
{
  "restaurantId": "cuid",
  "platformOrderId": "YS-12345",
  "outcomeStatus": "cancelled_by_platform",
  "outcomeAt": "2026-04-17T18:35:00Z"
}
```

**Response** `200 OK`:

```json
{
  "code": "ORDER_STATUS_UPDATED",
  "data": { "orderId": "cuid", "outcomeStatus": "cancelled_by_platform" }
}
```

**Note**: Only transitions to `cancelled_by_platform` are accepted via this endpoint. Other status changes are operator-only (admin app). If the order doesn't exist yet, returns `404` with `ORDER_NOT_FOUND` — caller should `POST /orders` first.

**Error codes**: `ORDER_NOT_FOUND`, `INVALID_STATUS_TRANSITION`
