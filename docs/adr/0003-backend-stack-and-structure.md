# ADR 0003 — Backend Stack and Structure

**Status:** Accepted
**Date:** 2026-05-15

## Context

The FastAPI backend must serve a single mobile sync client (offline-first Expo app) and eventually a supervisor dashboard. The team is small and the operator is learning the Python stack alongside building it. A reference repo (`LeonardoLopesHonda/tga-forum`) provides a familiar shape to follow.

## Decision

Adopt the following stack and structure:

- **Tooling:** `uv` + `pyproject.toml` (lockfile-driven, fast).
- **Framework:** FastAPI + Pydantic v2 + SQLAlchemy 2.x + pytest.
- **Package layout:** Proper Python package — imports as `from app.core.config import settings`. No `sys.path` hacks. `app/` is the deployable package.
- **Directory shape (mirrors tga-forum):**

  ```
  backend/
  ├── app/
  │   ├── __init__.py
  │   ├── main.py                  # FastAPI app + router wiring
  │   ├── api/
  │   │   ├── api.py
  │   │   └── routes/              # one file per resource
  │   ├── core/
  │   │   └── config.py            # Pydantic Settings
  │   ├── db/
  │   │   └── database.py          # engine + session + ALL ORM classes
  │   ├── models/                  # Pydantic schemas (one file per resource)
  │   └── services/                # business logic (one file per resource)
  ├── tests/                       # API/integration tests (sibling of app/)
  ├── pyproject.toml
  ├── uv.lock
  └── .env.example

  supabase/                        # repo root — managed by Supabase CLI
  └── migrations/                  # SQL migrations — source of truth
  ```

- **Layering rule:** routes (thin) → services (business logic, takes `db: Session`) → ORM. Pydantic crosses HTTP boundary; ORM never leaves the service.
- **Naming convention:** snake_case in DB and ORM, camelCase in API JSON via Pydantic `alias_generator=to_camel`, `populate_by_name=True`.

## Alternatives considered

- **pip + `requirements.txt`** (matches ref exactly) — rejected: no lockfile, slower workflow.
- **`sys.path` injection** (matches ref exactly) — rejected: hidden magic, IDE-hostile.
- **Tests inside `app/tests/`** — rejected: test code should not ship in the deployable package.
- **Skip services layer, ORM in routes** — rejected: even thin CRUD benefits from a named call site; refactor cost later > write cost now.

## Consequences

- The operator learns the standard Python packaging path, not the ref's shortcut. Re-applying lessons to other Python projects is easier.
- `models/` contains Pydantic, not ORM — a known industry-ambiguous naming. Documented here so future readers don't reorganise it.
