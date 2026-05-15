# ADR 0005 — Three-Timestamp Model on Readings

**Status:** Accepted
**Date:** 2026-05-15

## Context

A `Reading` row needs to answer three different time-related questions:

1. **Which calendar day's water use does this row represent?** — already captured by the `date` column (YYYY-MM-DD, client-supplied via the form).
2. **When did the operator physically stand at the meter?** — needed for audit / "when was this actually written" fidelity. The operator may record offline at 14:00 Monday and sync only at 09:00 Tuesday.
3. **When did the server first see this row, and when was it last changed?** — needed for the sync contract (`?since=` delta pulls).

Overloading a single `updated_at` to mean both "last operator touch" and "last server change" would break `?since=` (client clocks can be wrong, in the past, or in the future) and silently corrupt cross-device sync.

## Decision

`readings` carries four time-related columns, each with one source of truth:

| Column | Source | Mutable on edit | Purpose |
|---|---|---|---|
| `date` (DATE) | client (form input) | yes (operator picked wrong day) | calendar day being measured |
| `recorded_at` (TIMESTAMPTZ) | client (`new Date()` at first save) | **no — frozen at first creation** | operator-clock fidelity, audit |
| `created_at` (TIMESTAMPTZ) | server (`func.now()`) | no | row birth in the system |
| `updated_at` (TIMESTAMPTZ) | server (`func.now()` + `onupdate=func.now()`) | yes (auto) | sync delta marker for `?since=` |

Immutability of `recorded_at` is enforced at two layers:

- Pydantic: `ReadingUpdate` schema omits the field entirely. PUT requests cannot carry it.
- Service layer: update path never writes to `recorded_at`.

No DB trigger is needed — defence in depth at the application layer is sufficient for a single-client API.

## Alternatives considered

- **Client overrides `updated_at`** — rejected: edit at 17:00 with operator clock makes the row look older than the server's `NOW()`. Other devices miss the edit on `?since=` pulls.
- **Single `recorded_at`, no server timestamps** — rejected: sync contract needs a server-canonical "last changed" marker. Client clocks can be wrong, in the past, or skewed.
- **`recorded_at` mutable on edit** — rejected: an edit is a *correction* of an observation, not a new observation. The operator stood at the meter once; only the recorded value was wrong.

## Consequences

- Aggregations like "readings taken this week" must choose the right column intentionally. `recorded_at` for operator-perspective windows, `created_at` for server-perspective windows, `date` for calendar-day reporting (outorga compliance).
- The mobile app's local `Reading` type gains `recordedAt: string` (set once at create) alongside the existing `date`. `created_at`/`updated_at` come from the server on sync response.
- API responses include all four fields; clients ignore the ones they don't need.
