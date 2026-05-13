# Form Customization per Monitoring Type

**Date:** 2026-05-13
**Status:** Approved

---

## Problem

The current form (`form.tsx`) uses a static `FIELD_CONFIGS` keyed on `MonitoringType`. This cannot accommodate:
- Hidrômetro validation (new reading must be ≥ last reading)
- The two distinct córrego measurement methods (régua vs tambor), which differ in fields, storage format, and derived display

## Scope

- Update domain types (`MonitoredItem`, `PRIMARY_VALUE_KEY`)
- Rewrite form field logic to be item-aware
- Add hidrômetro validation and live córrego previews
- Correct mock data to match real asset inventory

---

## Asset inventory (corrected)

| Área | Frequency | Hidrômetros | Pluviômetros | Córregos |
|------|-----------|-------------|--------------|---------|
| Monjolinho | daily (Mon–Sat) | 5 | 1 | 0 |
| Laís | weekly | 0 | 3 | 3 (2 régua + 1 tambor) |

---

## Data model changes

### `MonitoredItem` — new field

```typescript
corregoMethod?: 'regua' | 'tambor'
// Only set on items where type === 'corrego'.
// Undefined on all other types.
```

### Reading values stored per type

| Type | `values` shape | Notes |
|------|----------------|-------|
| Hidrômetro | `{ leitura: number }` | Cumulative odometer (m³) |
| Pluviômetro | `{ precipitacao: number }` | Daily precipitation (mm) |
| Córrego Régua | `{ nivel: number }` | Water level (m). Flow derived on backend. |
| Córrego Tambor | `{ t1: number, t2: number, t3: number }` | Fill times in seconds. Average and flow derived on backend. |

### `PRIMARY_VALUE_KEY` — becomes item-aware

The current constant `Record<MonitoringType, string>` cannot handle the two córrego methods. Replace with a helper function:

```typescript
function getPrimaryKey(item: MonitoredItem): string {
  if (item.type === 'corrego') {
    return item.corregoMethod === 'tambor' ? 't1' : 'nivel';
  }
  return { hidrometro: 'leitura', pluviometro: 'precipitacao' }[item.type];
}
```

For tambor stats (`getStats`), the primary value per reading is the computed average `(t1+t2+t3)/3`, not `t1` directly. `getStats` must handle this case explicitly when `corregoMethod === 'tambor'`.

---

## Form behaviour

### Field config — item-aware

Replace static `FIELD_CONFIGS: Record<MonitoringType, FieldConfig[]>` with a function:

```typescript
function getFieldConfigs(item: MonitoredItem): FieldConfig[]
```

Returns:
- **Hidrômetro** → `[{ key: 'leitura', label: 'Leitura (m³)', keyboardType: 'numeric' }]`
- **Pluviômetro** → `[{ key: 'precipitacao', label: 'Precipitação (mm)', keyboardType: 'numeric' }]`
- **Córrego Régua** → `[{ key: 'nivel', label: "Nível d'água (m)", keyboardType: 'numeric' }]`
- **Córrego Tambor** → `[{ key: 't1', label: '1ª medição (s)' }, { key: 't2', label: '2ª medição (s)' }, { key: 't3', label: '3ª medição (s)' }]`

### Hidrômetro validation

- On save: if `leitura < lastReading.leitura` → block save with inline error (do not show Alert, show inline)
- While typing: show hint below field — "Última leitura: X m³"
- If no previous reading exists: no validation, any positive value accepted

### Live preview (display only — never stored or sent to backend)

**Córrego Régua** — shown as a green info box below the nivel field:
```
Vazão estimada: Q m³/s · Q×1000 L/s
Q = 1.8 × 0.6 × nivel^1.5
```
Only shown when `nivel > 0`. Shows "Sem leitura" label when nivel is 0.

**Córrego Tambor** — shown as a green info box below the three time fields:
```
Média: avg s · Vazão: (200/avg) L/s · (200/avg/1000) m³/s
```
Only shown when all three times are filled and > 0.

---

## What is not changing

- Form screen routing and URL params — unchanged
- `addReading` / `updateReading` signatures — unchanged (`values` is `Record<string, number>`)
- `getStats` for hidrômetro and pluviômetro — unchanged
- AsyncStorage persistence layer — unchanged
- Offline-first behaviour — unchanged

---

## Mock data corrections

Update `MOCK_ITEMS` in `mobile/data/mockData.ts`:

```
Monjolinho: mon-h1…mon-h5 (5 hidrômetros), mon-p1 (1 pluviômetro)
Laís:       lais-p1…lais-p3 (3 pluviômetros),
            lais-c1, lais-c2 (2 córregos, corregoMethod: 'regua'),
            lais-c3 (1 córrego, corregoMethod: 'tambor')
```

Mock reading generator must produce values consistent with each item's type and `corregoMethod`.

---

## Out of scope (this iteration)

- Supervisor dashboard display of derived flow values
- Backend formula application (Q = 1.8 × 0.6 × h^1.5 applied server-side)
- Audit trail for reading corrections
- Delete reading
