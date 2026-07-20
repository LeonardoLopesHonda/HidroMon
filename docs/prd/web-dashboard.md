# PRD — Supervisor Web Dashboard

**Date:** 2026-07-17
**Status:** Approved for design
**Related:** CONTEXT.md (glossary: Formulário de Monitoramento, Dashboard Metrics), ADR 0009

## Summary

A desktop web app (`web/` in the monorepo) for the supervisor/owner workflow the mobile app deliberately does not serve: compliance analytics over captured readings, horímetro backfill, and generation of the annual IMASUL Formulário de Monitoramento (Captação). Read-only except for exactly one write flow — backfilling horímetro hours onto existing readings.

## Users & Auth

Same three Supabase email+password accounts as mobile (shared crew, owner, supervisor). No roles — any authenticated account can view everything and backfill hours. Login via `@supabase/supabase-js`; all API calls carry the JWT to FastAPI.

## Stack & Architecture

- **Web:** Vite + React + TypeScript SPA, Recharts for charts. UI language: pt-BR.
- **Data:** reuses the existing FastAPI GET endpoints (areas, items, readings — full pull; data volume is tiny). All metric math is computed client-side in one dedicated TS module.
- **New backend surface:**
  - Migration + API exposure for `monitored_items.durh_number`, `outorga_number`, `barramento_durh` (nullable; meaningful for hidrômetros only).
  - `PUT /readings/{id}` gains the sticky-horímetro rule and neighbor-bounded monotonicity validation (ADR 0009).
  - `GET /reports/imasul?itemId&year&format=xlsx|pdf` — fills the official template via openpyxl (styling/logos/merged cells preserved; template formulas overwritten with computed values); PDF produced by converting the filled workbook with headless LibreOffice (`soffice --convert-to pdf`). Generation-time inputs (técnico, CREA, data, observações, barramento) passed in the request.

## Metric Definitions

All hidrômetro consumption is a delta of cumulative odometer values — never a sum. Canonical names in CONTEXT.md → Dashboard Metrics:

| Metric | Formula | Applies to |
|---|---|---|
| Taxa diária | `(reading − previous) ÷ days elapsed` (normalizes over Sundays/gaps) | all hidrômetros |
| Vazão média (outorga) | `daily consumption ÷ horasOperacao` — compare to `limiteOutorgado` | all hidrômetros |
| Vazão efetiva (horímetro) | `Δm³ ÷ Δhorímetro hours` between hours-bearing readings | horímetro-equipped only |
| Monthly consumption | `last reading of month − last reading of previous month` (fallback: first of month) | all hidrômetros |
| Monthly cap | `limiteOutorgado × horasOperacao × 30` (fixed 30 days per outorga) | all hidrômetros |

**Exceedance checks (all four):** month-to-date vs cap; month-end projection at current pace vs cap; taxa diária vs daily cap (`limite × horasOperacao`); measured hours/day (Δhorímetro ÷ days) vs `horasOperacao`. No push/email alerts — visual states only.

## Pages

### 1. Overview

- One compliance card per hidrômetro: month-to-date consumption vs cap (progress bar + %), month-end projection ("projeção: 108% da outorga"), flags for any exceedance check firing. Disabled items excluded from cards (history remains on detail pages).
- Compact cards for pluviômetros (month total mm) and córrego points (latest nível/vazão).
- Month selector (defaults to current month). Grouped by Área.

### 2. Item Detail

Per-type content:

- **Hidrômetro:** taxa diária bar chart (days over daily cap visually flagged); vazão média (outorga) line with `limiteOutorgado` reference line; vazão efetiva (horímetro) line where hours exist; cumulative consumption vs cap pace; optional rain overlay from the Área's pluviômetro. Reading history table.
- **Horímetro backfill (the one write flow):** on horímetro-equipped items, the reading history table has an editable horímetro column — blanks highlighted, "somente sem horas" filter, batch save (individual PUTs). Inline neighbor-bounded validation errors; server 422 is the backstop.
- **Pluviômetro:** daily precipitation bars, monthly total, monthly comparison.
- **Córrego:** nível and vazão line charts (weekly cadence), régua/tambor method shown; raw tambor times visible in history.

### 3. IMASUL Report Generation

- Offered only on hidrômetro items with `durhNumber`/`outorgaNumber` set.
- Dialog: year picker + filing fields (Técnico Responsável and CREA prefilled from last use; Data defaults to today; observações and barramento optional). Download as .xlsx or .pdf.
- One file = one item (outorga) × one year: 12 monthly rows of Vazão (m³/h) = `monthly consumption ÷ (Período × Tempo)`, Tempo = `horasOperacao`, Período = actual calendar days (not the fixed 30). Months without data are zero-filled (0,00), matching the official example. Item name appears as the form subtitle (e.g., "Captação Serraria").

## Non-Goals (v1)

- No editing/deleting readings from the web (mobile remains the correction surface); the only write is horímetro backfill.
- No reports for pluviômetro/córrego (no IMASUL cell for them; future templates can reuse the generator pattern).
- No automated alerts, no roles/permissions, no offline support (the web app assumes connectivity).
- No phone-width (~375–430px) layout — deferred to a follow-up milestone. Tablet-width (768–1024px) is supported (issue #19) via a shared `useBreakpoint` hook and `PageShell` component, except the horímetro backfill grid, which stays desktop-only.

## Open Items

- [x] Drop the official template into `docs/templates/formulario-monitoramento-captacao.xlsx` (ideally with one filled example year to verify cell coordinates).
- [ ] Fill `durhNumber`/`outorgaNumber` for existing hidrômetros once the migration lands.
