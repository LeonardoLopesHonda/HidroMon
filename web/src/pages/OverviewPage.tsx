import { useEffect, useMemo, useState } from 'react';
import { getAreas, getItems, getReadings } from '@/lib/api/resources';
import { ApiError } from '@/lib/api/client';
import { PageShell } from '@/components/PageShell';
import { MonthSelector, currentMonth, type SelectedMonth } from '@/components/shared/MonthSelector';
import { ComplianceCard } from '@/components/overview/ComplianceCard';
import { CompactCard } from '@/components/overview/CompactCard';
import { hidrometroMonthStats, isInMonth, nextMonthStartISO } from '@/lib/metrics';
import type { Area, MonitoredItem, Reading } from '@/types';

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

  // Local calendar date, not UTC — must agree with currentMonth()'s local
  // getFullYear()/getMonth(), or the two can disagree for hours around UTC midnight
  // (e.g. evenings in Brazil, UTC-3).
  const today = new Date();
  const todayISO = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const monthBoundary = nextMonthStartISO(selectedMonth.year, selectedMonth.month);

  return (
    <PageShell>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 22 }}>
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
                      const stats = hidrometroMonthStats(item, itemReadings, selectedMonth.year, selectedMonth.month, todayISO);

                      return (
                        <ComplianceCard
                          key={item.id}
                          itemId={item.id}
                          itemName={item.name}
                          monthToDateConsumption={stats.monthToDateConsumption}
                          cap={stats.cap}
                          projection={stats.projection}
                          checks={stats.checks}
                          horasOperadas={stats.monthHoras}
                          vazaoEfetiva={stats.latestVazaoEfetiva}
                          horasOperacao={item.horasOperacao}
                        />
                      );
                    }

                    if (item.type === 'pluviometro') {
                      const monthMaxMm = itemReadings
                        .filter((r) => isInMonth(r.date, selectedMonth.year, selectedMonth.month))
                        .reduce((max, r) => Math.max(max, r.values.valor ?? 0), 0);
                      return (
                        <CompactCard key={item.id} type="pluviometro" itemId={item.id} itemName={item.name} monthMaxMm={monthMaxMm} />
                      );
                    }

                    // Most recent reading as of the selected month (readings from later
                    // months are excluded), matching the hidrometro/pluviometro cards
                    // which all respect the MonthSelector rather than always showing the
                    // true latest reading regardless of the selected month. itemReadings
                    // isn't sorted, so find the max by date rather than assuming order.
                    const latest = itemReadings
                      .filter((r) => r.date < monthBoundary)
                      .reduce<Reading | null>((max, r) => (!max || r.date > max.date ? r : max), null);
                    return (
                      <CompactCard
                        key={item.id}
                        type="corrego"
                        itemId={item.id}
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
    </PageShell>
  );
}
