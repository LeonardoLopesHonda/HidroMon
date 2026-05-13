# PRD — Telos Environmental Monitoring

> Living document. Update status as work is completed. Domain language defined in `CONTEXT.md`.

---

## What we're building

A field data-capture app for **Vetria Mineração S.A.** to replace manual spreadsheets. One field operator records daily readings from environmental monitoring instruments (hidrômetros, pluviômetros, córregos) across two sites. The app works offline and syncs to a FastAPI backend when internet is available.

**Two applications:**
- `mobile/` — React Native (Expo) field app, offline-first
- `backend/` — FastAPI API, not yet scaffolded

---

## Status legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Done and committed |
| 🔲 | Pending |
| 🔜 | Pending, blocked by another item |

---

## Mobile (`mobile/`)

### Foundation

| # | Item | Status |
|---|------|--------|
| M-1 | Monorepo structure (`mobile/` + `backend/` split) | ✅ |
| M-2 | Expo Router file-based navigation (areas → type → item → detail/form) | ✅ |
| M-3 | AsyncStorage persistence with mock data seed on first run | ✅ |
| M-4 | Auth screen with hardcoded credentials (`telos / telos2024`) | ✅ |

### Domain model

| # | Item | Status |
|---|------|--------|
| M-5 | `Area.frequency: 'daily' \| 'weekly'` | ✅ |
| M-6 | `MonitoredItem.horasOperacao: number` | ✅ |
| M-7 | `Reading.isDirty: boolean` + `Reading.syncedAt: string \| null` | ✅ |
| M-8 | UUID v4 IDs on readings (replaced `Date.now()`) | ✅ |
| M-9 | Mock data aligned with domain (real asset counts — see below) | 🔲 | Needs update: 5 hidrômetros + 1 pluviômetro on Monjolinho; 3 pluviômetros + 3 córregos on Laís |
| M-10 | AsyncStorage migration for pre-fix stored data (backward compat) | ✅ |
| M-11 | `MonitoredItem.corregoMethod: 'regua' \| 'tambor'` | 🔲 | Determines which fields the córrego form renders |

### Business logic

| # | Item | Status | Notes |
|---|------|--------|-------|
| M-12 | `getStats` rewrite: hidrômetro uses `last − first`, pluviômetro sums, córrego skips total | ✅ | |
| M-13 | `diasSemLeitura` excludes Sundays; returns `null` for weekly-cadence areas | ✅ | |
| M-14 | `updateReading` operation in AppContext (full edit, marks `isDirty: true`) | ✅ | |
| M-15 | `getPrimaryKey(item)` replaces static `PRIMARY_VALUE_KEY` — córrego régua uses `nivel`, tambor uses derived avg | 🔲 | Needed for correct stats on córrego items |
| M-16 | Monthly cap display: `limiteOutorgado × horasOperacao × daysInMonth` | 🔲 | StatsCard currently shows raw `limiteOutorgado`; needs derived cap |
| M-17 | Discriminated union for `MonitoredItem` by type | 🔲 | `limiteOutorgado` is vacuous on pluviômetro/córrego — structural smell in CONTEXT.md |

### UI / screens

| # | Item | Status | Notes |
|---|------|--------|-------|
| M-18 | Form customization per monitoring type (spec: `docs/superpowers/specs/2026-05-13-form-customization-design.md`) | 🔲 | Hidrômetro validation; régua + tambor forms; live flow previews |
| M-19 | Reading list item shows sync status badge (dirty vs synced) | 🔲 | `isDirty` flag exists; no UI indicator yet |
| M-20 | Edit reading flow: form pre-populated from existing reading, calls `updateReading` | 🔲 | Form is add-only today; tap on a reading in list → open form in edit mode |
| M-21 | Delete reading | 🔲 | Not defined yet — decide if needed before backend |

---

## Backend (`backend/`)

| # | Item | Status | Notes |
|---|------|--------|-------|
| B-1 | FastAPI project scaffold (uv, SQLite, Alembic) | 🔲 | See `docs/adr/0001-offline-first-sync.md` for sync contract |
| B-2 | Auth endpoint — replace hardcoded mobile credentials | 🔲 | Mobile currently has `telos/telos2024` hardcoded in `AppContext` |
| B-3 | `GET /areas` + `GET /items` — serve reference data | 🔲 | |
| B-4 | `POST /readings/sync` — accept array of dirty readings, return server timestamps | 🔲 | Last-write-wins conflict resolution per ADR 0001 |
| B-5 | `PATCH /readings/:id` — update a reading (operator correction) | 🔲 | |
| B-6 | `GET /readings` — paginated, filterable by area/item/month | 🔲 | Needed by supervisor dashboard |

---

## Sync engine (`mobile/`)

These are blocked on backend being live.

| # | Item | Status | Notes |
|---|------|--------|-------|
| S-1 | Network connectivity detection | 🔜 | Blocked on B-1 |
| S-2 | Background push of dirty readings when online | 🔜 | POST to `/readings/sync`, set `syncedAt` on success |
| S-3 | Offline status banner in app UI | 🔜 | |

---

## Out of scope (v1)

- Supervisor dashboard (separate interface, not this app)
- Multi-device conflict resolution (single operator, last-write-wins is sufficient)
- Automated alerts for high readings (operator flags informally to supervisor)
- Operating-hours tracking per hidrômetro (meters don't support it yet — `horasOperacao` field reserved)
- Audit trail for reading corrections (no history needed in v1)

---

## Immediate next step

**M-18** — implement form customization per monitoring type (spec approved, ready to plan). After M-18, the mobile app is feature-complete for the demo and B-1 (FastAPI scaffold) becomes the next milestone.
