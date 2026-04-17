# API Contract: Admin App REST Endpoints

**Consuming client**: React admin web app (`apps/admin`)
**Server**: NestJS `apps/api`
**Date**: 2026-04-17

All responses include `code` (typed enum from `@repo/types`) and `message` (English, dev-only). All monetary values are serialized as `string` to preserve decimal precision.

---

## Restaurants

### `GET /restaurants`

List all restaurants.

**Response** `200`:

```json
{
  "code": "RESTAURANTS_OK",
  "data": [
    {
      "id": "cuid",
      "name": "Köfte Evi",
      "platformCount": 2,
      "createdAt": "..."
    }
  ]
}
```

### `POST /restaurants`

Create a new restaurant.

**Request**:

```json
{
  "name": "Köfte Evi",
  "weeklySchedule": [
    { "dayOfWeek": 1, "isOpen": true, "startTime": "09:00", "endTime": "22:00" }
  ],
  "preAcceptDelayMs": 0,
  "manualAcceptTimeoutMs": 120000
}
```

**Response** `201`: `{ "code": "RESTAURANT_CREATED", "data": { "id": "..." } }`

### `GET /restaurants/:id`

Full restaurant record including weekly schedule, platforms, and credential status.

**Response** `200`:

```json
{
  "code": "RESTAURANT_OK",
  "data": {
    "id": "cuid",
    "name": "Köfte Evi",
    "preAcceptDelayMs": 0,
    "manualAcceptTimeoutMs": 120000,
    "weeklySchedule": [ ... ],
    "platforms": [
      { "platformId": "cuid", "slug": "yemeksepeti", "isActive": true, "hasCredentials": true }
    ],
    "hasInstallationKey": true
  }
}
```

### `PUT /restaurants/:id`

Update restaurant (name, schedule, timer settings).

**Response** `200`: `{ "code": "RESTAURANT_UPDATED" }`

**Error codes**: `RESTAURANT_NOT_FOUND`, `VALIDATION_ERROR`

---

## Platforms

### `GET /platforms`

List all delivery platforms (static seed data).

**Response** `200`: `{ "code": "PLATFORMS_OK", "data": [{ "id": "...", "name": "Yemeksepeti", "slug": "..." }] }`

### `PUT /restaurants/:id/platforms/:platformId`

Enable or disable a platform for a restaurant.

**Request**: `{ "isActive": true }`
**Response** `200`: `{ "code": "PLATFORM_UPDATED" }`

---

## Credentials

### `POST /restaurants/:id/credentials/provision`

Generate a new installation key for a restaurant. Displayed once and not recoverable in plaintext again.

**Response** `200`:

```json
{
  "code": "INSTALLATION_KEY_PROVISIONED",
  "data": {
    "installationKey": "base64-encoded-key-shown-once"
  }
}
```

**Note**: The installation key is stored encrypted at rest. This response is the only time the plaintext is available. The operator must share it with the restaurant owner out-of-band.

### `GET /restaurants/:id/credentials/installation-key`

Retrieve the encrypted installation key for credential recovery.

**Response** `200`:

```json
{
  "code": "INSTALLATION_KEY_OK",
  "data": {
    "encryptedKey": "base64",
    "createdAt": "2026-01-15T10:00:00Z"
  }
}
```

### `PUT /restaurants/:id/credentials/:platformSlug`

Upload a new encrypted credential blob for a restaurant-platform pair.

**Request**:

```json
{
  "ciphertextBlob": "base64",
  "derivationSalt": "base64",
  "algorithmId": "AES-256-GCM-v1"
}
```

**Response** `200`: `{ "code": "CREDENTIAL_UPDATED" }`

---

## Orders

### `GET /restaurants/:id/orders`

List orders for a restaurant with filtering.

**Query params**: `from` (ISO date), `to` (ISO date), `platformId` (optional), `outcomeStatus` (optional), `page`, `pageSize` (default: 50)

**Response** `200`:

```json
{
  "code": "ORDERS_OK",
  "data": {
    "orders": [
      {
        "id": "cuid",
        "platformOrderId": "YS-12345",
        "platformName": "Yemeksepeti",
        "totalValue": "170.00",
        "receivedAt": "...",
        "outcomeStatus": "auto_accepted",
        "outcomeAt": "...",
        "operatorNotes": null,
        "itemCount": 2
      }
    ],
    "total": 148,
    "page": 1,
    "pageSize": 50
  }
}
```

### `GET /orders/:id`

Full order record including items and audit log.

**Response** `200`:

```json
{
  "code": "ORDER_OK",
  "data": {
    "id": "cuid",
    "platformOrderId": "YS-12345",
    "platformName": "Yemeksepeti",
    "totalValue": "170.00",
    "receivedAt": "...",
    "outcomeStatus": "auto_accepted",
    "outcomeAt": "...",
    "operatorNotes": "Müşteri ürünü değiştirmek istedi",
    "items": [{ "name": "Izgara Köfte", "quantity": 2, "unitPrice": "85.00" }],
    "auditLog": [
      {
        "field": "operatorNotes",
        "originalValue": null,
        "newValue": "Müşteri ürünü değiştirmek istedi",
        "editedAt": "...",
        "operatorId": "op-123"
      }
    ]
  }
}
```

### `PATCH /orders/:id`

Annotate or edit an order. Every call produces an audit log entry.

**Request**:

```json
{
  "operatorId": "op-123",
  "changes": {
    "operatorNotes": "Güncellenmiş not",
    "outcomeStatus": "cancelled_by_platform"
  }
}
```

**Response** `200`: `{ "code": "ORDER_UPDATED" }`

