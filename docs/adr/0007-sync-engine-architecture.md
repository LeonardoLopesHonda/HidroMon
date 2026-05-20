# ADR 0007 — Sync Engine Architecture (Mobile)

**Status:** Accepted
**Date:** 2026-05-20

## Context

ADR 0001 established offline-first as the architectural posture. ADR 0006 fixed the API contract (endpoints, IDs, auth, value columns). This ADR pins the **client-side** sync engine that sits between AsyncStorage and the FastAPI backend: when sync runs, in what order, how state transitions, what fails loudly, and where the code lives.

The single-writer invariant (one device per Área writes readings; ADR 0006) makes most of these decisions cheaper than they look — there is no real concurrent edit problem to solve.

## Decision

### Triggers

Sync runs on three triggers, no others:

1. **NetInfo connectivity restore** — listener fires when the device transitions offline → online.
2. **App foreground re-entry** — re-runs when the user returns to the app after backgrounding.
3. **Manual button** — `Áreas` screen header icon. Tap to force a sync.

No periodic interval. No Expo background fetch (flaky on Android, battery cost, supervisor reviews async).

### Order — push first, then pull

A sync run flushes the dirty queue (POST/PUT) **before** pulling deltas (GET `?since=`). The server response from each POST/PUT carries the canonical `updated_at`; the client uses that response to mark the row clean rather than waiting for the subsequent pull.

Pull-first would invent reconciliation logic (server view vs local dirty edits) for zero benefit under the single-writer invariant — what the client is pushing IS the latest truth.

### Cursor — single global

One AsyncStorage key `@telos_lastSyncedAt = max(updated_at)` across all resources. Next sync sends the same `?since=` to `/areas`, `/items`, `/readings`. Master data changes rarely, so the wasted bytes on unchanged resources are negligible. Matches ADR 0006's literal text.

### Push queue — sequential, continue-on-error

Iterate dirty rows in stable order. Per-row failures (4xx / 5xx / network) leave that row dirty and the engine continues to the next row. The queue surfaces persistent bad rows (e.g. server-side hidrômetro invariant violation, 422) without quarantining the rest of the queue behind one stuck row.

POST is idempotent per ADR 0006 (`ON CONFLICT DO NOTHING`); retry is safe. PUT is naturally idempotent.

### POST vs PUT — state machine on (`isDirty`, `syncedAt`)

| `isDirty` | `syncedAt` | Meaning | Sync action |
|---|---|---|---|
| `true`  | `null`  | new row, never sent | **POST** |
| `true`  | `"..."` | previously synced, now edited | **PUT** |
| `false` | `"..."` | clean, in sync | — |
| `false` | `null`  | impossible | — |

After successful POST/PUT, mobile sets `isDirty = false` and `syncedAt = response.updated_at`.

**Bug fix required in `AppContext.updateReading`:** today it sets `syncedAt: null` on edit, which would route a PUT-target row back to POST and the idempotent `ON CONFLICT DO NOTHING` would silently drop the edit. On edit: preserve `syncedAt`, only flip `isDirty: true`.

### Bootstrap (first install)

Master data (`areas`, `items`) blocks the UI behind a "Sincronizando dados iniciais…" screen. Reading history streams in the background; the item-detail screen shows "Histórico carregando…" until ready.

First-run **requires internet**. No mock-seed fallback — `mockData.ts` is removed (ported to a SQL seed migration; ADR 0004).

### Logout — full wipe, block-or-confirm on dirty

Logout clears AsyncStorage (`areas`, `items`, `readings`, cursor) and Supabase session. If dirty readings exist at logout time, the app blocks with a confirmation modal: "X leituras não sincronizadas serão perdidas — sair mesmo assim?".

Three-account device-handoff risk (crew / owner / supervisor on a shared field phone) makes wipe-on-logout the safe default. Re-bootstrap on next login is cheap (master data is tens of rows; ~1 MB gzipped readings worst case).

### Code layout

```
mobile/lib/api/client.ts        ← fetch wrapper, attaches Authorization: Bearer from supabase-js session
mobile/lib/sync/pull.ts         ← pure: takes session + cursor, returns server deltas
mobile/lib/sync/push.ts         ← pure: takes session + dirty rows, returns push results
mobile/context/AppContext.tsx   ← owns state, triggers, AsyncStorage writes (single writer to storage)
```

Pure functions in `lib/sync/` do no React, no AsyncStorage, no state — they take inputs and return outputs. AppContext orchestrates: it owns when sync runs, holds `syncStatus` / `lastSyncedAt` / `syncError`, and is the only place that writes AsyncStorage. Single writer to storage prevents races.

### Auth

`@supabase/supabase-js` with the default AsyncStorage session adapter. Refresh tokens live in AsyncStorage (acceptable for invite-only enterprise, trusted devices). The `apiClient` reads `supabase.auth.getSession()` on every request — the SDK transparently refreshes expired access tokens.

## Alternatives considered

- **Pull-first → push.** Rejected: reconciliation complexity for zero gain under single-writer invariant.
- **Per-resource cursors** (`lastSyncedAt_areas` etc.). Rejected: master data changes rarely; one cursor matches ADR 0006 literal text and reduces state.
- **Sequential fail-fast push.** Rejected: one stuck row should not quarantine the rest of the queue.
- **Concurrent push (`Promise.all`).** Rejected: ordering lost, harder to debug, no real perf need at this scale.
- **Expo background fetch / Headless JS.** Rejected: flaky on Android, battery cost, supervisor reviews async anyway.
- **Keep cache on logout.** Rejected: shared-device handoff across three accounts makes cross-operator data exposure too easy.
- **`expo-secure-store` for refresh token.** Deferred: KISS; AsyncStorage adequate for invite-only enterprise + trusted devices.
- **Periodic interval sync (every N minutes).** Rejected: wasted requests at field sites with poor signal; foreground re-entry catches the realistic cases.
- **Sync engine as a separate React Context provider.** Rejected: two providers writing to AsyncStorage = race risk. Single owner (AppContext) consumes pure sync functions.

## Consequences

- `AppContext` gains `sync()`, `syncStatus: 'idle' | 'syncing' | 'error'`, `lastSyncedAt: string | null`, `syncError: string | null`.
- `Reading` type on mobile gains `recordedAt: string` (frozen at first save; ADR 0005) and aligns its `values` field to the wire shape `{valor?, nivel?, vazao?, t1?, t2?, t3?}` (ADR 0006).
- `mobile/data/mockData.ts` is deleted. First-run UX hard-depends on internet and the SQL seed migration being applied.
- `@react-native-community/netinfo` and `@supabase/supabase-js` join `mobile/package.json`.
- The Áreas screen header gains a sync button + dirty-count badge + last-sync subtitle.
- A "Sair com X leituras não sincronizadas?" confirmation modal is needed in the logout flow.
- Mock credentials (`telos/telos2024`) and `MOCK_CREDENTIALS`/`MOCK_PASSWORDS` are removed from `AppContext`.
