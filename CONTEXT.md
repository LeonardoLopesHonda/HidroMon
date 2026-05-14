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
| `Reading` | `isDirty` | `boolean` | True until synced to backend |
| `Reading` | `syncedAt` | `string \| null` | ISO timestamp set by server on successful push; null if unsynced |

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

### MonitoredItem (Item Monitorado)
A physical measurement point within an Área. Each item belongs to one Área and has one MonitoringType. Only hidrômetros carry a meaningful `limiteOutorgado`; pluviômetros and córregos have no permit-based consumption cap.

### MonitoringType
The category of a MonitoredItem. Three types exist with distinct purposes:

| Type | Measures | Purpose | Has outorga limit? |
|---|---|---|---|
| **Hidrômetro** | Cumulative volume (m³) | Outorga compliance — consumption must stay within permitted cap | Yes |
| **Pluviômetro** | Precipitation (mm) | Observational — recorded for reports; correlates with stream and consumption data | No |
| **Córrego** | Water level (cm) + flow rate (m³/s) | Environmental audit evidence — decommissioned site; data proves impact or absence of impact if audited | No |

Córrego monitoring is located in the decommissioned former work site. It is not operationally linked to active water use on the main Área.

### Reading Corrections

The operator can fully edit a past reading after saving it (same form, pre-populated). Mistakes happen and must be correctable in the field without waiting for the supervisor. No audit trail is required in v1. `updateReading` is needed alongside `addReading`. The sync strategy must handle updates (not just creates).

**Hidrômetro odometer integrity on edit:** When correcting a hidrômetro reading, the new value must be ≥ the reading immediately before it in chronological order (not the overall last reading, which is the one being edited). This preserves the odometer invariant — readings must be non-decreasing — without blocking legitimate corrections.

### Stats Display (per MonitoringType)

The item detail screen shows stats to help the operator be proactively aware — they have no formal authority to act, but will flag recurring high readings informally to the supervisor. Stats must be type-aware:

| Stat | Hidrômetro | Pluviômetro | Córrego |
|---|---|---|---|
| Monthly consumption | `lastReading − firstReading` of month (not sum) | Sum of precipitation values | Not meaningful |
| vs cap | Show consumption vs monthly cap (`limiteOutorgado × horasOperacao × daysInMonth`) | — | — |
| Média | Not meaningful (cumulative values) | Average daily precipitation | Average level / flow |
| Máximo / Mínimo | Not meaningful | Max/min precipitation day | Max/min level / flow |
| Dias sem leitura | Working days in month (excl. Sundays) minus days with readings | Same | Not applicable (weekly cadence) |

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
A measurement captured on a specific date for a MonitoredItem. A Reading records the measured values and an optional observation note.

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
