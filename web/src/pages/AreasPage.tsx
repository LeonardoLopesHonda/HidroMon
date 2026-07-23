import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getAreas, getItems, getReadings } from '@/lib/api/resources';
import { ApiError } from '@/lib/api/client';
import { PageShell } from '@/components/PageShell';
import { Badge } from '@/components/ui/Badge';
import { ActiveOnlyFilter } from '@/components/shared/ActiveOnlyFilter';
import { formatDateBR } from '@/lib/format';
import type { Area, MonitoredItem, MonitoringType, Reading } from '@/types';

const TYPE_LABELS: Record<MonitoringType, string> = {
  hidrometro: 'Hidrômetro',
  pluviometro: 'Pluviômetro',
  corrego: 'Córrego',
};

function latestReadingDate(readings: Reading[], itemId: string): string | null {
  const dates = readings.filter((r) => r.itemId === itemId).map((r) => r.date);
  if (dates.length === 0) return null;
  return dates.reduce((latest, d) => (d > latest ? d : latest));
}

export function AreasPage() {
  const [areas, setAreas] = useState<Area[]>([]);
  const [items, setItems] = useState<MonitoredItem[]>([]);
  const [readings, setReadings] = useState<Reading[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeOnly, setActiveOnly] = useState(true);

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

  const itemsByArea = useMemo(() => {
    const map = new Map<string, MonitoredItem[]>();
    for (const item of items) {
      if (activeOnly && item.disabled) continue;
      const list = map.get(item.areaId) ?? [];
      list.push(item);
      map.set(item.areaId, list);
    }
    return map;
  }, [items, activeOnly]);

  return (
    <PageShell>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 14 }}>
        <ActiveOnlyFilter checked={activeOnly} onChange={setActiveOnly} />
      </div>

      {loading && (
        <p style={{ font: '400 13px var(--font-sans)', color: 'var(--color-text-muted)' }}>Carregando…</p>
      )}
      {error && (
        <p style={{ font: '400 13px var(--font-sans)', color: 'var(--color-danger-text)' }}>{error}</p>
      )}
      {!loading && !error && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 26 }}>
          {areas.map((area) => {
            const areaItems = itemsByArea.get(area.id) ?? [];
            return (
              <section key={area.id}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
                  <h2
                    style={{
                      margin: 0,
                      font: '600 12px var(--font-sans)',
                      color: 'var(--color-text-muted)',
                      textTransform: 'uppercase',
                      letterSpacing: '.07em',
                    }}
                  >
                    {area.name}
                  </h2>
                  <span style={{ font: '400 11px var(--font-sans)', color: 'var(--color-text-faint)' }}>
                    {areaItems.length} {areaItems.length === 1 ? 'ponto monitorado' : 'pontos monitorados'}
                  </span>
                </div>
                <div
                  style={{
                    background: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 10,
                    overflow: 'hidden',
                  }}
                >
                  {areaItems.length === 0 && (
                    <div style={{ padding: '18px 20px', font: '400 12.5px var(--font-sans)', color: 'var(--color-text-faint)' }}>
                      Nenhum ponto monitorado nesta área.
                    </div>
                  )}
                  {areaItems.map((item, i) => {
                    const latest = latestReadingDate(readings, item.id);
                    return (
                      <Link
                        key={item.id}
                        to={`/items/${item.id}`}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 12,
                          padding: '14px 20px',
                          borderTop: i === 0 ? 'none' : '1px solid var(--color-border-light)',
                          opacity: item.disabled ? 0.7 : 1,
                          textDecoration: 'none',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{ font: '600 13.5px var(--font-sans)', color: 'var(--color-text)' }}>
                            {item.name}
                          </span>
                          <Badge variant="info">{TYPE_LABELS[item.type]}</Badge>
                          {item.disabled && <Badge variant="disabled">Desativado</Badge>}
                        </div>
                        <span style={{ font: '400 12px var(--font-sans)', color: 'var(--color-text-faint)' }}>
                          {latest ? `Última leitura ${formatDateBR(latest)}` : 'Sem leituras'}
                        </span>
                      </Link>
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
