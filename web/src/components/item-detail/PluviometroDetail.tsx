import { StatTile } from '@/components/item-detail/StatTile';
import { InfoPopover } from '@/components/ui/InfoPopover';
import { ReadingHistoryTable, type ReadingHistoryColumn } from '@/components/item-detail/ReadingHistoryTable';
import { PrecipitationBarChart } from '@/components/item-detail/charts/PrecipitationBarChart';
import { YearlyPrecipitationSummary } from '@/components/item-detail/charts/YearlyPrecipitationSummary';
import { ComparativoMensalExplanation } from '@/components/item-detail/chartExplanations';
import { sectionStyle, sectionTitleStyle } from '@/components/item-detail/sectionStyles';
import type { SelectedMonth } from '@/components/shared/MonthSelector';
import { dailyPrecipitationPoints, isInMonth, monthlyPrecipitationMax } from '@/lib/metrics';
import { formatNumberBR } from '@/lib/format';
import type { Reading } from '@/types';

export function PluviometroDetail({ readings, selectedMonth }: { readings: Reading[]; selectedMonth: SelectedMonth }) {
  const { year, month } = selectedMonth;
  const monthReadings = readings.filter((r) => isInMonth(r.date, year, month));

  const yearlyMax = monthlyPrecipitationMax(readings, year);
  const monthMax = yearlyMax.find((p) => p.month === month) ?? { maxMm: 0, hasData: false };

  const dailyPoints = dailyPrecipitationPoints(readings, year, month);

  const columns: ReadingHistoryColumn[] = [
    { key: 'valor', header: 'Precipitação (mm)', cell: (r) => (r.values.valor != null ? formatNumberBR(r.values.valor) : '—') },
    { key: 'observacoes', header: 'Observações', cell: (r) => r.observacoes ?? '—' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={sectionStyle}>
        <StatTile label="Máximo do mês" value={monthMax.hasData ? `${formatNumberBR(monthMax.maxMm)} mm` : '—'} />
      </div>

      <div style={sectionStyle}>
        <h3 style={sectionTitleStyle}>Precipitação diária</h3>
        <PrecipitationBarChart points={dailyPoints} />
      </div>

      <div style={sectionStyle}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <h3 style={{ ...sectionTitleStyle, margin: 0 }}>Máximas mensais ({year})</h3>
          <InfoPopover label="Como as máximas mensais são calculadas">
            <ComparativoMensalExplanation />
          </InfoPopover>
        </span>
        <YearlyPrecipitationSummary points={yearlyMax} selectedMonth={month} />
      </div>

      <ReadingHistoryTable columns={columns} rows={monthReadings} />
    </div>
  );
}
