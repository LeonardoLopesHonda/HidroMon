# Domain Context — Telos Environmental Monitoring

## Known Issues

These are confirmed bugs and missing model fields discovered during domain analysis. All must be fixed before FastAPI scaffolding so the local data model drives the API schema correctly.

### Bugs

| # | Location | Issue | Fix |
|---|---|---|---|
| 1 | `context/AppContext.tsx` `getStats` | Sums cumulative hidrômetro readings — wrong. Monthly consumption = `lastReading − firstReading`, not `Σ readings` | Rewrite `getStats` per MonitoringType |
| 2 | `context/AppContext.tsx` `getStats` | `diasSemLeitura = daysInMonth − daysWithReading` ignores Sundays and doesn't handle weekly-frequency Áreas | Exclude Sundays; skip metric for weekly Áreas |
| 3 | `context/AppContext.tsx` `addReading` | `id: Date.now().toString()` will collide if device clock resets or is reused | Replace with UUID (`crypto.randomUUID()` or `uuid` package) |

### Missing Model Fields

| Entity | Field | Type | Notes |
|---|---|---|---|
| `Area` | `frequency` | `'daily' \| 'weekly'` | Determines expected reading cadence and `diasSemLeitura` calculation |
| `MonitoredItem` | `horasOperacao` | `number` | Authorized operating hours/day. Default 24. Will vary (20h for artesian wells) when tracked |
| `Reading` | `recordedAt` | `string` | ISO timestamp set by mobile at first save, frozen on edit. See ADR 0005. |
| `Reading` | `createdAt` | `string` | ISO timestamp set by server on insert. Returned in API responses. |
| `Reading` | `updatedAt` | `string` | ISO timestamp set by server on insert and on edit. Drives `?since=` sync. |
| `Reading` | `createdBy` | `string` (UUID) | `auth.users.id` of the JWT subject. Server-set on insert. |
| `Reading` (mobile only) | `isDirty` | `boolean` | True until synced to backend. **Not** persisted in Postgres. |
| `Reading` (mobile only) | `syncedAt` | `string \| null` | Mobile copies the server's `updatedAt` here after a successful sync. **Not** persisted in Postgres. |

### Missing Operations

| Operation | Notes |
|---|---|
| `updateReading` | Full edit of a saved reading. Operator can correct mistakes. Must set `isDirty: true`. |

### Structural Smells

- `limiteOutorgado` and `unit` are defined on all `MonitoredItem`s but only meaningful for hidrômetros. Pluviômetro and córrego items carry these fields vacuously. Document clearly in code; refactor to discriminated union in a future pass.
- Mock credentials (`telos/telos2024`) are hardcoded in `AppContext`. Must be replaced with real auth before backend integration.

---

## Glossary

### Área
A licensed property (fazenda, mine site, or industrial area) that holds one or more water-use permits (outorgas) and contains the physical monitoring assets within its perimeter. An Área is the top-level organizational unit in the app. One Área can have 1–n monitored assets across multiple water bodies.

Reading frequency is defined at the Área level — all items within an Área share the same reading cadence (`frequency: 'daily' | 'weekly'`). The operator visits all instruments in an Área on the same day.

### Outorga
A Brazilian water-use permit issued by the competent authority (e.g., IGAM, ANA) that authorizes the use of a specific water body up to a defined flow rate and daily operating window. Each hidrômetro carries the limit granted by its outorga.

Key fields per outorga:
- **`limiteOutorgado`** — maximum flow rate in m³/h
- **`horasOperacao`** — authorized operating hours per day (currently 20h for artesian wells / poços tubulares, 24h for surface captures / captações superficiais)

Derived monthly cap = `limiteOutorgado × horasOperacao × 30`

The outorga document explicitly fixes the month at **30 days** ("30 dias/mês"), regardless of actual calendar days. The app always uses 30 — not `daysInMonth` — so the cap matches the permit exactly.

> **Design note:** `horasOperacao` is not yet tracked in the app. It defaults to 24h for all items. This must be added to `MonitoredItem` when meters capable of tracking operating hours are deployed. The data model should accommodate this without a breaking change.

### Horímetro
An hour-meter: a cumulative counter on a hidrômetro's pump/motor that records the total number of hours it has operated. Read off the physical device exactly like the m³ odometer — a monotonically non-decreasing sequence of numbers. Only some hidrômetros carry one (a horímetro-equipped meter was installed in place of an older meter that had none).

