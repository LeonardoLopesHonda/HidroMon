import type { MonitoredItem } from '@/types';

type DurhFields = Pick<MonitoredItem, 'durhNumber' | 'outorgaNumber' | 'barramentoDurh'>;

export function DurhOutorgaInfo({ item }: { item: DurhFields }) {
  if (item.durhNumber == null && item.outorgaNumber == null && item.barramentoDurh == null) return null;

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, font: '500 12px var(--font-mono)', color: 'var(--color-text-muted)' }}>
      {item.durhNumber != null && <span>DURH: {item.durhNumber}</span>}
      {item.outorgaNumber != null && <span>Outorga: {item.outorgaNumber}</span>}
      {item.barramentoDurh != null && <span>Barramento DURH: {item.barramentoDurh}</span>}
    </div>
  );
}
