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
| M-9 | Mock data aligned with domain (real asset counts — see below) | ✅ | 5 hidrômetros + 1 pluviômetro on Monjolinho; 3 pluviômetros + 3 córregos on Laís; real asset names |
| M-10 | AsyncStorage migration for pre-fix stored data (backward compat) | ✅ |
| M-11 | `MonitoredItem.corregoMethod: 'regua' \| 'tambor'` | ✅ | Set per asset; drives form and stats logic |

### Business logic

| # | Item | Status | Notes |
|---|------|--------|-------|
| M-12 | `getStats` rewrite: hidrômetro uses `last − first`, pluviômetro sums, córrego skips total | ✅ | |
| M-13 | `diasSemLeitura` excludes Sundays; returns `null` for weekly-cadence areas | ✅ | |
| M-14 | `updateReading` operation in AppContext (full edit, marks `isDirty: true`) | ✅ | |
| M-15 | `getPrimaryKey(item)` replaces static `PRIMARY_VALUE_KEY` — córrego régua uses `nivel`, tambor uses derived avg | ✅ | Implemented in AppContext; drives stats correctly per item type |
| M-16 | Monthly cap display: `limiteOutorgado × horasOperacao × daysInMonth` | 🔲 | StatsCard currently shows raw `limiteOutorgado`; needs derived cap |
| M-17 | Discriminated union for `MonitoredItem` by type | 🔲 | `limiteOutorgado` is vacuous on pluviômetro/córrego — structural smell in CONTEXT.md |

### UI / screens

| # | Item | Status | Notes |
|---|------|--------|-------|
| M-18 | Form customization per monitoring type (spec: `docs/superpowers/specs/2026-05-13-form-customization-design.md`) | ✅ | Hidrômetro validation + last-reading hint; régua + tambor forms; live flow previews (display-only) |
| M-19 | Reading list item shows sync status badge (dirty vs synced) | 🔲 | `isDirty` flag exists; no UI indicator yet |
| M-20 | Edit reading flow: form pre-populated from existing reading, calls `updateReading` | 🔲 | Form is add-only today; tap on a reading in list → open form in edit mode |
| M-21 | Delete reading | 🔲 | Not defined yet — decide if needed before backend |
| M-22 | Safe area insets on all `headerShown: false` screens | ✅ | `auth.tsx` was using hardcoded `paddingTop: 80`; replaced with `useSafeAreaInsets()` — required by `edgeToEdgeEnabled: true` on Android |
| M-23 | Top border separator on authenticated Stack screens | ✅ | `headerShadowVisible: false` left no visual boundary between nav header and content; added `borderTopWidth: 1 / gray100` to `contentStyle` in app layout — applies to all screens from area detail through form |

### Branding / Assets

| # | Item | Status | Notes |
|---|------|--------|-------|
| M-24 | Telos logo with transparent background | ✅ | Original PNG had white background; `tintColor="white"` on the splash rendered a solid white square — white pixels converted to alpha 0 via Node.js PNG processor |
| M-25 | App icon replacement across all targets | ✅ | Default Expo icon replaced with Telos orca logo: `icon.png` (white bg, 72% logo), Android adaptive foreground (transparent, 63% for safe zone), monochrome variant, favicon; `backgroundImage` template removed from `app.json` |

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

UI polish is complete (M-22 – M-25). Remaining mobile items before backend work:

1. **M-16** — Monthly cap display in StatsCard (`limiteOutorgado × horasOperacao × daysInMonth`)
2. **M-20** — Edit reading flow (tap reading in list → open form pre-populated, calls `updateReading`)
3. **M-19** — Sync status badge on ReadingListItem (`isDirty` flag exists, no UI yet)

After these, **B-1** (FastAPI scaffold) becomes the next milestone.
