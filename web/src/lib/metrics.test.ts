import { describe, expect, it } from 'vitest';
import type { Reading } from '@/types';
import {
  allDailyDates,
  backfillObservacao,
  cumulativeConsumptionSeries,
  daysElapsedInMonth,
  dailyRate,
  estimateBackfillValor,
  exceedanceChecks,
  expectedDailyDates,
  expectedWeeklyDates,
  fieldBoundsForNewDate,
  hidrometroMonthStats,
  horasOperadas,
  horimetroBounds,
  measuredHoursPerDay,
  missingDailyDates,
  missingWeeklyDates,
  monthEndProjection,
  monthlyCap,
  monthlyConsumption,
  monthlyPrecipitationMax,
  monthlyVazaoAverages,
  nextMonthStartISO,
  valorBoundsForReading,
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
  it('populates pace every day as a straight line from 0 to the cap, for a 30-day month', () => {
    const points = cumulativeConsumptionSeries([], 2026, 6, 300); // June — 30 days
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

  it('extends the grid to 31 days so a reading on the last day of a 31-day month is never dropped', () => {
    const readings = [reading('2026-06-28', 900), reading('2026-07-31', 1200)];
    const points = cumulativeConsumptionSeries(readings, 2026, 7, 300);
    expect(points).toHaveLength(31);
    expect(points[30]).toMatchObject({ day: 31, date: '2026-07-31', cumulative: 300 });
  });

  it('still generates a full 30-day grid for a 28-day February, so pace reaches the nominal cap', () => {
    const points = cumulativeConsumptionSeries([], 2026, 2, 300);
    expect(points).toHaveLength(30);
    expect(points[29]).toMatchObject({ day: 30, pace: 300 });
  });
});

describe('monthlyPrecipitationMax', () => {
  it('takes the highest single daily reading (never a sum) per month', () => {
    const readings = [reading('2026-07-01', 5), reading('2026-07-02', 8), reading('2026-08-01', 3)];
    const points = monthlyPrecipitationMax(readings, 2026);
    expect(points[6]).toMatchObject({ month: 7, maxMm: 8, hasData: true }); // July
    expect(points[7]).toMatchObject({ month: 8, maxMm: 3, hasData: true }); // August
  });

  it('distinguishes a month with no readings from a measured 0mm day', () => {
    const readings = [reading('2026-07-01', 0)];
    const points = monthlyPrecipitationMax(readings, 2026);
    expect(points[6]).toMatchObject({ month: 7, maxMm: 0, hasData: true });
    expect(points[8]).toMatchObject({ month: 9, maxMm: 0, hasData: false });
  });
});

describe('monthlyVazaoAverages', () => {
  it('averages measured vazão per month', () => {
    const readings = [reading('2026-07-01', 5), reading('2026-07-02', 8)].map((r, i) => ({
      ...r,
      values: { vazao: i === 0 ? 2 : 4 },
    }));
    const points = monthlyVazaoAverages(readings, 2026);
    expect(points[6]).toMatchObject({ month: 7, avgVazao: 3, hasData: true }); // July
  });

  it('distinguishes a month with no readings from a measured 0 m³/s average', () => {
    const readings = [{ ...reading('2026-07-01', 0), values: { vazao: 0 } }];
    const points = monthlyVazaoAverages(readings, 2026);
    expect(points[6]).toMatchObject({ month: 7, avgVazao: 0, hasData: true });
    expect(points[8]).toMatchObject({ month: 9, avgVazao: 0, hasData: false });
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

describe('valorBoundsForReading', () => {
  it('bounds a mid-sequence valor by its chronological neighbors, same rule as the server', () => {
    const target = reading('2026-07-10', 1040);
    const readings = [reading('2026-07-01', 1000), target, reading('2026-07-20', 1080)];
    expect(valorBoundsForReading(readings, target.id)).toEqual({ lower: 1000, upper: 1080 });
  });
});

describe('fieldBoundsForNewDate', () => {
  it('bounds a not-yet-created valor by its chronological neighbors', () => {
    const readings = [reading('2026-07-01', 1000), reading('2026-07-20', 1080)];
    expect(fieldBoundsForNewDate(readings, 'valor', '2026-07-10')).toEqual({ lower: 1000, upper: 1080 });
  });

  it('has no upper bound past the end of history', () => {
    const readings = [reading('2026-07-01', 1000)];
    expect(fieldBoundsForNewDate(readings, 'valor', '2026-07-10')).toEqual({ lower: 1000, upper: null });
  });

  it('bounds horímetro the same way, skipping blanks', () => {
    const readings = [
      reading('2026-07-01', 1000, 500),
      reading('2026-07-05', 1010), // blank horímetro — skipped
      reading('2026-07-20', 1080, 560),
    ];
    expect(fieldBoundsForNewDate(readings, 'horimetro', '2026-07-10')).toEqual({ lower: 500, upper: 560 });
  });
});

describe('expectedDailyDates', () => {
  it('excludes Sundays for a past month', () => {
    const dates = expectedDailyDates(2026, 6, '2026-07-21');
    expect(dates).toHaveLength(26); // 30 days in June minus 4 Sundays
    expect(dates).not.toContain('2026-06-07');
    expect(dates).not.toContain('2026-06-14');
  });

  it('caps at today for the current month', () => {
    const dates = expectedDailyDates(2026, 7, '2026-07-21');
    expect(dates[dates.length - 1]).toBe('2026-07-21');
    expect(dates).not.toContain('2026-07-22');
  });

  it('is empty for a month that has not started yet', () => {
    expect(expectedDailyDates(2026, 8, '2026-07-21')).toEqual([]);
  });
});

describe('allDailyDates', () => {
  it('includes Sundays, unlike expectedDailyDates', () => {
    const dates = allDailyDates(2026, 6, '2026-07-21');
    expect(dates).toHaveLength(30);
    expect(dates).toContain('2026-06-07');
    expect(dates).toContain('2026-06-14');
  });

  it('caps at today for the current month', () => {
    const dates = allDailyDates(2026, 7, '2026-07-21');
    expect(dates[dates.length - 1]).toBe('2026-07-21');
  });
});

describe('missingDailyDates', () => {
  it('excludes dates that already have a reading', () => {
    const readings = [reading('2026-07-01', 1000), reading('2026-07-02', 1010)];
    expect(missingDailyDates(readings, 2026, 7, '2026-07-03')).toEqual(['2026-07-03']);
  });

  it('includes a missing Sunday as a ghost day', () => {
    const readings = [reading('2026-06-30', 1000)];
    expect(missingDailyDates(readings, 2026, 7, '2026-07-05')).toEqual([
      '2026-07-01',
      '2026-07-02',
      '2026-07-03',
      '2026-07-04',
      '2026-07-05',
    ]); // 2026-07-05 is a Sunday and still shows up
  });
});

describe('expectedWeeklyDates', () => {
  it('returns one Monday per calendar week for a past month', () => {
    // June 2026: the 1st is a Monday, so every week's Monday falls in-month.
    expect(expectedWeeklyDates(2026, 6, '2026-07-21')).toEqual(['2026-06-01', '2026-06-08', '2026-06-15', '2026-06-22', '2026-06-29']);
  });

  it('caps at the week containing today for the current month', () => {
    // 2026-07-21 is a Tuesday; the week of 07-20 has started but 07-27 has not.
    expect(expectedWeeklyDates(2026, 7, '2026-07-21')).toEqual(['2026-07-06', '2026-07-13', '2026-07-20']);
  });

  it('is empty for a month that has not started yet', () => {
    expect(expectedWeeklyDates(2026, 8, '2026-07-21')).toEqual([]);
  });

  it('attributes a month-straddling week to whichever month its Monday falls in', () => {
    // July 2026's last week starts Monday the 27th and spills into Aug 1-2.
    expect(expectedWeeklyDates(2026, 7, '2026-07-31')).toContain('2026-07-27');
    // August 2026 opens on a Saturday — its first Monday is Aug 3, not July 27.
    expect(expectedWeeklyDates(2026, 8, '2026-08-31')).toEqual(['2026-08-03', '2026-08-10', '2026-08-17', '2026-08-24', '2026-08-31']);
  });
});

describe('missingWeeklyDates', () => {
  it('excludes weeks that already have a reading anywhere in their Mon–Sun span', () => {
    const readings = [reading('2026-07-08', 1000), reading('2026-07-15', 1010)];
    expect(missingWeeklyDates(readings, 2026, 7, '2026-07-21')).toEqual(['2026-07-20']);
  });

  it('flags every expected week as missing when there are no readings', () => {
    expect(missingWeeklyDates([], 2026, 7, '2026-07-21')).toEqual(['2026-07-06', '2026-07-13', '2026-07-20']);
  });
});

describe('estimateBackfillValor', () => {
  it('interpolates by elapsed days between the surrounding readings', () => {
    const readings = [reading('2026-07-03', 1000), reading('2026-07-08', 1050)];
    // 2 of the 5 days elapsed since the earlier reading -> 2/5 of the 50 m³ delta
    expect(estimateBackfillValor(readings, '2026-07-05')).toEqual({ valor: 1020, method: 'interpolated' });
  });

  it('carries the earlier reading forward when there is no later neighbor', () => {
    const readings = [reading('2026-07-03', 1000)];
    expect(estimateBackfillValor(readings, '2026-07-05')).toEqual({ valor: 1000, method: 'carried' });
  });

  it('carries the later reading back when there is no earlier neighbor', () => {
    const readings = [reading('2026-07-08', 1050)];
    expect(estimateBackfillValor(readings, '2026-07-05')).toEqual({ valor: 1050, method: 'carried' });
  });

  it('returns null when there is no reading at all', () => {
    expect(estimateBackfillValor([], '2026-07-05')).toBeNull();
  });

  it('breaks a same-day tie by recordedAt, not array order', () => {
    // Two valor readings both dated 2026-07-03 (a same-day correction) — the later
    // recordedAt must win as the "before" neighbor, regardless of array position.
    const readings = [
      reading('2026-07-03', 900, undefined, '2026-07-03T08:00:00Z'),
      reading('2026-07-03', 1000, undefined, '2026-07-03T18:00:00Z'),
      reading('2026-07-08', 1050),
    ];
    expect(estimateBackfillValor(readings, '2026-07-05')).toEqual({ valor: 1020, method: 'interpolated' });
  });
});

describe('backfillObservacao', () => {
  it('describes interpolation without asserting a day-of-week reason', () => {
    expect(backfillObservacao({ valor: 1020, method: 'interpolated' })).toBe(
      'Leitura não realizada fisicamente — valor estimado por interpolação entre leituras vizinhas.'
    );
  });

  it('describes a carried-forward value distinctly from an interpolated one', () => {
    expect(backfillObservacao({ valor: 1000, method: 'carried' })).toBe(
      'Leitura não realizada fisicamente — valor estimado a partir da leitura vizinha mais próxima.'
    );
  });

  it('describes the no-neighbors case when there is nothing to estimate from', () => {
    expect(backfillObservacao(null)).toBe('Leitura não realizada fisicamente — sem leituras vizinhas para estimar o valor.');
  });
});

describe('hidrometroMonthStats', () => {
  const item = { limiteOutorgado: 10, horasOperacao: 20, hasHorimetro: true };

  it('composes monthly consumption, cap, projection, and exceedance checks consistently with the individual metric functions', () => {
    const readings = [reading('2026-06-30', 900, 400), reading('2026-07-05', 950, 410), reading('2026-07-10', 1000, 420)];
    const stats = hidrometroMonthStats(item, readings, 2026, 7, '2026-07-10');

    expect(stats.monthToDateConsumption).toBe(100); // 1000 - 900 (last-of-month minus last-before-month)
    expect(stats.cap).toBe(6000); // 10 * 20 * 30
    expect(stats.checks.cardState).toBe('within');
    expect(stats.monthHoras).toBe(10); // 420 - 410, the two in-month horímetro readings
    expect(stats.latestVazaoMedia).toBe(0.5); // latest taxa diária 10 m³/dia / horasOperacao 20
  });

  it('does not crash and reports no exceedance when the item has no outorga limit configured', () => {
    const noCapItem = { limiteOutorgado: null, horasOperacao: 24, hasHorimetro: false };
    const readings = [reading('2026-06-28', 900), reading('2026-07-10', 1000)];
    const stats = hidrometroMonthStats(noCapItem, readings, 2026, 7, '2026-07-10');

    expect(stats.cap).toBe(0);
    expect(stats.checks.cardState).toBe('within');
    expect(stats.checks.monthToDateOver).toBe(false);
    expect(stats.monthHoras).toBeNull();
  });
});
