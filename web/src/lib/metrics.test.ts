import { describe, expect, it } from 'vitest';
import type { Reading } from '@/types';
import {
  daysElapsedInMonth,
  dailyRate,
  exceedanceChecks,
  horasOperadas,
  measuredHoursPerDay,
  monthEndProjection,
  monthlyCap,
  monthlyConsumption,
  vazaoEfetivaHorimetro,
  vazaoMediaOutorga,
} from '@/lib/metrics';

function reading(date: string, valor?: number, horimetro?: number): Reading {
  return {
    id: `r-${date}-${valor ?? 'x'}-${horimetro ?? 'x'}`,
    itemId: 'item-1',
    date,
    recordedAt: `${date}T12:00:00Z`,
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
});
