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
  day: number; // 1..30, fixed outorga month
  date: string;
  cumulative: number | null; // populated only on days with an actual reading
  pace: number; // straight cap-pace reference, populated every day
}

/**
 * One point per calendar day of the fixed 30-day outorga month (not per
 * reading). `pace` is populated every day so it renders as a clean straight
 * diagonal; `cumulative` uses the same baseline convention as
 * monthlyConsumption and is populated only on days with an actual reading —
 * gaps stay gaps instead of dropping to zero.
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

  const monthStartDays = toUTCDays(monthStart);
  const points: CumulativeSeriesPoint[] = [];
  for (let day = 1; day <= 30; day++) {
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

function sortByDateAndRecordedAt(readings: Reading[]): Reading[] {
  return [...readings].sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? -1 : 1;
    return a.recordedAt < b.recordedAt ? -1 : a.recordedAt > b.recordedAt ? 1 : 0;
  });
}

export interface HorimetroBounds {
  lower: number | null;
  upper: number | null;
}

/**
 * Mirrors the server's neighbor-bounded horímetro check
 * (backend `_horimetro_bounds`): nearest earlier/later reading that carries
 * hours, skipping blanks, ordered by (date, recordedAt) same as the server —
 * `date` alone isn't enough since same-day readings need the tiebreak.
 */
export function horimetroBounds(readings: Reading[], targetReadingId: string): HorimetroBounds {
  const target = readings.find((r) => r.id === targetReadingId);
  if (!target) return { lower: null, upper: null };

  const withHours = sortByDateAndRecordedAt(
    readings.filter((r) => r.id !== targetReadingId && r.values.horimetro != null)
  );
  const isBefore = (r: Reading) =>
    r.date < target.date || (r.date === target.date && r.recordedAt < target.recordedAt);
  const isAfter = (r: Reading) =>
    r.date > target.date || (r.date === target.date && r.recordedAt > target.recordedAt);

  const earlier = [...withHours].reverse().find(isBefore);
  const later = withHours.find(isAfter);

  return {
    lower: earlier ? earlier.values.horimetro! : null,
    upper: later ? later.values.horimetro! : null,
  };
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

export interface MonthlyPrecipitationPoint {
  month: number; // 1..12
  totalMm: number;
  hasData: boolean; // false = no readings that month, distinct from a real 0mm month
}

/** Sum (not delta) of daily mm per calendar month — precipitation isn't a cumulative odometer. */
export function monthlyPrecipitationTotals(readings: Reading[], year: number): MonthlyPrecipitationPoint[] {
  const points: MonthlyPrecipitationPoint[] = [];
  for (let month = 1; month <= 12; month++) {
    const inMonth = readings.filter((r) => isInMonth(r.date, year, month) && r.values.valor != null);
    points.push({
      month,
      totalMm: inMonth.reduce((sum, r) => sum + r.values.valor!, 0),
      hasData: inMonth.length > 0,
    });
  }
  return points;
}
