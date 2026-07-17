# Design Prompt — Supervisor Web Dashboard

Paste-ready prompt for generating the visual design. Source of truth for behavior: `web-dashboard.md`.

---

Design a desktop-first web dashboard in Brazilian Portuguese for environmental water-monitoring compliance at licensed rural properties (fazendas) in Mato Grosso do Sul, Brazil. Users are a supervisor and a property owner reviewing field data collected daily by operators. The tone is a calm, trustworthy operational tool — regulatory compliance, not marketing. Clean, data-dense but breathable; think internal ops console with strong typography and restrained color. Light theme.

**Domain in one paragraph:** Water meters (hidrômetros) at capture points have permits (outorgas) limiting flow to X m³/h over Y hours/day. Meters are cumulative odometers read daily (never Sundays). Some meters also have an hour-counter (horímetro) whose values arrive late and sparsely from a third party. Rain gauges (pluviômetros, mm/day) and a stream point (córrego: water level cm + flow m³/s, weekly) are also monitored. The dashboard's job: show whether each meter is within its permit, project month-end, and generate an official annual report (Formulário IMASUL).

**Screen 1 — Visão Geral (Overview):** Header with app name, month selector (default current month), user menu. Content grouped by Área (property). For each hidrômetro, a compliance card: item name, month-to-date consumption vs monthly cap as a progress bar with percentage (e.g., "1.240 / 2.880 m³ — 43%"), a projection line ("Projeção fim do mês: 108% da outorga") and small warning badges when limits are exceeded (dias acima do limite diário, horas acima do autorizado). Cards have three visual states: within limit (neutral/green accent), projection exceeding (amber), already exceeded (red). Smaller cards for pluviômetros (total de chuva no mês, mm) and córrego (último nível cm / vazão m³/s). Some items carry a "Desativado" badge.

**Screen 2 — Detalhe do Item (hidrômetro):** Breadcrumb (Área / item). Top stat row: consumo do mês, % da outorga, projeção, vazão média (m³/h), horas operadas. Charts stacked: (1) bar chart "Taxa diária (m³/dia)" with days above the daily cap highlighted and an optional rain overlay line (mm) on a secondary axis; (2) line chart "Vazão média (outorga)" with a horizontal reference line for the permitted limit, plus a second sparser line "Vazão efetiva (horímetro)"; (3) cumulative consumption curve vs a straight cap-pace line for the month. Below, a reading history table: data, leitura (m³), horímetro (h), observações. The horímetro column is inline-editable: empty cells visually highlighted as pending, a filter toggle "somente sem horas", inline validation error state ("valor fora do intervalo dos vizinhos"), and a sticky "Salvar N horas" batch-save button.

**Screen 3 — Gerar Relatório IMASUL (modal dialog):** Triggered from a hidrômetro detail. Fields: Ano (year picker), Técnico Responsável and CREA (text, prefilled), Data (date, default today), Nº DURH do Barramento (optional), Observações relevantes (textarea). Read-only summary of the 12 monthly vazões about to be filled. Two download buttons: "Baixar .xlsx" and "Baixar .pdf".

Also show pluviômetro detail (daily rain bars + monthly totals) and córrego detail (nível and vazão line charts, weekly points) as simpler variants of Screen 2, and a minimal login screen (email + senha, Supabase).

Numbers use Brazilian formatting (1.234,56). Charts must remain legible with sparse/missing data — gaps are normal, not errors.
