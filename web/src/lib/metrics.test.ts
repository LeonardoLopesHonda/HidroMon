import { describe, expect, it } from 'vitest';
import type { Reading } from '@/types';
import {
  cumulativeConsumptionSeries,
  daysElapsedInMonth,
  dailyRate,
  exceedanceChecks,
  horasOperadas,
  horimetroBounds,
  measuredHoursPerDay,
  monthEndProjection,
  monthlyCap,
  monthlyConsumption,
  monthlyPrecipitationTotals,
  nextMonthStartISO,
  vazaoEfetivaHorimetro,
  vazaoMediaOutorga,
  vazaoMediaOutorgaSeries,
} from '@/lib/metrics';

function reading(date: string, valor?: number, horimetro?: number, recordedAt?: string): Reading {
  return {
    id: `r-${date}-${valor ?? 'x'}-${horimetro ?? 'x'}-${recordedAt ?? ''}`,
    itemId: 'item-1',
    date,
    recordedAt: recordedAt ?? `${date}T12:00:00Z`,
    values: { valor, horimetro },
    observacoes: null,
    createdBy: 'user-1',
    createdAt: `${date}T12:00:00Z`,
    updatedAt: `${date}T12:00:00Z`,
  };
}

describe('dailyRate', () => {
  it('computes a delta, never a sum, between consecutive readings', () => {
    const readings = [reading('2026-07-01', 100), reading('2026-07-02', 130)];
    expect(dailyRate(readings)).toEqual([{ date: '2026-07-02', rate: 30 }]);
  });

  it('normalizes across gaps (Sunday, missed days) instead of spiking', () => {
    // Friday -> Monday: Sunday is never read, so the 30 m³ delta spreads over 3 days.
    const readings = [reading('2026-07-03', 100), reading('2026-07-06', 130)];
    expect(dailyRate(readings)).toEqual([{ date: '2026-07-06', rate: 10 }]);
  });

  it('handles multiple gaps independently', () => {
    const readings = [reading('2026-07-01', 100), reading('2026-07-03', 120), reading('2026-07-10', 190)];
    expect(dailyRate(readings)).toEqual([
      { date: '2026-07-03', rate: 10 }, // 20 / 2 days
      { date: '2026-07-10', rate: 10 }, // 70 / 7 days
    ]);
  });
});

describe('monthlyConsumption', () => {
  it('uses last-of-month minus last-before-month, not a sum of readings', () => {
    const readings = [
      reading('2026-06-28', 900),
      reading('2026-07-05', 1000),
      reading('2026-07-15', 1050),
      reading('2026-07-28', 1120),
    ];
    // Sum would be 3170; the correct delta is 1120 - 900 = 220.
    expect(monthlyConsumption(readings, 2026, 7)).toBe(220);
  });

  it('falls back to the month first reading when no earlier reading exists', () => {
    const readings = [reading('2026-07-03', 500), reading('2026-07-20', 560)];
    expect(monthlyConsumption(readings, 2026, 7)).toBe(60);
  });

  it('returns 0 for a lone reading at the start of history', () => {
    const readings = [reading('2026-07-03', 500)];
    expect(monthlyConsumption(readings, 2026, 7)).toBe(0);
  });

  it('returns 0 when the item has no readings in the selected month', () => {
    const readings = [reading('2026-06-28', 900)];
    expect(monthlyConsumption(readings, 2026, 7)).toBe(0);
  });
});

describe('monthlyCap', () => {
  it('fixes the month at 30 days regardless of the calendar month length', () => {
    const item = { limiteOutorgado: 10, horasOperacao: 20 };
    // Same formula for a 28-day February and a 31-day July: 10 * 20 * 30.
    expect(monthlyCap(item)).toBe(6000);
  });

  it('is 0 for items with no outorga limit (pluviômetro/córrego)', () => {
    expect(monthlyCap({ limiteOutorgado: null, horasOperacao: 24 })).toBe(0);
  });
});

describe('daysElapsedInMonth', () => {
  it('counts calendar days since the 1st, inclusive', () => {
    expect(daysElapsedInMonth(2026, 7, '2026-07-10')).toBe(10);
  });

  it('caps at 30 even in a 31-day month', () => {
    expect(daysElapsedInMonth(2026, 7, '2026-07-31')).toBe(30);
  });
});

