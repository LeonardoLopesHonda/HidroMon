import { StatTile } from '@/components/item-detail/StatTile';
import { ReadingHistoryTable, type ReadingHistoryColumn } from '@/components/item-detail/ReadingHistoryTable';
import { PrecipitationBarChart, type PrecipitationPoint } from '@/components/item-detail/charts/PrecipitationBarChart';
import { YearlyPrecipitationSummary } from '@/components/item-detail/charts/YearlyPrecipitationSummary';
import { sectionStyle, sectionTitleStyle } from '@/components/item-detail/sectionStyles';
import type { SelectedMonth } from '@/components/shared/MonthSelector';
import { isInMonth, monthlyPrecipitationTotals } from '@/lib/metrics';
import { formatNumberBR } from '@/lib/format';
import type { Reading } from '@/types';

export function PluviometroDetail({ readings, selectedMonth }: { readings: Reading[]; selectedMonth: SelectedMonth }) {
  const { year, month } = selectedMonth;
  const monthReadings = readings.filter((r) => isInMonth(r.date, year, month));
  const monthTotalMm = monthReadings.reduce((sum, r) => sum + (r.values.valor ?? 0), 0);

  const dailyPoints: PrecipitationPoint[] = monthReadings
    .filter((r) => r.values.valor != null)
    .map((r) => ({ date: r.date, mm: r.values.valor! }))
    .sort((a, b) => (a.date < b.date ? -1 : 1));

  const yearlyTotals = monthlyPrecipitationTotals(readings, year);

  const columns: ReadingHistoryColumn[] = [
    { key: 'mm', header: 'Precipitação (mm)', cell: (r) => (r.values.valor != null ? formatNumberBR(r.values.valor) : '—') },
    { key: 'observacoes', header: 'Observações', cell: (r) => r.observacoes ?? '—' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={sectionStyle}>
        <StatTile label="Total do mês" value={`${formatNumberBR(monthTotalMm)} mm`} />
      </div>

      <div style={sectionStyle}>
        <h3 style={sectionTitleStyle}>Precipitação diária</h3>
        <PrecipitationBarChart points={dailyPoints} />
      </div>

      <div style={sectionStyle}>
        <h3 style={sectionTitleStyle}>Comparativo mensal ({year})</h3>
        <YearlyPrecipitationSummary points={yearlyTotals} selectedMonth={month} />
      </div>

      <ReadingHistoryTable columns={columns} rows={monthReadings} />
    </div>
  );
}
