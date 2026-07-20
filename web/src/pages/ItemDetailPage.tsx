import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getAreas, getItems, getReadings } from '@/lib/api/resources';
import { ApiError } from '@/lib/api/client';
import { PageShell } from '@/components/PageShell';
import { Badge } from '@/components/ui/Badge';
import { DurhOutorgaInfo } from '@/components/item-detail/DurhOutorgaInfo';
import { HidrometroDetail } from '@/components/item-detail/HidrometroDetail';
import { PluviometroDetail } from '@/components/item-detail/PluviometroDetail';
import { CorregoDetail } from '@/components/item-detail/CorregoDetail';
import { MonthSelector, currentMonth, type SelectedMonth } from '@/components/shared/MonthSelector';
import type { Area, MonitoredItem, MonitoringType, Reading } from '@/types';

const TYPE_LABELS: Record<MonitoringType, string> = {
  hidrometro: 'Hidrômetro',
  pluviometro: 'Pluviômetro',
  corrego: 'Córrego',
};

export function ItemDetailPage() {
  const { itemId } = useParams<{ itemId: string }>();
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

  const item = useMemo(() => items.find((i) => i.id === itemId), [items, itemId]);
  const area = useMemo(() => areas.find((a) => a.id === item?.areaId), [areas, item]);
  const itemReadings = useMemo(() => readings.filter((r) => r.itemId === itemId), [readings, itemId]);
  const pluviometro = useMemo(
    () => (item ? items.find((i) => i.areaId === item.areaId && i.type === 'pluviometro' && !i.disabled) : undefined),
    [items, item],
  );
  const pluviometroReadings = useMemo(
    () => (pluviometro ? readings.filter((r) => r.itemId === pluviometro.id) : []),
    [readings, pluviometro],
  );

  const handleReadingUpdated = useCallback((updated: Reading) => {
    setReadings((rs) => rs.map((r) => (r.id === updated.id ? updated : r)));
  }, []);

  return (
    <PageShell>
      <Link
        to="/areas"
        style={{ display: 'inline-block', marginBottom: 16, font: '600 12.5px var(--font-sans)', color: 'var(--color-text-muted)', textDecoration: 'none' }}
      >
        ‹ Áreas
      </Link>

      {loading && <p style={{ font: '400 13px var(--font-sans)', color: 'var(--color-text-muted)' }}>Carregando…</p>}
      {error && <p style={{ font: '400 13px var(--font-sans)', color: 'var(--color-danger-text)' }}>{error}</p>}
      {!loading && !error && !item && (
        <p style={{ font: '400 13px var(--font-sans)', color: 'var(--color-text-muted)' }}>Item não encontrado.</p>
      )}

      {!loading && !error && item && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <h1 style={{ margin: 0, font: '600 19px var(--font-sans)', color: 'var(--color-text)' }}>{item.name}</h1>
                <Badge variant="info">{TYPE_LABELS[item.type]}</Badge>
                {item.disabled && <Badge variant="disabled">Desativado</Badge>}
              </div>
              {area && <span style={{ font: '400 12.5px var(--font-sans)', color: 'var(--color-text-faint)' }}>{area.name}</span>}
              <DurhOutorgaInfo item={item} />
            </div>
            <MonthSelector value={selectedMonth} onChange={setSelectedMonth} />
          </div>

          {item.type === 'hidrometro' && (
            <HidrometroDetail
              key={item.id}
              item={item}
              readings={itemReadings}
              selectedMonth={selectedMonth}
              onReadingUpdated={handleReadingUpdated}
              pluviometro={pluviometro}
              pluviometroReadings={pluviometroReadings}
            />
          )}
          {item.type === 'pluviometro' && <PluviometroDetail key={item.id} readings={itemReadings} selectedMonth={selectedMonth} />}
          {item.type === 'corrego' && <CorregoDetail key={item.id} item={item} readings={itemReadings} selectedMonth={selectedMonth} />}
        </div>
      )}
    </PageShell>
  );
}