describe('nextMonthStartISO', () => {
  it('rolls over to January of the following year after December', () => {
    expect(nextMonthStartISO(2026, 12)).toBe('2027-01-01');
  });

  it('advances to the next month within the same year', () => {
    expect(nextMonthStartISO(2026, 7)).toBe('2026-08-01');
  });
});

describe('monthEndProjection', () => {
  it('extrapolates month-to-date consumption linearly by days elapsed', () => {
    expect(monthEndProjection(100, 10)).toBe(300);
  });

  it('matches month-to-date consumption once the full 30 days have elapsed', () => {
    expect(monthEndProjection(500, 30)).toBeCloseTo(500);
  });
});

describe('exceedanceChecks', () => {
  const base = {
    monthToDateConsumption: 100,
    cap: 1000,
    projection: 200,
    latestDailyRate: 10,
    dailyCap: 50,
    measuredHoursPerDay: 20,
    horasOperacao: 24,
  };

  it('flags nothing when every figure is within range', () => {
    expect(exceedanceChecks(base)).toEqual({
      monthToDateOver: false,
      projectedOver: false,
      dailyRateOver: false,
      hoursOver: false,
      cardState: 'within',
    });
  });

  it('flags month-to-date over cap and sets cardState to over', () => {
    const result = exceedanceChecks({ ...base, monthToDateConsumption: 1500 });
    expect(result.monthToDateOver).toBe(true);
    expect(result.cardState).toBe('over');
  });

  it('flags a projected exceedance while month-to-date is still within cap', () => {
    const result = exceedanceChecks({ ...base, projection: 1500 });
    expect(result.monthToDateOver).toBe(false);
    expect(result.projectedOver).toBe(true);
    expect(result.cardState).toBe('projected-over');
  });

  it('flags taxa diária over the daily cap independently of the monthly figures', () => {
    const result = exceedanceChecks({ ...base, latestDailyRate: 80 });
    expect(result.dailyRateOver).toBe(true);
    expect(result.monthToDateOver).toBe(false);
    expect(result.projectedOver).toBe(false);
  });

  it('flags measured operating hours/day over the authorized hours independently', () => {
    const result = exceedanceChecks({ ...base, measuredHoursPerDay: 25 });
    expect(result.hoursOver).toBe(true);
    expect(result.dailyRateOver).toBe(false);
  });

  it('does not flag hours-over when no horímetro data exists for the period', () => {
    const result = exceedanceChecks({ ...base, measuredHoursPerDay: null });
    expect(result.hoursOver).toBe(false);
  });

  it('does not flag any cap-based exceedance when no outorga limit is configured yet', () => {
    // cap/dailyCap are 0 when limiteOutorgado is null (monthlyCap's own contract) —
    // that must read as "no limit set", never as "already over a zero limit".
    const result = exceedanceChecks({ ...base, cap: 0, dailyCap: 0 });
    expect(result.monthToDateOver).toBe(false);
    expect(result.projectedOver).toBe(false);
    expect(result.dailyRateOver).toBe(false);
    expect(result.cardState).toBe('within');
  });
});

describe('other per-item metrics', () => {
  it('vazaoMediaOutorga divides the daily rate by authorized hours', () => {
    expect(vazaoMediaOutorga(48, 24)).toBe(2);
  });

  it('vazaoEfetivaHorimetro divides Δm³ by Δhorímetro between hours-bearing readings', () => {
    const readings = [reading('2026-07-01', 1000, 500), reading('2026-07-10', 1090, 545)];
    expect(vazaoEfetivaHorimetro(readings)).toEqual([{ date: '2026-07-10', vazao: 2 }]);
  });

  it('measuredHoursPerDay divides Δhorímetro by calendar days elapsed', () => {
    const readings = [reading('2026-07-01', 1000, 500), reading('2026-07-06', 1090, 545)];
    expect(measuredHoursPerDay(readings)).toEqual([{ date: '2026-07-06', hoursPerDay: 9 }]);
  });

  it('horasOperadas is last-minus-first horímetro within the month', () => {
    const readings = [reading('2026-07-01', 1000, 500), reading('2026-07-20', 1090, 545)];
    expect(horasOperadas(readings, 2026, 7)).toBe(45);
  });

  it('horasOperadas is null when the month has no horímetro data', () => {
    const readings = [reading('2026-07-01', 1000)];
    expect(horasOperadas(readings, 2026, 7)).toBeNull();
  });

  it('vazaoMediaOutorgaSeries maps each dailyRate point through vazaoMediaOutorga', () => {
    const readings = [reading('2026-07-01', 100), reading('2026-07-02', 130)];
    expect(vazaoMediaOutorgaSeries(readings, 24)).toEqual([{ date: '2026-07-02', vazao: 30 / 24 }]);
  });
});

