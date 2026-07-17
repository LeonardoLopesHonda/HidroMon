# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with this repository.

## Monorepo Structure

```
/
├── mobile/    ← Expo app (React Native + TypeScript)
├── backend/   ← FastAPI API (Python)
├── web/       ← Supervisor web dashboard (Vite + React + TypeScript)
├── docs/adr/  ← Architecture decision records
├── CONTEXT.md ← Domain glossary and known issues
└── README.md
```

## Mobile App (mobile/)

**Package Manager:** Bun

```bash
cd mobile

bun install           # Install dependencies
bun start             # Start Expo dev server (w=web, a=Android, i=iOS)
bun run android       # Android emulator
bun run ios           # iOS simulator
bun run web           # Web browser
bun run lint          # Run ESLint
```

**Stack:** React Native 0.81 + Expo 54 + TypeScript + Expo Router (file-based routing)

### Routing (mobile/app/)

- `app/_layout.tsx` — root layout, stack navigation
- `app/index.tsx` — splash / auth redirect
- `app/auth.tsx` — login screen
- `app/(app)/areas.tsx` — areas list
- `app/(app)/[areaId]/index.tsx` — monitoring type selection
- `app/(app)/[areaId]/[type]/index.tsx` — monitored items list
- `app/(app)/[areaId]/[type]/[itemId]/index.tsx` — item detail + readings
- `app/(app)/[areaId]/[type]/[itemId]/form.tsx` — add/edit reading

### Key Directories

- `mobile/components/ui/` — UI primitives (Card, Button, FAB, StatsCard, etc.)
- `mobile/context/AppContext.tsx` — global state and AsyncStorage persistence
- `mobile/types/index.ts` — domain types (Area, MonitoredItem, Reading, etc.)
- `mobile/data/mockData.ts` — seed data for first run
- `mobile/constants/theme.ts` — colors, typography, spacing

### Path Alias

`@/*` maps to `mobile/*`

### Known Issues

See `CONTEXT.md` → Known Issues section for bugs and missing model fields that must be addressed before FastAPI integration.

## Web Dashboard (web/)

**Package Manager:** Bun

```bash
cd web

bun install           # Install dependencies
bun run dev           # Start Vite dev server
bun run build          # Typecheck + production build
bun run lint           # Run oxlint
```

**Stack:** Vite + React 19 + TypeScript + React Router. Desktop-first, pt-BR. See `docs/prd/web-dashboard.md` for the full feature set and `docs/adr/0009-web-second-writer-sticky-horimetro.md` for the sync contract with mobile.

### Key Directories

- `web/src/pages/` — routed screens (LoginPage, AreasPage, …)
- `web/src/context/AuthContext.tsx` — Supabase session state, login/logout
- `web/src/lib/supabase.ts` — Supabase client
- `web/src/lib/api/` — authenticated FastAPI client
- `web/src/components/ui/` — UI primitives
- `web/src/types/index.ts` — domain types (mirrors mobile's, trimmed to what the dashboard reads)

### Path Alias

`@/*` maps to `web/src/*`

## Backend (backend/)

FastAPI + Python. See `docs/adr/0001-offline-first-sync.md` for the sync contract the API implements.

## Testing

No test infrastructure is currently configured.

## Git Conventions

- **No descriptions.** Commit messages are a single subject line only — no body, no extended explanation.
- **No co-authorship lines.** Never add `Co-Authored-By` or any attribution trailer. Commits are authored by the developer only.
- **Modular commits.** Each commit covers one logical change. Don't bundle unrelated edits; don't split a single change across multiple commits.

## Agent skills

### Issue tracker

Issues live in GitHub Issues (`LeonardoLopesHonda/monitoramento-ambiental-telos`), managed via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Default five-label vocabulary (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context repo — one `CONTEXT.md` + `docs/adr/` at the root. See `docs/agents/domain.md`.
