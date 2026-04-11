# Contract: Translation Key Naming

**Authority**: Constitution §III — User Experience Consistency, §VI — API Response Contract
**Defined in**: `packages/i18n/src/locales/tr.json`, `packages/i18n/src/types.ts`
**Status**: Mandatory — all user-facing strings must use this system

---

## Key Structure

Translation keys use dot-notation with a top-level namespace:

```
<namespace>.<identifier>
```

---

## Namespaces

| Namespace | Purpose                                    | Examples                                       |
| --------- | ------------------------------------------ | ---------------------------------------------- |
| `api`     | One key per `ResponseCode` value           | `api.SUCCESS`, `api.NOT_FOUND`                 |
| `common`  | Shared UI chrome (buttons, labels, states) | `common.save`, `common.loading`                |
| `error`   | Form validation and input errors           | `error.required_field`, `error.invalid_format` |
| `order`   | Order management feature strings           | `order.new_order`, `order.accept`              |
| `printer` | Printer state and alerts                   | `printer.offline`, `printer.printing`          |
| `nav`     | Navigation and routing labels              | `nav.dashboard`, `nav.settings`                |

Feature-specific namespaces are added in the feature's spec/plan, not predefined here.

---

## Naming Rules

1. Namespace: lowercase, no underscores (e.g., `order`, not `order_mgmt`)
2. Identifier: snake_case (e.g., `new_order`, not `newOrder` or `new-order`)
3. `api.*` identifiers: SCREAMING_SNAKE_CASE matching the `ResponseCode` enum value exactly
4. No nesting beyond two levels (`namespace.identifier` only — no `a.b.c`)
5. No interpolation variables in keys (keys are stable identifiers, not templates)

---

## Interpolation

Use i18next interpolation syntax for dynamic values:

```json
{
  "order": {
    "items_count": "{{count}} ürün"
  }
}
```

```typescript
t("order.items_count", { count: 3 }); // → "3 ürün"
```

---

## Type Safety

`packages/i18n/src/types.ts` derives `TranslationKey` from `tr.json` structure:

```typescript
// Auto-generated union type — do not edit manually
export type TranslationKey = keyof FlattenObject<
  typeof import("./locales/tr.json")
>;
// e.g., 'api.SUCCESS' | 'common.save' | 'error.required_field' | ...
```

Using a key not present in `tr.json` is a TypeScript compile error.

---

## Adding a New String

1. Add the key+value to `packages/i18n/src/locales/tr.json`
2. TypeScript types regenerate automatically (no codegen step needed)
3. Use `t('namespace.key')` in components — TypeScript autocompletes valid keys
4. If a new `ResponseCode` was also added, both steps must be in the same commit (constitution §VI)

---

## Prohibited Patterns

```typescript
// WRONG — hardcoded Turkish text in component
<Button>Kaydet</Button>

// WRONG — hardcoded English text in component
<Button>Save</Button>

// WRONG — using raw API message for display
toast(response.message)

// CORRECT
<Button>{t('common.save')}</Button>
t(`api.${response.code}`)
```