describe('cumulativeConsumptionSeries', () => {
  it('populates pace every day as a straight line from 0 to the cap', () => {
    const points = cumulativeConsumptionSeries([], 2026, 7, 300);
    expect(points).toHaveLength(30);
    expect(points[0]).toMatchObject({ day: 1, pace: 10 });
    expect(points[14]).toMatchObject({ day: 15, pace: 150 });
    expect(points[29]).toMatchObject({ day: 30, pace: 300 });
  });

  it('populates cumulative only on days with an actual reading, using the monthlyConsumption baseline', () => {
    const readings = [reading('2026-06-28', 900), reading('2026-07-05', 1000), reading('2026-07-20', 1050)];
    const points = cumulativeConsumptionSeries(readings, 2026, 7, 300);
    expect(points[4]).toMatchObject({ day: 5, date: '2026-07-05', cumulative: 100 });
    expect(points[19]).toMatchObject({ day: 20, date: '2026-07-20', cumulative: 150 });
    expect(points[9].cumulative).toBeNull(); // day 10 — no reading that day
  });

  it('leaves cumulative null throughout when the item has no baseline (start of history, no in-month reading either)', () => {
    const points = cumulativeConsumptionSeries([], 2026, 7, 300);
    expect(points.every((p) => p.cumulative === null)).toBe(true);
  });
});

describe('monthlyPrecipitationTotals', () => {
  it('sums (never deltas) daily mm per month', () => {
    const readings = [reading('2026-07-01', 5), reading('2026-07-02', 8), reading('2026-08-01', 3)];
    const points = monthlyPrecipitationTotals(readings, 2026);
    expect(points[6]).toMatchObject({ month: 7, totalMm: 13, hasData: true }); // July
    expect(points[7]).toMatchObject({ month: 8, totalMm: 3, hasData: true }); // August
  });

  it('distinguishes a month with no readings from a measured 0mm month', () => {
    const readings = [reading('2026-07-01', 0)];
    const points = monthlyPrecipitationTotals(readings, 2026);
    expect(points[6]).toMatchObject({ month: 7, totalMm: 0, hasData: true });
    expect(points[8]).toMatchObject({ month: 9, totalMm: 0, hasData: false });
  });
});

describe('horimetroBounds', () => {
  it('finds the nearest earlier/later readings with hours, skipping blanks', () => {
    const target = reading('2026-07-10', 1040);
    const readings = [
      reading('2026-07-01', 1000, 500),
      reading('2026-07-05', 1020), // blank horímetro — skipped
      target,
      reading('2026-07-15', 1060), // blank horímetro — skipped
      reading('2026-07-20', 1080, 560),
    ];
    expect(horimetroBounds(readings, target.id)).toEqual({ lower: 500, upper: 560 });
  });

  it('breaks same-day ties using recordedAt, matching the server ordering', () => {
    const target = reading('2026-07-10', 1040, undefined, '2026-07-10T12:00:00Z');
    const readings = [
      reading('2026-07-10', 1030, 510, '2026-07-10T08:00:00Z'), // earlier same day
      target,
      reading('2026-07-10', 1050, 520, '2026-07-10T18:00:00Z'), // later same day
    ];
    expect(horimetroBounds(readings, target.id)).toEqual({ lower: 510, upper: 520 });
  });

  it('has no lower bound at the start of horímetro history', () => {
    const target = reading('2026-07-01', 1000, 500);
    const readings = [target, reading('2026-07-10', 1040, 540)];
    expect(horimetroBounds(readings, target.id)).toEqual({ lower: null, upper: 540 });
  });

  it('has no upper bound at the end of horímetro history', () => {
    const target = reading('2026-07-20', 1040, 540);
    const readings = [reading('2026-07-01', 1000, 500), target];
    expect(horimetroBounds(readings, target.id)).toEqual({ lower: 500, upper: null });
  });

  it("excludes the target reading's own value from its bounds", () => {
    const target = reading('2026-07-10', 1040, 530);
    const readings = [reading('2026-07-01', 1000, 500), target, reading('2026-07-20', 1080, 560)];
    expect(horimetroBounds(readings, target.id)).toEqual({ lower: 500, upper: 560 });
  });
});
