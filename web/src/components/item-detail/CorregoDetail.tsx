import { Badge } from '@/components/ui/Badge';
import { ReadingHistoryTable, type ReadingHistoryColumn } from '@/components/item-detail/ReadingHistoryTable';
import { NivelChart, type NivelPoint } from '@/components/item-detail/charts/NivelChart';
import { VazaoCorregoChart, type VazaoCorregoPoint } from '@/components/item-detail/charts/VazaoCorregoChart';
import { sectionStyle, sectionTitleStyle } from '@/components/item-detail/sectionStyles';
import type { SelectedMonth } from '@/components/shared/MonthSelector';
import { isInMonth } from '@/lib/metrics';
import { formatNumberBR } from '@/lib/format';
import type { MonitoredItem, Reading } from '@/types';

const METHOD_LABEL: Record<'regua' | 'tambor', string> = {
  regua: 'Régua',
  tambor: 'Tambor',
};

export function CorregoDetail({ item, readings, selectedMonth }: { item: MonitoredItem; readings: Reading[]; selectedMonth: SelectedMonth }) {
  const { year, month } = selectedMonth;
  const monthReadings = readings.filter((r) => isInMonth(r.date, year, month));

  const nivelPoints: NivelPoint[] = monthReadings
    .filter((r) => r.values.nivel != null)
    .map((r) => ({ date: r.date, nivel: r.values.nivel! }))
    .sort((a, b) => (a.date < b.date ? -1 : 1));

  const vazaoPoints: VazaoCorregoPoint[] = monthReadings
    .filter((r) => r.values.vazao != null)
    .map((r) => ({ date: r.date, vazao: r.values.vazao! }))
    .sort((a, b) => (a.date < b.date ? -1 : 1));

  const isTambor = item.corregoMethod === 'tambor';
  const columns: ReadingHistoryColumn[] = isTambor
    ? [
        { key: 't1', header: 't1 (s)', cell: (r) => (r.values.t1 != null ? formatNumberBR(r.values.t1) : '—') },
        { key: 't2', header: 't2 (s)', cell: (r) => (r.values.t2 != null ? formatNumberBR(r.values.t2) : '—') },
        { key: 't3', header: 't3 (s)', cell: (r) => (r.values.t3 != null ? formatNumberBR(r.values.t3) : '—') },
        { key: 'vazao', header: 'Vazão (m³/s)', cell: (r) => (r.values.vazao != null ? formatNumberBR(r.values.vazao) : '—') },
        { key: 'observacoes', header: 'Observações', cell: (r) => r.observacoes ?? '—' },
      ]
    : [
        { key: 'nivel', header: 'Nível (m)', cell: (r) => (r.values.nivel != null ? formatNumberBR(r.values.nivel) : '—') },
        { key: 'vazao', header: 'Vazão (m³/s)', cell: (r) => (r.values.vazao != null ? formatNumberBR(r.values.vazao) : '—') },
        { key: 'observacoes', header: 'Observações', cell: (r) => r.observacoes ?? '—' },
      ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={sectionStyle}>
        <Badge variant="info">Método: {item.corregoMethod != null ? METHOD_LABEL[item.corregoMethod] : '—'}</Badge>
      </div>

      <div style={sectionStyle}>
        <h3 style={sectionTitleStyle}>Nível</h3>
        <NivelChart points={nivelPoints} />
      </div>

      <div style={sectionStyle}>
        <h3 style={sectionTitleStyle}>Vazão</h3>
        <VazaoCorregoChart points={vazaoPoints} />
      </div>

      <ReadingHistoryTable columns={columns} rows={monthReadings} />
    </div>
  );
}
