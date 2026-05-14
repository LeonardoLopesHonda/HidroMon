# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with this repository.

## Monorepo Structure

```
/
├── mobile/    ← Expo app (React Native + TypeScript)
├── backend/   ← FastAPI API (Python) — to be scaffolded
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

## Backend (backend/)

FastAPI + Python — not yet scaffolded. See `docs/adr/0001-offline-first-sync.md` for the sync contract the API must implement.

## Testing

No test infrastructure is currently configured.

## Git Conventions

- **Never add `Co-Authored-By` lines to commit messages.** Commits are authored by the developer only.
