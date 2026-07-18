# Design Tokens — Supervisor Web Dashboard

Distilled from the Claude Design project "Painel de Conformidade Hídrica"
(`https://claude.ai/design/p/e1b5bda1-0727-496a-ae87-319a2315308b`, files
`Painel Hidrico.dc.html` + `HidroMonitor Prototipo.dc.html`). That project uses
a design-canvas templating DSL (`sc-if`/`sc-for`/`{{ }}` bindings, a `DCLogic`
class) that isn't portable code — this doc is the reusable residue: palette,
type, copy, and chart conventions to implement directly in React/CSS.
Read this instead of re-fetching the design project in future sessions.

## Brand

- Product name: **HidroMon** (white-label — this is the product, not the client's name)
- Provider byline: **"Fornecido por Telos Systems"** — small, faint, shown in the app header (next to the user menu) and under the login form, always paired with "· autenticação Supabase" on the login screen
- Logo mark: single letter "H" in a rounded-square tile, accent-green background, white text, `IBM Plex Mono` 700 weight

## Typography

- **IBM Plex Sans** (400/500/600/700) — all UI text, labels, buttons
- **IBM Plex Mono** (400/500/600) — all numeric/data values (readings, stats, dates, table cells) for a technical, tabular feel. Never use Plex Mono for prose.
- Google Fonts import already wired in `web/index.html`

## Color Palette

Implemented as CSS custom properties in `web/src/index.css` — read that file for the canonical source, this table is a reference:

| Token | Hex | Use |
|---|---|---|
| `--color-bg` | `#f6f7f5` | page background |
| `--color-surface` | `#ffffff` | cards, header, modals |
| `--color-surface-muted` | `#fafbfa` | table header row, subtle panels |
| `--color-border` | `#e2e7e3` | card/header borders |
| `--color-border-light` | `#eef1ee` | row dividers, subtle rules |
| `--color-border-input` | `#d7ded9` | input/button borders |
| `--color-text` | `#1c2822` | primary text |
| `--color-text-muted` | `#5c6b63` | secondary text, labels |
| `--color-text-faint` | `#8a978f` | metadata, uppercase eyebrow labels |
| `--color-text-faintest` | `#c3cbc5` | disabled/placeholder text |
| `--color-accent` | `#177863` | primary actions, links, brand mark (petrol green) |
| `--color-accent-hover` | `#0e5a4a` | accent hover state |
| `--color-accent-bg` | `#e6efe9` | avatar circles, subtle accent fills |
| `--color-ok-bg` / `--color-ok-text` | `#e9f4ee` / `#1e7d4f` | "dentro do limite" compliance state |
| `--color-warn-bg` / `--color-warn-text` | `#fbf3e2` / `#9a6200` | "projeção excedendo" state |
| `--color-warn-accent` | `#d98e0b` | warn chart lines/thresholds |
| `--color-danger-bg` / `--color-danger-text` | `#fbecea` / `#b3362b` | "outorga excedida" state, destructive actions |
| `--color-info-bg` / `--color-info-text` | `#eaf1f5` / `#2f6b8f` | pluviômetro/córrego badges, rain overlay |
| `--color-disabled-bg` / `--color-disabled-text` | `#eef1ee` / `#8a978f` | "Desativado" badge, disabled item cards |

## Layout Conventions

- Header bar: 62px tall, white surface, bottom border, logo+brand left, month selector center (on dashboard pages), user menu + provider byline right
- Cards: 10px border radius, 1px solid `--color-border`, white surface
- Compliance card border tints with state: ok → default border, warn → `#ecd9ac`, danger → `#eec3bd`
- Disabled item cards: dashed `--color-border-input` border, muted surface (`#fafbfa`), reduced-opacity content
- Badges: pill (`border-radius: 999px`), `padding: 3px 10px`, `font: 500 11px`
- Avatar: 30–34px circle, `--color-accent-bg` background, `--color-accent` text, initials

## Chart Conventions (for #6/#7 — not yet implemented)

- **Taxa diária (bar chart)**: bars ~22–26px wide, color per-bar: `--color-accent` (within daily cap) vs `--color-danger-text` (over); dashed amber (`--color-warn-accent`) horizontal threshold line for the daily cap; optional dotted blue (`--color-info-text`) rain overlay polyline on a secondary axis, small dots at rain data points
- **Vazão média (line chart)**: solid green 2px line (vazão média); dashed amber 1.5px line (`stroke-dasharray: 6 4`) for `limiteOutorgado`; dashed blue 1.5px line (`stroke-dasharray: 5 4`) with sparse larger dots for vazão efetiva (horímetro-derived, sparse data)
- **Consumo acumulado (cumulative chart)**: solid green 2.5px accumulated curve; dashed gray 1.5px (`--color-text-faint`, `stroke-dasharray: 5 4`) straight "ritmo da outorga" pace line from origin to the monthly cap; label the final point with the current total
- All charts: day labels along the x-axis in `IBM Plex Mono` 10px `--color-text-faint`; gaps in sparse data (Sundays, missing horímetro) are normal — don't render as zero or connect across them misleadingly
- Reading history table: sticky header (`--color-surface-muted` bg) and sticky footer (save button), row hover/edit state, pending/empty horímetro cells visually highlighted (light warn tint), inline validation error text in `--color-danger-text` below the input

## Already Implemented

- `web/src/index.css` — all CSS custom properties above
- `web/src/components/ui/Badge.tsx` — pill badge component (`neutral`/`info`/`disabled` variants)
- `web/src/components/AppHeader.tsx`, `web/src/pages/LoginPage.tsx` — header and login screen using these tokens
