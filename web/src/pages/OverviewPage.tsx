import { useEffect, useMemo, useState } from 'react';
import { getAreas, getItems, getReadings } from '@/lib/api/resources';
import { ApiError } from '@/lib/api/client';
import { AppHeader } from '@/components/AppHeader';
import { MonthSelector, currentMonth, type SelectedMonth } from '@/components/overview/MonthSelector';
import { ComplianceCard } from '@/components/overview/ComplianceCard';
import { CompactCard } from '@/components/overview/CompactCard';
import {
  dailyRate,
  daysElapsedInMonth,
  exceedanceChecks,
  horasOperadas,
  measuredHoursPerDay,
  monthEndProjection,
  monthlyCap,
  monthlyConsumption,
  vazaoEfetivaHorimetro,
} from '@/lib/metrics';
import type { Area, MonitoredItem, Reading } from '@/types';

/** Not necessarily a valid calendar date (e.g. "2026-02-31") — only used as an ISO-string upper bound, which is safe since zero-padded ISO dates compare lexicographically in date order. */
function monthEndBoundary(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}-31`;
}

export function OverviewPage() {
  const [areas, setAreas] = useState<Area[]>([]);
  const [items, setItems] = useState<MonitoredItem[]>([]);
  const [readings, setReadings] = useState<Reading[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<SelectedMonth>(currentMonth());

  useEffect(() => {
    let cancelled = false;

    Promise.all([getAreas(), getItems(), getReadings()])
      .then(([areasRes, itemsRes, readingsRes]) => {
        if (cancelled) return;
        setAreas(areasRes);
        setItems(itemsRes);
        setReadings(readingsRes);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof ApiError ? 'Não foi possível carregar os dados.' : 'Erro de conexão com o servidor.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const readingsByItem = useMemo(() => {
    const map = new Map<string, Reading[]>();
    for (const r of readings) {
      const list = map.get(r.itemId) ?? [];
      list.push(r);
      map.set(r.itemId, list);
    }
    return map;
  }, [readings]);

  const itemsByArea = useMemo(() => {
    const map = new Map<string, MonitoredItem[]>();
    for (const item of items) {
      if (item.disabled) continue;
      const list = map.get(item.areaId) ?? [];
      list.push(item);
      map.set(item.areaId, list);
    }
    return map;
  }, [items]);

  const now = currentMonth();
  const isCurrent = selectedMonth.year === now.year && selectedMonth.month === now.month;
  const todayISO = new Date().toISOString().slice(0, 10);
  const monthBoundary = monthEndBoundary(selectedMonth.year, selectedMonth.month);
  // A past month is fully elapsed regardless of its actual calendar length (28-31
  // days) — the outorga's fixed 30-day accounting period is complete either way.
  // Only the in-progress current month needs the real elapsed-day count.
  const daysElapsed = isCurrent ? daysElapsedInMonth(selectedMonth.year, selectedMonth.month, todayISO) : 30;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)' }}>
      <AppHeader />
      <main style={{ padding: '26px 28px 60px', maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
          <h1 style={{ margin: 0, font: '600 18px var(--font-sans)', color: 'var(--color-text)' }}>Visão Geral</h1>
          <MonthSelector value={selectedMonth} onChange={setSelectedMonth} />
        </div>

        {loading && (
          <p style={{ font: '400 13px var(--font-sans)', color: 'var(--color-text-muted)' }}>Carregando…</p>
        )}
        {error && <p style={{ font: '400 13px var(--font-sans)', color: 'var(--color-danger-text)' }}>{error}</p>}

        {!loading && !error && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 30 }}>
            {areas.map((area) => {
              const areaItems = itemsByArea.get(area.id) ?? [];
              if (areaItems.length === 0) return null;

              return (
                <section key={area.id}>
                  <h2
                    style={{
                      margin: '0 0 12px',
                      font: '600 12px var(--font-sans)',
                      color: 'var(--color-text-muted)',
                      textTransform: 'uppercase',
                      letterSpacing: '.07em',
                    }}
                  >
                    {area.name}
                  </h2>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                      gap: 14,
                    }}
                  >
                    {areaItems.map((item) => {
                      const itemReadings = readingsByItem.get(item.id) ?? [];

                      if (item.type === 'hidrometro') {
                        const readingsUpToMonth = itemReadings.filter((r) => r.date <= monthBoundary);
                        const monthToDateConsumption = monthlyConsumption(
                          itemReadings,
                          selectedMonth.year,
                          selectedMonth.month
                        );
                        const cap = monthlyCap(item);
                        const projection = monthEndProjection(monthToDateConsumption, daysElapsed);

                        const rateSeries = dailyRate(readingsUpToMonth);
                        const latestDailyRate = rateSeries.length > 0 ? rateSeries[rateSeries.length - 1].rate : null;
                        const dailyCap = item.limiteOutorgado != null ? item.limiteOutorgado * item.horasOperacao : 0;

                        const hoursPerDaySeries = measuredHoursPerDay(readingsUpToMonth);
                        const latestHoursPerDay =
                          hoursPerDaySeries.length > 0 ? hoursPerDaySeries[hoursPerDaySeries.length - 1].hoursPerDay : null;

                        const checks = exceedanceChecks({
                          monthToDateConsumption,
                          cap,
                          projection,
                          latestDailyRate,
                          dailyCap,
                          measuredHoursPerDay: latestHoursPerDay,
                          horasOperacao: item.horasOperacao,
                        });

                        const monthHoras = item.hasHorimetro
                          ? horasOperadas(itemReadings, selectedMonth.year, selectedMonth.month)
                          : null;
                        const vazaoSeries = item.hasHorimetro ? vazaoEfetivaHorimetro(readingsUpToMonth) : [];
                        const latestVazaoEfetiva = vazaoSeries.length > 0 ? vazaoSeries[vazaoSeries.length - 1].vazao : null;

                        return (
                          <ComplianceCard
                            key={item.id}
                            itemName={item.name}
                            monthToDateConsumption={monthToDateConsumption}
                            cap={cap}
                            projection={projection}
                            checks={checks}
                            horasOperadas={monthHoras}
                            vazaoEfetiva={latestVazaoEfetiva}
                            horasOperacao={item.horasOperacao}
                          />
                        );
                      }

                      if (item.type === 'pluviometro') {
                        const monthTotalMm = itemReadings
                          .filter((r) => r.date <= monthBoundary && r.date.slice(0, 7) === monthBoundary.slice(0, 7))
                          .reduce((sum, r) => sum + (r.values.valor ?? 0), 0);
                        return (
                          <CompactCard key={item.id} type="pluviometro" itemName={item.name} monthTotalMm={monthTotalMm} />
                        );
                      }

                      const latest =
                        [...itemReadings].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))[0] ?? null;
                      return (
                        <CompactCard
                          key={item.id}
                          type="corrego"
                          itemName={item.name}
                          latestDate={latest?.date ?? null}
                          latestNivel={latest?.values.nivel ?? null}
                          latestVazao={latest?.values.vazao ?? null}
                        />
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
