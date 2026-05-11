# ADR 0002 — Plain Directory Monorepo (mobile/ + backend/)

**Status:** Accepted  
**Date:** 2026-05-11

## Context

The system has two distinct applications: a React Native / Expo mobile app (TypeScript) for field data capture, and a FastAPI backend (Python) for storage, sync, and the supervisor dashboard. Both need to live in the same repository to keep domain changes, documentation, and deployment in sync.

## Decision

Use a plain directory split with no monorepo tooling:

```
/
├── mobile/          ← Expo app (React Native + TypeScript)
├── backend/         ← FastAPI app (Python)
├── docs/
│   └── adr/
├── CONTEXT.md
└── README.md
```

Each application manages its own dependencies independently:
- `mobile/` uses Bun (`bun install`, `bun start`)
- `backend/` uses uv or pip (`uv sync`, `uvicorn main:app`)

No shared package layer is needed — the language boundary (TypeScript vs Python) means there is nothing to share at the package level. API types are kept in sync by convention: FastAPI generates an OpenAPI schema that can be used to validate or generate TypeScript types if needed in the future.

## Alternatives considered

**Turborepo:** designed for JS/TS monorepos with shared packages. Adds no value when one app is Python. Rejected.

**nx with Python plugin:** supports polyglot monorepos but is heavy to maintain for a lean team. Rejected.

## Consequences

- The current Expo project files move into `mobile/`
- All `docs/` and `CONTEXT.md` stay at the repo root (shared between both apps)
- CI/CD pipelines are configured per directory (`mobile/`, `backend/`)
- Path aliases in `mobile/` (`@/*`) remain relative to `mobile/` root
