# ADR 0009 — Web Dashboard as Second Writer; Sticky Horímetro on Update

**Status:** Accepted
**Date:** 2026-07-17
**Amends:** ADR 0006 (sync contract — last-write-wins rationale)

## Context

ADR 0006 chose last-write-wins conflict resolution for reading sync, justified by "always one operator per Área — no multi-device concurrency." The supervisor web dashboard invalidates that premise: it introduces horímetro backfill as a second write path onto existing readings (the hours data lives in a third-party app the field operator cannot access; whoever holds it backfills from a desk).

This creates a concrete data-loss race under pure LWW: mobile caches a reading saved with `horimetro` blank; the supervisor backfills hours via the web; the operator later edits that same reading on mobile (e.g., fixes `observacoes`) and syncs. Mobile PUTs its full stale copy — the backfilled hours are silently erased and flow as gaps into metrics and the IMASUL report.

## Decision

1. **Sticky horímetro.** On `PUT /readings/{id}`, if the incoming payload's `horimetro` is null/absent and the stored row has a value, the server keeps the stored value. Applies to all clients. Consequence: the API cannot blank a horímetro once set — corrections are made by writing a new value, consistent with how corrections work generally.
2. **Neighbor-bounded monotonicity.** Because horímetro values are backfilled out of chronological order, the usual "≥ previous reading" check is insufficient. A written `horimetro` must be ≥ the nearest earlier reading with hours **and** ≤ the nearest later reading with hours, on the same item. Server returns 422 (authoritative); web validates inline in the backfill grid.
3. **Everything else stays LWW.** All other fields keep ADR 0006's last-write-wins semantics unchanged.

## Alternatives considered

- **Pure LWW (status quo)** — rejected: a silent data-loss path feeding a regulatory filing is not an acceptable risk, however rare.
- **Field-level timestamp merge** — rejected: correct in general, but a large jump in sync complexity that ADR 0006 deliberately avoided; only one field actually has two writers.
- **Mobile pull-before-push** — rejected: narrows but does not close the race, and touches the sync engine (ADR 0007) for a problem one server-side line solves.

## Consequences

- The merge is asymmetric and field-specific — documented here so a future reader of the PUT service's null-check understands it is intentional, not a bug.
- Mobile requires no changes; its stale full-object PUTs become harmless for horímetro.
- If a second dual-writer field ever appears, revisit whether per-field rules still beat a general merge.
