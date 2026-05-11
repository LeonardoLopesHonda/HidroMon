# ADR 0001 — Offline-First Architecture with Backend Sync

**Status:** Accepted  
**Date:** 2026-05-11

## Context

Field operators record readings on-site at mining properties. Sites may have no internet connectivity. The supervisor reviews data in a separate interface (FastAPI backend + dashboard, to be built). Data must eventually reach the backend without any readings being lost.

## Decision

The app operates offline-first:
1. All data is written to AsyncStorage immediately on the device
2. When connectivity is available, unsynced records are pushed to the FastAPI backend
3. `areas`, `items`, and `readings` are seeded from the backend on first install; subsequent master-data changes (new items, new areas) come from the backend

Key constraints this decision imposes on the data model:
- **UUIDs** for all entity IDs (not `Date.now()`) to avoid collisions across devices or time
- **`isDirty: boolean`** flag on `Reading` to identify records awaiting sync
- **`syncedAt: string | null`** timestamp on `Reading` set by the server on successful push
- **Last-write-wins** conflict resolution is sufficient — one operator per Área, no concurrent writes

## Alternatives considered

**Online-only (direct API calls):** rejected — field sites have unreliable connectivity; a failed save would lose a reading.

**Export-only (CSV/PDF):** rejected — the supervisor's dashboard needs structured data, not files.

## Consequences

- `addReading` and `updateReading` must set `isDirty: true` locally before any network call
- A background sync service is needed (connectivity listener → flush dirty queue)
- The FastAPI schema must match the app's local data model exactly — design app model first
- Mock credentials (`telos/telos2024`) must be replaced with real auth before backend integration
