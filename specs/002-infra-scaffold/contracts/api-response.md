# Contract: API Response Envelope

**Authority**: Constitution §VI — API Response Contract
**Defined in**: `packages/types/src/api-response.ts`, `packages/types/src/response-codes.ts`
**Status**: Mandatory — all `apps/api` endpoints must conform

---

## Envelope Shape

```typescript
// packages/types/src/api-response.ts
export interface ApiResponse<T = undefined> {
  code: ResponseCode;
  message: string;
  data?: T;
}
```

---

## Field Rules

| Field     | Type                  | Required   | Description                                 |
| --------- | --------------------- | ---------- | ------------------------------------------- |
| `code`    | `ResponseCode` (enum) | Always     | Machine-readable outcome identifier         |
| `message` | `string`              | Always     | English developer message for logs only     |
| `data`    | `T` (generic)         | On success | Response payload; absent on error responses |

---

## ResponseCode Enum

```typescript
// packages/types/src/response-codes.ts
export enum ResponseCode {
  SUCCESS = "SUCCESS",
  CREATED = "CREATED",
  VALIDATION_ERROR = "VALIDATION_ERROR",
  NOT_FOUND = "NOT_FOUND",
  UNAUTHORIZED = "UNAUTHORIZED",
  FORBIDDEN = "FORBIDDEN",
  CONFLICT = "CONFLICT",
  INTERNAL_ERROR = "INTERNAL_ERROR",
  FEATURE_NOT_IMPLEMENTED = "FEATURE_NOT_IMPLEMENTED",
}
```

---

## HTTP Status Mapping

The HTTP status code is a **transport-layer concern** handled by the API exception filter — separate from the `code` field in the response body. The exception filter uses the `http-status-codes` library (or NestJS's `HttpStatus`) to set the appropriate HTTP status.

Frontends MUST NOT branch on HTTP status codes — they MUST use the body `code` field.

| ResponseCode              | HTTP Status |
| ------------------------- | ----------- |
| `SUCCESS`                 | 200         |
| `CREATED`                 | 201         |
| `VALIDATION_ERROR`        | 400         |
| `UNAUTHORIZED`            | 401         |
| `FORBIDDEN`               | 403         |
| `NOT_FOUND`               | 404         |
| `CONFLICT`                | 409         |
| `INTERNAL_ERROR`          | 500         |
| `FEATURE_NOT_IMPLEMENTED` | 501         |

---

## Usage Examples

### Success response

```json
{
  "code": "SUCCESS",
  "message": "Order retrieved successfully",
  "data": { "id": "ord_123", "status": "pending" }
}
```

### Error response

```json
{
  "code": "NOT_FOUND",
  "message": "Order with id ord_999 not found"
}
```

---

## Frontend Consumption Rules (constitution §VI)

1. **Always branch on `code`**, never on `message`:

   ```typescript
   // CORRECT
   if (response.code === ResponseCode.SUCCESS) { ... }

   // WRONG — string comparison on message
   if (response.message.includes('not found')) { ... }
   ```

2. **Display user-facing text via i18n**, never raw `message`:

   ```typescript
   // CORRECT
   t(`api.${response.code}`); // → Turkish translation

   // WRONG — showing raw English message to user
   showToast(response.message);
   ```

3. **Import `ResponseCode` from `@repo/types`**, not locally defined:
   ```typescript
   import { ResponseCode } from "@repo/types";
   ```

---

## Extension Protocol

When a new response code is needed:

1. Add enum entry to `packages/types/src/response-codes.ts`
2. Add `"api.<NEW_CODE>": "..."` to `packages/i18n/src/locales/tr.json`
3. Add HTTP mapping to the global exception filter in `apps/api`
4. Run `pnpm check-types` — TypeScript will surface any unhandled switch cases

Steps 1 and 2 must happen in the same commit (constitution §VI requirement).
