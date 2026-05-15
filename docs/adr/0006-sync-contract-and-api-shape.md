# ADR 0006 — Sync Contract and API Shape

**Status:** Accepted
**Date:** 2026-05-15

## Context

ADR 0001 established offline-first sync at the architectural level. This ADR pins down the concrete API contract and the conventions that flow from it: ID generation, endpoint shape, pagination, delete semantics, and auth.

## Decision

### IDs

- **Client-generated UUIDv4** as primary key on all sync-relevant tables (`areas`, `monitored_items`, `readings`). The mobile device generates the UUID via `crypto.randomUUID()` at the moment the row is created locally, even offline.
- ORM: `id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)` — no `server_default`.
- Pydantic `*Create` schemas include `id: UUID` as a required field — the client is the authority on the ID.
- Idempotent inserts via `INSERT ... ON CONFLICT DO NOTHING` (or upsert) on `POST /readings` — same row retried after a network blip is a no-op, not an error.

### Endpoints

```
GET  /areas?since=<iso-timestamp>
GET  /items?since=<iso-timestamp>      (optionally ?area_id=)
GET  /readings?since=<iso-timestamp>
POST /readings
PUT  /readings/{id}
```

- Master data (`areas`, `monitored_items`) is **read-only over HTTP for v1**. Creation and editing happen via SQL/Supabase Studio. A future supervisor dashboard may add write endpoints.
- `?since=` filters on `updated_at > :since` so edits propagate on the next pull. No pagination — payload is small (~16k rows ≈ 1 MB gzipped at worst over 7 years of history).
- The contract: clients must always send `?since=`. First install sends `?since=1970-01-01` (or omits) for a full pull. After that, each client tracks `lastSyncedAt = max(updated_at)` locally.

### Delete semantics

**No delete.** Readings are edit-only. Mistakes are corrected by editing the row (`PUT`), not by removing it. No `DELETE` endpoint, no `deleted_at` column. Justified by the single-writer invariant (one device per Área registers readings).

### Sync metadata

`isDirty` and `syncedAt` are **mobile-only AsyncStorage state** describing the local cache's relationship to the server. They are **not** columns in Postgres and **not** fields in API responses. After a successful POST/PUT, the mobile client sets `isDirty=false` and copies the server's `updated_at` into its local `syncedAt`.

### Auth

- **Supabase Auth, email + password, invite-only.** Three accounts: shared crew account (used by both 3rd-party operators), the project owner, the supervisor. No public signup endpoint.
- FastAPI is a resource server, not an auth server. It verifies JWTs (`Authorization: Bearer <token>`) using `SUPABASE_JWT_SECRET`. Every protected endpoint declares `current_user: User = Depends(get_current_user)`.
- **Attribution column: `created_by uuid NOT NULL`** on `readings`, server-set from the JWT on insert (never accepted in the request body). No FK to `auth.users` — Supabase owns that table.
- No `profiles` table. Operator names appear in `observacoes` text only when relevant.

### Conventions

- snake_case in DB and ORM, camelCase in API JSON via Pydantic `alias_generator=to_camel`, `populate_by_name=True`.
- RLS on for all Telos tables, permissive policy: `CREATE POLICY "authenticated_full_access" ON <table> FOR ALL TO authenticated USING (true) WITH CHECK (true);`. FastAPI connects via the service-role key and bypasses RLS in practice — RLS is belt-and-suspenders against future direct-client access (Realtime, supabase-js).

### Reading value columns

Typed nullable numeric columns, not JSONB:

- `valor NUMERIC(12,3)` — hidrômetro (m³ cumulative) and pluviômetro (mm).
- `nivel NUMERIC(8,2)` — córrego water level (cm).
- `vazao NUMERIC(10,4)` — córrego flow rate (m³/s).

Aggregates (`AVG`, `SUM`, `MAX`) are the hot path for stats; typed columns keep that SQL simple. The Pydantic schema still exposes a nested `values: { ... }` object on the wire — translation happens in the service layer to preserve the mobile app's existing shape.

A CHECK constraint enforcing "the right column is populated for each item type" is desirable but requires denormalising `type` onto `readings` (CHECK constraints cannot cross tables). Deferred: enforce in the service layer for v1, revisit if drift becomes a real bug.

## Alternatives considered

- **Server-assigned IDs** — rejected: incompatible with offline-first (the row must have a stable ID before it ever talks to the server).
- **UUIDv7** (time-ordered) — rejected for v1: needs a polyfill in React Native; v4 collision risk is negligible at this scale; index locality matters only at millions of rows.
- **Batch sync endpoint** (`POST /sync` with array body) — rejected: partial-failure semantics get hairy; sync queue size is small enough that N sequential REST calls are fine.
- **Soft delete (`deleted_at`)** — rejected: the single-writer invariant removes the sync benefit that justifies it.
- **JSONB `values`** — rejected: aggregates are the hot path for stats; typed columns keep the SQL trivial.
- **Per-Área operator scoping** — rejected for v1: the crew works across all Áreas. If scoping ever becomes a real requirement, it deserves its own ADR.

## Consequences

- `POST /readings` is idempotent — the mobile client can retry freely.
- A first-install pull may transfer ~1 MB gzipped (7 years of history). One-time cost; steady-state deltas are tiny.
- The mobile `Reading` type no longer needs `isDirty`/`syncedAt` to round-trip through the API — they stay client-local.
- The CONTEXT.md "Missing Model Fields" entries for `isDirty` and `syncedAt` are now confirmed as mobile-only fields.