The horímetro is an **optional value on a Reading**, distinct from **`horasOperacao`** (the outorga's *authorized* operating hours/day, a fixed assumption used in the monthly cap). One is measured, the other is permitted.

**The hours are not read on-site.** The field operator has no gauge to read the horímetro from — the hours data lives in a separate third-party app the operator cannot access. So a monitoring Reading is saved with the m³ value and the horímetro left **blank**, and the hours are **backfilled later** (via the normal edit flow) by whoever has the third-party data. Horímetro values are therefore *sparse* — present on some readings, absent on others — and entered *out of chronological order*.

### MonitoredItem (Item Monitorado)
A physical measurement point within an Área. Each item belongs to one Área and has one MonitoringType. Only hidrômetros carry a meaningful `limiteOutorgado`; pluviômetros and córregos have no permit-based consumption cap. A hidrômetro may additionally be **horímetro-equipped** — see [Horímetro](#horímetro) — in which case each reading also captures the hour counter.

### Disabled Item
A MonitoredItem can be **disabled** (retired) when the physical device is decommissioned — typically when a meter is replaced by a newer one. A disabled item **no longer accepts new readings**, but its history is preserved and remains fully visible; past readings can still be corrected. Disabling is about stopping new activity, not freezing the record. The replacement is modelled as a *separate* MonitoredItem, so each physical device keeps its own uninterrupted reading history.

### MonitoringType
The category of a MonitoredItem. Three types exist with distinct purposes:

| Type | Measures | Purpose | Has outorga limit? |
|---|---|---|---|
| **Hidrômetro** | Cumulative volume (m³) | Outorga compliance — consumption must stay within permitted cap | Yes |
| **Pluviômetro** | Precipitation (mm) | Observational — recorded for reports; correlates with stream and consumption data | No |
| **Córrego** | Water level (cm) + flow rate (m³/s) | Environmental audit evidence — decommissioned site; data proves impact or absence of impact if audited | No |

Córrego monitoring is located in the decommissioned former work site. It is not operationally linked to active water use on the main Área.

### Reading Derivations (Córrego)

`vazao` (m³/s) is **never recorded by the operator** — the server computes it from the raw inputs the operator captures, and stores both raw + derived. Constants are hardcoded in the backend service layer (single weir, single bucket; revisit if either varies).

| Method | Operator captures | Server computes |
|---|---|---|
| **Régua** | `nivel` (water height, meters) | `vazao = 1.8 × 0.6 × nivel^1.5` (sharp-crested rectangular weir, C=1.8, crest L=0.6 m) |
| **Tambor** | `t1, t2, t3` (3 fill-time samples, seconds, same 200 L bucket) | `vazao = 0.2 / avg(t1, t2, t3)` |

**Tambor sampling rule:** all three fill times must be > 0. Partial measurements (only one or two times captured) are rejected — both mobile and server. The same bucket is timed three times by process; missing samples mean the observation is incomplete, not tolerable.

### Reading Corrections

The operator can fully edit a past reading after saving it (same form, pre-populated). Mistakes happen and must be correctable in the field without waiting for the supervisor. No audit trail is required in v1. `updateReading` is needed alongside `addReading`. The sync strategy must handle updates (not just creates).

**Hidrômetro odometer integrity:** Hidrômetro readings must be non-decreasing in chronological order. Enforced on both create and edit, mobile and server:

- **Create (POST):** new `valor` must be ≥ the chronologically last reading on the same item.
- **Edit (PUT):** new `valor` must be ≥ the reading immediately *before* this one in chronological order (not the overall last reading, which is the one being edited).

Mobile blocks save inline with the error "Valor menor que leitura anterior: X m³". Server returns 422 as authoritative backstop. Applies only to `type='hidrometro'` items.

### Stats Display (per MonitoringType)

The item detail screen shows stats to help the operator be proactively aware — they have no formal authority to act, but will flag recurring high readings informally to the supervisor. Stats must be type-aware:

| Stat | Hidrômetro | Pluviômetro | Córrego |
|---|---|---|---|
| Monthly consumption | `lastReading − firstReading` of month (not sum) | Sum of precipitation values | Not meaningful |
| vs cap | Show consumption vs monthly cap (`limiteOutorgado × horasOperacao × daysInMonth`) | — | — |
| Média | Not meaningful (cumulative values) | Average daily precipitation | Average level / flow |
| Máximo / Mínimo | Not meaningful | Max/min precipitation day | Max/min level / flow |
| Dias sem leitura | Working days in month (excl. Sundays) minus days with readings | Same | Not applicable (weekly cadence) |
| Horas operadas | `lastHorímetro − firstHorímetro` of month — only for horímetro-equipped hidrômetros; does **not** feed the cap | — | — |

No automated alerts are required in v1. High consumption awareness is informal.

### System Boundaries

This mobile app serves three purposes:
1. **Field data capture** — the operator records readings on-site
2. **Offline operation** — the app must work with no internet signal (field sites may have no connectivity)
3. **Backend sync** — once internet is available, all locally captured readings are pushed to the backend

The supervisor's review, compliance analysis, and reporting happen in a separate interface (not yet built). The app does not serve the supervisor's analytical workflow directly.

**Implication:** The app is an offline-first sync client. Data lives in AsyncStorage until synced. The FastAPI backend does not exist yet — the app's data model will drive the API schema. This requires:
- Stable IDs that don't collide across devices (current `Date.now()` IDs are not safe — UUIDs needed)
- A `syncedAt` timestamp and `isDirty` flag on readings to track unsynced state
- Conflict resolution strategy: always one operator per Área (lean crew), so last-write-wins on sync is sufficient — no multi-device concurrency

### Reading (Leitura)
A measurement captured on a specific date for a MonitoredItem. A Reading records the measured values and an optional observation note. Readings are **edit-only** — they can be corrected (PUT) but never deleted. The single-writer invariant (one device per Área registers readings) means soft-delete tombstones are unnecessary; see ADR 0006.

**Hidrômetro readings are cumulative** — the value recorded is the odometer counter on the physical meter (e.g., 1042 m³), not the consumption since the last visit. Monthly consumption must therefore be derived as `lastReading − firstReading` (or last reading of month − last reading of previous month), not as a sum of readings. The current `getStats` code incorrectly sums readings — this is a known bug.

### Reading Frequency

Reading frequency is set at the **Área level**, not per item:

| Área type | Frequency | Sunday readings? |
|---|---|---|
| Active site (main working area) | Daily | No — Sundays are never read |
| Decommissioned site (córrego monitoring) | Weekly | N/A |

**Implication for `diasSemLeitura`:** The current calculation (`daysInMonth − daysWithReading`) is wrong for both cases:
- Active site: Sundays must be excluded from expected reading days
- Decommissioned site: the expected count is weeks, not days — `diasSemLeitura` as a metric does not apply

**Design decision:** `diasSemLeitura` is driven by `Area.frequency`, not by `MonitoringType`. A `null` value (shown as `—`) means the área uses weekly cadence. This is intentional — if cadence ever changes, the stat follows automatically without touching the type layer.

### Sync & Identity

Decisions formalised in ADR 0006:

- **IDs** are **client-generated UUIDv4** for all sync-relevant entities (`areas`, `monitored_items`, `readings`). The device assigns the ID at the moment of creation — even offline — and the server accepts it as-is. Idempotent inserts (`ON CONFLICT DO NOTHING`) make retries safe.
- **Three operator/server clocks** on each `Reading` (see ADR 0005): `date` (calendar day measured), `recordedAt` (when the operator was at the meter — frozen at first save), `updatedAt` (server-side last-changed marker driving `?since=` sync).
- **`?since=` is the sync contract.** First install passes `since=1970-01-01` (or omits) for a full pull; subsequent pulls track `lastSyncedAt = max(updatedAt)` locally. No pagination.
- **`isDirty` and `syncedAt` are mobile-only.** They describe the AsyncStorage cache's relationship to the server, not properties of a reading. They never appear in Postgres or in API responses.
- **`createdBy`** on `Reading` carries the JWT subject (`auth.users.id`). Three accounts exist: shared crew account (used by both 3rd-party operators), project owner, supervisor. Most rows carry the crew UUID; rows created by owner/supervisor are distinguishable in queries.
- **No `profiles` table.** Operator identity is not modelled inside the app — `auth.users` alone is enough. Operator names go in `observacoes` when relevant.
- **Edit-only.** No DELETE endpoint, no `deleted_at` column. Mistakes are corrected by PUT.
- **Auth.** Supabase email + password, invite-only. FastAPI is a resource server that verifies JWTs (ES256 via JWKS); it never sees passwords. Mobile uses `@supabase/supabase-js` with the default AsyncStorage session adapter.

### Sync Triggers and Logout

Sync engine details are formalised in ADR 0007. The behaviours operators see:

- **Auto-sync** fires on (1) NetInfo connectivity restore and (2) app foreground re-entry. No periodic polling, no background fetch.
- **Manual sync button** lives on the Áreas screen header — a spinning icon while syncing, a dirty-count badge when > 0 readings await push, a "Última sync: X min atrás" subtitle.
- **Logout wipes everything**: AsyncStorage cache (`areas`, `items`, `readings`, cursor) + Supabase session. If dirty readings exist at logout, the app blocks with a confirmation: "X leituras não sincronizadas serão perdidas — sair mesmo assim?". Shared device handoff between the three accounts (crew / owner / supervisor) makes wipe the safe default.
- **First-run requires internet**: master data (`areas`, `items`) blocks the UI behind a "Sincronizando dados iniciais…" screen; reading history streams in the background. There is no mock seed fallback — `mockData.ts` was removed when the SQL seed migration landed.