**Note**: All fields in `changes` are recorded individually in `OrderAuditLog`. Partial updates are supported — only send the fields being changed.

**Error codes**: `ORDER_NOT_FOUND`, `VALIDATION_ERROR`

---

## Daily Summaries

### `GET /restaurants/:id/summaries`

List daily summaries for a restaurant.

**Query params**: `from` (ISO date), `to` (ISO date)

**Response** `200`:

```json
{
  "code": "SUMMARIES_OK",
  "data": [
    {
      "date": "2026-04-17",
      "acceptedCount": 42,
      "failedCount": 3,
      "totalRevenue": "7140.00",
      "platformBreakdown": {
        "cuid-yemeksepeti": { "acceptedCount": 25, "revenue": "4250.00" },
        "cuid-trendyol": { "acceptedCount": 17, "revenue": "2890.00" }
      },
      "peakHour": 19,
      "topItems": [{ "name": "Izgara Köfte", "quantity": 28 }],
      "computedAt": "..."
    }
  ]
}
```

---

## Holiday Calendar

### `GET /holiday-types`

List all holiday type definitions.

**Response** `200`:

```json
{
  "code": "HOLIDAY_TYPES_OK",
  "data": [{ "id": "cuid", "name": "Ramazan Bayramı", "category": "LUNAR" }]
}
```

### `GET /holiday-calendar`

List computed calendar entries.

**Query params**: `year` (required)

**Response** `200`:

```json
{
  "code": "HOLIDAY_CALENDAR_OK",
  "data": [
    {
      "id": "cuid",
      "holidayTypeName": "Ramazan Bayramı",
      "year": 2026,
      "startDate": "2026-03-20",
      "endDate": "2026-03-22",
      "approvalStatus": "AUTO_APPROVED"
    }
  ]
}
```

### `PUT /holiday-calendar/:id`

Operator correction of a computed calendar entry.

**Request**: `{ "startDate": "2026-03-21", "endDate": "2026-03-23" }`
**Response** `200`: `{ "code": "CALENDAR_ENTRY_UPDATED", "data": { "approvalStatus": "OPERATOR_OVERRIDDEN" } }`

---

## Restaurant Holiday Policies

### `GET /restaurants/:id/holiday-policies`

List all standing holiday policies for a restaurant, with computed upcoming dates.

**Response** `200`:

```json
{
  "code": "HOLIDAY_POLICIES_OK",
  "data": [
    {
      "holidayTypeId": "cuid",
      "holidayTypeName": "Ramazan Bayramı",
      "effect": "CLOSED",
      "startTime": null,
      "endTime": null,
      "upcomingDates": [
        {
          "year": 2026,
          "startDate": "2026-03-20",
          "endDate": "2026-03-22",
          "daysOfWeek": ["Perşembe", "Cuma", "Cumartesi"]
        }
      ]
    }
  ]
}
```

### `PUT /restaurants/:id/holiday-policies/:holidayTypeId`

Create or update a standing holiday policy.

**Request**:

```json
{
  "effect": "CUSTOM_HOURS",
  "startTime": "10:00",
  "endTime": "15:00"
}
```

**Response** `200`: `{ "code": "HOLIDAY_POLICY_UPDATED" }`

### `DELETE /restaurants/:id/holiday-policies/:holidayTypeId`

Remove a standing policy (restaurant returns to weekly schedule default for that holiday).

**Response** `200`: `{ "code": "HOLIDAY_POLICY_DELETED" }`

---

## Working Day Overrides

### `GET /restaurants/:id/working-day-overrides`

List manual date exceptions for a restaurant.

**Query params**: `from` (ISO date), `to` (ISO date)

**Response** `200`:

```json
{
  "code": "OVERRIDES_OK",
  "data": [
    {
      "id": "cuid",
      "date": "2026-05-01",
      "effect": "CLOSED",
      "startTime": null,
      "endTime": null
    }
  ]
}
```

### `POST /restaurants/:id/working-day-overrides`

Create a manual override for a specific date.

**Request**: `{ "date": "2026-05-01", "effect": "CLOSED" }`
**Response** `201`: `{ "code": "OVERRIDE_CREATED", "data": { "id": "cuid" } }`

**Idempotency**: If an override already exists for `(restaurantId, date)`, returns `409 Conflict` with `OVERRIDE_ALREADY_EXISTS`.

### `PUT /working-day-overrides/:id`

Update an existing override.

**Request**: `{ "effect": "CUSTOM_HOURS", "startTime": "10:00", "endTime": "14:00" }`
**Response** `200`: `{ "code": "OVERRIDE_UPDATED" }`

### `DELETE /working-day-overrides/:id`

Delete an override (date reverts to holiday policy or weekly schedule).

**Response** `200`: `{ "code": "OVERRIDE_DELETED" }`

---

## Schedule Preview

### `GET /restaurants/:id/schedule-preview`

Compute the effective schedule for each date in a range — for display in admin and desktop app.

**Query params**: `from` (ISO date), `to` (ISO date, max 90-day range)

**Response** `200`:

```json
{
  "code": "SCHEDULE_PREVIEW_OK",
  "data": [
    {
      "date": "2026-03-20",
      "status": "closed",
      "source": "holiday_policy",
      "holidayName": "Ramazan Bayramı",
      "startTime": null,
      "endTime": null
    },
    {
      "date": "2026-03-23",
      "status": "open",
      "source": "weekly",
      "startTime": "09:00",
      "endTime": "22:00"
    }
  ]
}
```

**Note**: This endpoint drives FR-029 (admin schedule preview) and FR-030 (desktop upcoming schedule view). The server computes the result using `@repo/holidays` functions — no additional data storage required.
