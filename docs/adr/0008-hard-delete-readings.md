# ADR 0008 — Hard Delete for Readings

**Status:** Accepted (amends ADR 0006 "Delete semantics")
**Date:** 2026-07-15

## Context

ADR 0006 declared readings **edit-only** — no DELETE endpoint, no `deleted_at` — justified by the single-writer invariant. In practice that proved insufficient: rows that *shouldn't exist* (full duplicates) or belong on a *different item* (wrong-item entries) can't be repaired by editing values, so the operator kept deleting them directly in the database. We're adding a real delete path.

## Decision

**Hard delete.** `DELETE /readings/{id}` physically removes the row and is **idempotent** (204 even if the row is already gone). Soft delete (`deleted_at`) was considered and rejected: the owner prefers not to retain tombstones, and the single-shared-device + wipe-on-logout topology makes a physical delete converge without them.

Because the `?since=` pull only ever adds/updates rows (it cannot carry "this row is gone"), the mobile client owns delete durability:

- A **never-synced** reading (`syncedAt === null`) is dropped locally with no server call.
- A **synced** reading is removed from the UI immediately and its id is queued in a mobile-only **pending-delete list** in AsyncStorage; the `DELETE` fires on the next sync (so deletes work offline). The queue drains on any non-error response.
- On sync, rows still in the pending-delete queue are filtered out of the pulled result so a delta pull can't resurrect a row whose delete hasn't been confirmed yet.
- The queue is wiped on logout along with the rest of the cache.

Delete is available to any authenticated account (no role gating in v1), guarded by a confirmation dialog on the reading's edit screen.

## Consequences

- **Deletes do not propagate live to other cached sessions** — only via logout-wipe + fresh pull. Acceptable under the single-device, single-writer-per-área reality; would need reconsidering if multiple long-lived devices ever share an área.
- **No audit trail for deletions.** A hard-deleted reading leaves no trace. If a future audit requirement demands retention, this ADR should be superseded by a soft-delete design.
- Deleting a mid-sequence hidrômetro reading does not violate the odometer invariant (remaining values stay non-decreasing), so no revalidation is triggered.
