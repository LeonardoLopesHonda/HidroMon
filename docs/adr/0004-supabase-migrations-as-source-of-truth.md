# ADR 0004 — Supabase Migrations as Schema Source of Truth

**Status:** Accepted
**Date:** 2026-05-15

## Context

The backend uses Supabase (managed Postgres + Auth). Schema can be managed three ways: SQLAlchemy `Base.metadata.create_all()`, Alembic, or Supabase SQL migrations. Supabase ships its own opinionated migration tooling (`supabase migration new`, `supabase db push`) and the platform expects to own the schema (RLS policies, `auth.users`, extensions all live there).

## Decision

**Supabase SQL migrations in `backend/supabase/migrations/*.sql` are the single source of truth for schema.** SQLAlchemy ORM classes in `app/db/database.py` are hand-mirrored to match — they describe the schema, they do not create it.

Workflow:

1. `supabase migration new <slug>` → write SQL.
2. `supabase db reset` → rebuild local DB, applies all migrations.
3. Update ORM `Mapped[...]` columns to match the new SQL.
4. `supabase db push` → apply to remote when ready.

Local Supabase stack (`supabase start`) runs Postgres + Studio + Auth in Docker for dev and tests. Cloud project is the prod target.

## Alternatives considered

- **`Base.metadata.create_all()` at app start** — rejected: no history, no rollback, breaks the moment a column type changes on prod.
- **Alembic** — rejected: Supabase already provides migration tooling; running Alembic alongside means two systems racing for ownership. Awkward with RLS policies, triggers, and extensions (those are SQL-native).

## Consequences

- Schema changes are written twice: once in SQL, once mirrored in the ORM. This is deliberate — the duplication forces the operator to read and understand the SQL, which is the actual contract.
- Drift between SQL and ORM is a real risk. A schema-drift test (e.g., reflect DB metadata at test startup and diff against `Base.metadata`) is worth adding before the model grows past a handful of tables.
- RLS policies, CHECK constraints, and seed data live in migrations — they are part of the schema, not afterthoughts.
- The mobile app's `mockData.ts` is ported into a separate seed migration (`20260520_seed_master_data.sql`) — master data only (`areas` + `monitored_items`). Reading history is not seeded; real history starts from real readings. After porting, `mockData.ts` is deleted from the mobile codebase to remove any risk of fixture data reaching prod via accidental code paths.
