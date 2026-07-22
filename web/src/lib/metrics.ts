import type { MonitoredItem, Reading } from '@/types';

// Dates throughout this module are 'YYYY-MM-DD' strings, matching Reading.date.
// Day-diff math goes through Date.UTC so local-timezone offsets never shift a
// date by a day.

function toUTCDays(isoDate: string): number {
  const [y, m, d] = isoDate.split('-').map(Number);
  return Date.UTC(y, m - 1, d) / 86_400_000;
}

export function daysBetween(from: string, to: string): number {
  return toUTCDays(to) - toUTCDays(from);
}

export function monthStartISO(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}-01`;
}

export function nextMonthStartISO(year: number, month: number): string {
  return month === 12 ? monthStartISO(year + 1, 1) : monthStartISO(year, month + 1);
}

export function isInMonth(isoDate: string, year: number, month: number): boolean {
  const [y, m] = isoDate.split('-').map(Number);
  return y === year && m === month;
}

/**
 * Calendar days elapsed since the 1st of the month, inclusive, capped to the
 * outorga's fixed 30-day month convention (CONTEXT.md → Outorga). Always
 * between 1 and 30, so it's safe to use as a projection denominator.
 */
export function daysElapsedInMonth(year: number, month: number, referenceDate: string): number {
  const daysSinceStart = toUTCDays(referenceDate) - toUTCDays(monthStartISO(year, month)) + 1;
  return Math.min(Math.max(daysSinceStart, 1), 30);
}

function sortByDate(readings: Reading[]): Reading[] {
  return [...readings].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

export interface DailyRatePoint {
  date: string;
  rate: number; // m³/day, normalized over calendar days elapsed since the previous reading
}

/**
 * Taxa diária per reading (all but the first, which has no previous point to
 * diff against). Dividing by calendar days elapsed — not visit count — means
 * a gap (Sundays never read, a missed visit) spreads its delta evenly instead
 * of showing up as a spike on the first reading after the gap.
 */
export function dailyRate(readings: Reading[]): DailyRatePoint[] {
  const sorted = sortByDate(readings).filter((r) => r.values.valor != null);
  const points: DailyRatePoint[] = [];
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const curr = sorted[i];
    const days = daysBetween(prev.date, curr.date);
    if (days <= 0) continue;
    points.push({ date: curr.date, rate: (curr.values.valor! - prev.values.valor!) / days });
  }
  return points;
}

/**
 * Month-boundary convention (CONTEXT.md → Formulário de Monitoramento):
 * last reading of the month minus last reading before the month, falling
 * back to the month's own first reading when no earlier reading exists
 * (start of an item's history) — in which case consumption is 0 rather than
 * measured against a baseline that doesn't exist.
 */
export function monthlyConsumption(readings: Reading[], year: number, month: number): number {
  const sorted = sortByDate(readings).filter((r) => r.values.valor != null);
  const inMonth = sorted.filter((r) => isInMonth(r.date, year, month));
  if (inMonth.length === 0) return 0;

  const lastOfMonth = inMonth[inMonth.length - 1];
  const monthStart = monthStartISO(year, month);
  const before = sorted.filter((r) => r.date < monthStart);
  const baseline = before.length > 0 ? before[before.length - 1] : inMonth[0];

  return lastOfMonth.values.valor! - baseline.values.valor!;
}

/** Fixed 30-day month per the outorga — never `daysInMonth`. */
export function monthlyCap(item: Pick<MonitoredItem, 'limiteOutorgado' | 'horasOperacao'>): number {
  if (item.limiteOutorgado == null) return 0;
  return item.limiteOutorgado * item.horasOperacao * 30;
}

export interface CumulativeSeriesPoint {
  day: number; // 1..N, N = max(30, actual days in the calendar month)
  date: string;
  cumulative: number | null; // populated only on days with an actual reading
  pace: number; // straight cap-pace reference, populated every day
}

/**
 * One point per calendar day (not per reading), covering at least the fixed
 * 30-day outorga month so `pace` always reaches the nominal cap, but extended
 * to the real length of 31-day months so a reading on the 31st isn't dropped
 * (a real reading must never disappear just because the outorga's accounting
 * period is nominally 30 days). `pace` is populated every day so it renders
 * as a clean straight diagonal; `cumulative` uses the same baseline
 * convention as monthlyConsumption and is populated only on days with an
 * actual reading — gaps stay gaps instead of dropping to zero.
 */
export function cumulativeConsumptionSeries(
  readings: Reading[],
  year: number,
  month: number,
  cap: number
): CumulativeSeriesPoint[] {
  const sorted = sortByDate(readings).filter((r) => r.values.valor != null);
  const monthStart = monthStartISO(year, month);
  const inMonth = sorted.filter((r) => isInMonth(r.date, year, month));
  const before = sorted.filter((r) => r.date < monthStart);
  const baseline = before.length > 0 ? before[before.length - 1] : inMonth[0];

  const readingByDate = new Map<string, Reading>();
  for (const r of inMonth) readingByDate.set(r.date, r);

  const daysInCalendarMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const totalDays = Math.max(30, daysInCalendarMonth);
  const monthStartDays = toUTCDays(monthStart);
  const points: CumulativeSeriesPoint[] = [];
  for (let day = 1; day <= totalDays; day++) {
    const date = new Date((monthStartDays + day - 1) * 86_400_000).toISOString().slice(0, 10);
    const reading = readingByDate.get(date);
    const cumulative = reading && baseline ? reading.values.valor! - baseline.values.valor! : null;
    points.push({ day, date, cumulative, pace: (cap / 30) * day });
  }
  return points;
}

/** Permitted-basis hourly rate, directly comparable to `limiteOutorgado`. */
export function vazaoMediaOutorga(dailyRateValue: number, horasOperacao: number): number {
  return dailyRateValue / horasOperacao;
}

/** Per-reading vazão média (outorga) series — same {date, vazao} shape as vazaoEfetivaHorimetro, so the two can share one chart. */
export function vazaoMediaOutorgaSeries(readings: Reading[], horasOperacao: number): VazaoEfetivaPoint[] {
  return dailyRate(readings).map((p) => ({ date: p.date, vazao: vazaoMediaOutorga(p.rate, horasOperacao) }));
}

export interface VazaoEfetivaPoint {
  date: string;
  vazao: number; // m³/h, measured
}

/** Δm³ ÷ Δhorímetro between consecutive hours-bearing readings. Sparse by nature. */
export function vazaoEfetivaHorimetro(readings: Reading[]): VazaoEfetivaPoint[] {
  const sorted = sortByDate(readings).filter((r) => r.values.valor != null && r.values.horimetro != null);
  const points: VazaoEfetivaPoint[] = [];
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const curr = sorted[i];
    const deltaHoras = curr.values.horimetro! - prev.values.horimetro!;
    if (deltaHoras <= 0) continue;
    points.push({ date: curr.date, vazao: (curr.values.valor! - prev.values.valor!) / deltaHoras });
  }
  return points;
}

export interface HoursPerDayPoint {
  date: string;
  hoursPerDay: number;
}

/** Measured operating hours/day: Δhorímetro ÷ calendar days elapsed. */
export function measuredHoursPerDay(readings: Reading[]): HoursPerDayPoint[] {
  const sorted = sortByDate(readings).filter((r) => r.values.horimetro != null);
  const points: HoursPerDayPoint[] = [];
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const curr = sorted[i];
    const days = daysBetween(prev.date, curr.date);
    if (days <= 0) continue;
    points.push({ date: curr.date, hoursPerDay: (curr.values.horimetro! - prev.values.horimetro!) / days });
  }
  return points;
}

/** Same (date, recordedAt) ordering the server uses — the tiebreak `sortByDate` alone can't express. */
export function sortByDateAndRecordedAt(readings: Reading[]): Reading[] {
  return [...readings].sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? -1 : 1;
    return a.recordedAt < b.recordedAt ? -1 : a.recordedAt > b.recordedAt ? 1 : 0;
  });
}

/**
 * Unions the dates of two independent-cadence series, `null` where one side
 * has no point — for overlaying series that aren't read on the same schedule.
 */
export function mergeSeriesByDate<A extends { date: string }, B extends { date: string }>(
  seriesA: A[],
  seriesB: B[],
  valueA: (point: A) => number,
  valueB: (point: B) => number,
): { date: string; a: number | null; b: number | null }[] {
  const dates = Array.from(new Set([...seriesA.map((p) => p.date), ...seriesB.map((p) => p.date)])).sort();
  const aByDate = new Map(seriesA.map((p) => [p.date, valueA(p)]));
  const bByDate = new Map(seriesB.map((p) => [p.date, valueB(p)]));
  return dates.map((date) => ({ date, a: aByDate.get(date) ?? null, b: bByDate.get(date) ?? null }));
}

export interface HorimetroBounds {
  lower: number | null;
  upper: number | null;
}

type BoundedField = 'valor' | 'horimetro';

/**
 * Mirrors the server's neighbor-bounded checks (backend `_neighbor_bounds`):
 * nearest earlier/later reading that carries a value in `field`, skipping
 * blanks, ordered by (date, recordedAt) same as the server — `date` alone
 * isn't enough since same-day readings need the tiebreak. `excludeId` omits
 * the reading being edited from its own bounds; omit it entirely for a
 * not-yet-created (ghost) date, which by construction has no same-day
 * reading to tie-break against.
 */
function fieldNeighborBounds(
  readings: Reading[],
  field: BoundedField,
  target: { date: string; recordedAt: string },
  excludeId?: string
): HorimetroBounds {
  const withField = sortByDateAndRecordedAt(
    readings.filter((r) => r.id !== excludeId && r.values[field] != null)
  );
  const isBefore = (r: Reading) =>
    r.date < target.date || (r.date === target.date && r.recordedAt < target.recordedAt);
  const isAfter = (r: Reading) =>
    r.date > target.date || (r.date === target.date && r.recordedAt > target.recordedAt);

  const earlier = [...withField].reverse().find(isBefore);
  const later = withField.find(isAfter);

  return {
    lower: earlier ? earlier.values[field]! : null,
    upper: later ? later.values[field]! : null,
  };
}

export function horimetroBounds(readings: Reading[], targetReadingId: string): HorimetroBounds {
  const target = readings.find((r) => r.id === targetReadingId);
  if (!target) return { lower: null, upper: null };
  return fieldNeighborBounds(readings, 'horimetro', target, targetReadingId);
}

export function valorBoundsForReading(readings: Reading[], targetReadingId: string): HorimetroBounds {
  const target = readings.find((r) => r.id === targetReadingId);
  if (!target) return { lower: null, upper: null };
  return fieldNeighborBounds(readings, 'valor', target, targetReadingId);
}

/** Same neighbor-bounded rule, for a date that has no reading yet (a ghost day being filled in). */
export function fieldBoundsForNewDate(readings: Reading[], field: BoundedField, date: string): HorimetroBounds {
  return fieldNeighborBounds(readings, field, { date, recordedAt: `${date}T12:00:00.000Z` });
}

function daysInCalendarMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function monthIndex(year: number, month: number): number {
  return year * 12 + month;
}

/**
 * Calendar days of the given month, capped at today for the current month
 * and empty for a month that hasn't started yet. Shared day-range logic
 * behind `expectedDailyDates` and `allDailyDates` below.
 */
function calendarDaysUpToToday(year: number, month: number, todayISO: string): number[] {
  const [todayYear, todayMonth, todayDay] = todayISO.split('-').map(Number);
  if (monthIndex(year, month) > monthIndex(todayYear, todayMonth)) return [];

  const totalDays = daysInCalendarMonth(year, month);
  const lastDay =
    monthIndex(year, month) === monthIndex(todayYear, todayMonth) ? Math.min(todayDay, totalDays) : totalDays;

  return Array.from({ length: lastDay }, (_, i) => i + 1);
}

function isoDate(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/**
 * Calendar days a daily-cadence Área expects a reading on, within the given
 * month — every day except Sunday (CONTEXT.md → diasSemLeitura), using
 * actual calendar days, not the outorga's fixed 30-day convention (which is
 * a separate, deliberately different, convention — see CONTEXT.md). Capped
 * at today for the current month; empty for a month that hasn't started.
 */
export function expectedDailyDates(year: number, month: number, todayISO: string): string[] {
  return calendarDaysUpToToday(year, month, todayISO)
    .filter((day) => new Date(Date.UTC(year, month - 1, day)).getUTCDay() !== 0)
    .map((day) => isoDate(year, month, day));
}

/**
 * Every calendar day of the month, Sundays included — the day range shown as
 * ghost rows in the editable reading grid. Deliberately broader than
 * `expectedDailyDates`: Sundays are never physically read, but the grid still
 * offers them as a row so a supervisor can retroactively backfill one (see
 * `estimateBackfillValor`) instead of leaving a silent gap in the record.
 */
export function allDailyDates(year: number, month: number, todayISO: string): string[] {
  return calendarDaysUpToToday(year, month, todayISO).map((day) => isoDate(year, month, day));
}

/** All daily-cadence dates with no reading at all — the "ghost day" gaps to backfill. */
export function missingDailyDates(readings: Reading[], year: number, month: number, todayISO: string): string[] {
  const present = new Set(readings.map((r) => r.date));
  return allDailyDates(year, month, todayISO).filter((d) => !present.has(d));
}

/** Monday of the calendar week (Mon–Sun) containing `isoDate`. */
function mondayOf(isoDate: string): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  const dayUTC = Date.UTC(y, m - 1, d);
  const dow = new Date(dayUTC).getUTCDay(); // 0=Sun..6=Sat
  const diffToMonday = dow === 0 ? -6 : 1 - dow;
  return new Date(dayUTC + diffToMonday * 86_400_000).toISOString().slice(0, 10);
}

/**
 * Week-start (Monday) dates a weekly-cadence Área expects a reading on, within
 * the given month — one bucket per calendar week (Mon–Sun), owned by whichever
 * month its Monday falls in (so a week straddling a month boundary is never
 * double-counted across both months' views). Capped at today for the current
 * month, same as `allDailyDates` — a week that hasn't started yet gets no
 * ghost row.
 */
export function expectedWeeklyDates(year: number, month: number, todayISO: string): string[] {
  const monthStart = monthStartISO(year, month);
  const monthEnd = isoDate(year, month, daysInCalendarMonth(year, month));
  const mondays = new Set<string>();
  for (const day of calendarDaysUpToToday(year, month, todayISO)) {
    const monday = mondayOf(isoDate(year, month, day));
    if (monday >= monthStart && monday <= monthEnd) mondays.add(monday);
  }
  return Array.from(mondays).sort();
}

/** All expected weeks (see `expectedWeeklyDates`) with no reading anywhere in their Mon–Sun span. */
export function missingWeeklyDates(readings: Reading[], year: number, month: number, todayISO: string): string[] {
  return expectedWeeklyDates(year, month, todayISO).filter((monday) => {
    const start = toUTCDays(monday);
    return !readings.some((r) => {
      const days = toUTCDays(r.date);
      return days >= start && days < start + 7;
    });
  });
}

export type BackfillMethod = 'interpolated' | 'carried';

export interface BackfillEstimate {
  valor: number;
  method: BackfillMethod;
}

/**
 * Nearest readings with a `valor` before/after a ghost date, tie-broken by
 * (date, recordedAt) same as `fieldNeighborBounds` — a same-day correction
 * must resolve by time-of-day, not array order (see `e8d319f`, which fixed
 * this exact class of bug for batch-save ordering).
 */
function valorNeighbors(readings: Reading[], date: string): { before: Reading | null; after: Reading | null } {
  const target = { date, recordedAt: `${date}T12:00:00.000Z` };
  const withValor = sortByDateAndRecordedAt(readings.filter((r) => r.values.valor != null));
  const isBefore = (r: Reading) => r.date < target.date || (r.date === target.date && r.recordedAt < target.recordedAt);
  const isAfter = (r: Reading) => r.date > target.date || (r.date === target.date && r.recordedAt > target.recordedAt);
  return { before: [...withValor].reverse().find(isBefore) ?? null, after: withValor.find(isAfter) ?? null };
}

/**
 * Estimate for a ghost day's `valor`, from the nearest chronological readings
 * before and after it. Uses the same day-weighted spreading as `dailyRate`
 * (CONTEXT.md → Taxa diária: a gap's delta is spread evenly across the days
 * it covers, never dumped as a spike) rather than a plain midpoint — so a
 * ghost day sitting closer to one neighbor gets an estimate closer to that
 * neighbor's value. Falls back to carrying the single known neighbor forward
 * (or back) when only one side exists — the `method` is reported alongside
 * the value so callers never describe a carried-forward value as
 * "interpolated". Returns `null` when neither neighbor exists (a ghost date
 * outside all recorded history).
 */
export function estimateBackfillValor(readings: Reading[], date: string): BackfillEstimate | null {
  const { before, after } = valorNeighbors(readings, date);

  if (before && after) {
    const span = daysBetween(before.date, after.date);
    const elapsed = daysBetween(before.date, date);
    const rate = (after.values.valor! - before.values.valor!) / span;
    return { valor: Math.round((before.values.valor! + rate * elapsed) * 100) / 100, method: 'interpolated' };
  }
  if (before) return { valor: before.values.valor!, method: 'carried' };
  if (after) return { valor: after.values.valor!, method: 'carried' };
  return null;
}

/**
 * Observação recorded on a "Retroativo" backfilled ghost day, so the record
 * is explicit that the value wasn't read off the physical meter — and honest
 * about how it was estimated (never claims interpolation for a carried-over
 * value, and never claims a specific day-of-week reason the button doesn't
 * actually check — see PR #33 review).
 */
export function backfillObservacao(estimate: BackfillEstimate | null): string {
  if (estimate?.method === 'interpolated') {
    return 'Leitura não realizada fisicamente — valor estimado por interpolação entre leituras vizinhas.';
  }
  if (estimate?.method === 'carried') {
    return 'Leitura não realizada fisicamente — valor estimado a partir da leitura vizinha mais próxima.';
  }
  return 'Leitura não realizada fisicamente — sem leituras vizinhas para estimar o valor.';
}

/** `lastHorímetro − firstHorímetro` within the month. Null when no horímetro data exists that month. */
export function horasOperadas(readings: Reading[], year: number, month: number): number | null {
  const inMonth = sortByDate(readings)
    .filter((r) => r.values.horimetro != null)
    .filter((r) => isInMonth(r.date, year, month));
  if (inMonth.length === 0) return null;
  return inMonth[inMonth.length - 1].values.horimetro! - inMonth[0].values.horimetro!;
}

/**
 * Extrapolates month-to-date consumption to a full month "at current pace" —
 * CONTEXT.md names this exceedance check but doesn't pin down what "current
 * pace" means. This is left to you: see the TODO below.
 */
export function monthEndProjection(monthToDateConsumption: number, daysElapsed: number): number {
  return (monthToDateConsumption / daysElapsed) * 30;
}

export interface ExceedanceChecks {
  monthToDateOver: boolean;
  projectedOver: boolean;
  dailyRateOver: boolean;
  hoursOver: boolean;
  cardState: 'within' | 'projected-over' | 'over';
}

export function exceedanceChecks(params: {
  monthToDateConsumption: number;
  cap: number;
  projection: number;
  latestDailyRate: number | null;
  dailyCap: number;
  measuredHoursPerDay: number | null;
  horasOperacao: number;
}): ExceedanceChecks {
  // cap/dailyCap are 0 when limiteOutorgado isn't configured yet (nullable — see
  // MonitoredItem.limiteOutorgado) — that's "no permit limit set", not "already over
  // a zero limit", so every cap-based check is gated on the cap actually being set.
  const monthToDateOver = params.cap > 0 && params.monthToDateConsumption > params.cap;
  const projectedOver = params.cap > 0 && params.projection > params.cap;
  const dailyRateOver =
    params.dailyCap > 0 && params.latestDailyRate != null && params.latestDailyRate > params.dailyCap;
  const hoursOver = params.measuredHoursPerDay != null && params.measuredHoursPerDay > params.horasOperacao;

  return {
    monthToDateOver,
    projectedOver,
    dailyRateOver,
    hoursOver,
    cardState: monthToDateOver ? 'over' : projectedOver ? 'projected-over' : 'within',
  };
}

export interface HidrometroMonthStats {
  readingsUpToMonth: Reading[];
  monthReadings: Reading[];
  monthToDateConsumption: number;
  cap: number;
  projection: number;
  rateSeries: DailyRatePoint[];
  latestDailyRate: number | null;
  dailyCap: number;
  vazaoMediaSeries: VazaoEfetivaPoint[];
  latestVazaoMedia: number | null;
  vazaoEfetivaSeries: VazaoEfetivaPoint[];
  latestVazaoEfetiva: number | null;
  latestHoursPerDay: number | null;
  checks: ExceedanceChecks;
  monthHoras: number | null;
}

/**
 * Every derived figure a hidrômetro month view needs (Overview compliance
 * card, Item Detail stat row + charts), computed once from the same inputs
 * so the two pages can never drift on how a figure is derived.
 */
export function hidrometroMonthStats(
  item: Pick<MonitoredItem, 'limiteOutorgado' | 'horasOperacao' | 'hasHorimetro'>,
  readings: Reading[],
  year: number,
  month: number,
  todayISO: string
): HidrometroMonthStats {
  const daysElapsed = daysElapsedInMonth(year, month, todayISO);
  const monthBoundary = nextMonthStartISO(year, month);
  const readingsUpToMonth = readings.filter((r) => r.date < monthBoundary);
  const monthReadings = readings.filter((r) => isInMonth(r.date, year, month));

  const monthToDateConsumption = monthlyConsumption(readings, year, month);
  const cap = monthlyCap(item);
  const projection = monthEndProjection(monthToDateConsumption, daysElapsed);

  const inMonth = <T extends { date: string }>(p: T) => isInMonth(p.date, year, month);
  const rateSeries = dailyRate(readingsUpToMonth).filter(inMonth);
  const latestDailyRate = rateSeries.length > 0 ? rateSeries[rateSeries.length - 1].rate : null;
  const dailyCap = item.limiteOutorgado != null ? item.limiteOutorgado * item.horasOperacao : 0;

  const vazaoMediaSeries = rateSeries.map((p) => ({ date: p.date, vazao: vazaoMediaOutorga(p.rate, item.horasOperacao) }));
  const latestVazaoMedia = latestDailyRate != null ? vazaoMediaOutorga(latestDailyRate, item.horasOperacao) : null;

  const vazaoEfetivaSeries = item.hasHorimetro ? vazaoEfetivaHorimetro(readingsUpToMonth).filter(inMonth) : [];
  const latestVazaoEfetiva = vazaoEfetivaSeries.length > 0 ? vazaoEfetivaSeries[vazaoEfetivaSeries.length - 1].vazao : null;

  const hoursPerDaySeries = item.hasHorimetro ? measuredHoursPerDay(readingsUpToMonth).filter(inMonth) : [];
  const latestHoursPerDay = hoursPerDaySeries.length > 0 ? hoursPerDaySeries[hoursPerDaySeries.length - 1].hoursPerDay : null;

  const checks = exceedanceChecks({
    monthToDateConsumption,
    cap,
    projection,
    latestDailyRate,
    dailyCap,
    measuredHoursPerDay: latestHoursPerDay,
    horasOperacao: item.horasOperacao,
  });

  const monthHoras = item.hasHorimetro ? horasOperadas(readings, year, month) : null;

  return {
    readingsUpToMonth,
    monthReadings,
    monthToDateConsumption,
    cap,
    projection,
    rateSeries,
    latestDailyRate,
    dailyCap,
    vazaoMediaSeries,
    latestVazaoMedia,
    vazaoEfetivaSeries,
    latestVazaoEfetiva,
    latestHoursPerDay,
    checks,
    monthHoras,
  };
}

export interface PrecipitationPoint {
  date: string;
  mm: number;
}

/** Daily precipitation for the given month, ordered by (date, recordedAt). */
export function dailyPrecipitationPoints(readings: Reading[], year: number, month: number): PrecipitationPoint[] {
  return sortByDateAndRecordedAt(readings.filter((r) => isInMonth(r.date, year, month) && r.values.valor != null)).map((r) => ({
    date: r.date,
    mm: r.values.valor!,
  }));
}

export interface MonthlyMaxPoint {
  month: number; // 1..12
  maxMm: number;
  hasData: boolean; // false = no readings that month, distinct from a real 0mm day
}

/** Highest single daily reading (not a sum) per calendar month — CONTEXT.md's "Máximo" stat for pluviômetro. */
export function monthlyPrecipitationMax(readings: Reading[], year: number): MonthlyMaxPoint[] {
  const points: MonthlyMaxPoint[] = [];
  for (let month = 1; month <= 12; month++) {
    const inMonth = readings.filter((r) => isInMonth(r.date, year, month) && r.values.valor != null);
    points.push({
      month,
      maxMm: inMonth.length > 0 ? Math.max(...inMonth.map((r) => r.values.valor!)) : 0,
      hasData: inMonth.length > 0,
    });
  }
  return points;
}

export interface MonthlyVazaoPoint {
  month: number; // 1..12
  avgVazao: number; // m³/s
  hasData: boolean; // false = no readings that month, distinct from a real 0 m³/s average
}

/** Average measured vazão per calendar month — CONTEXT.md's "Média" stat for córrego. */
export function monthlyVazaoAverages(readings: Reading[], year: number): MonthlyVazaoPoint[] {
  const points: MonthlyVazaoPoint[] = [];
  for (let month = 1; month <= 12; month++) {
    const inMonth = readings.filter((r) => isInMonth(r.date, year, month) && r.values.vazao != null);
    points.push({
      month,
      avgVazao: inMonth.length > 0 ? inMonth.reduce((sum, r) => sum + r.values.vazao!, 0) / inMonth.length : 0,
      hasData: inMonth.length > 0,
    });
  }
  return points;
}
