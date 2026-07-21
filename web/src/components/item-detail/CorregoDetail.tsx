import { Badge } from '@/components/ui/Badge';
import { InfoPopover } from '@/components/ui/InfoPopover';
import { ReadingHistoryTable, type ReadingHistoryColumn } from '@/components/item-detail/ReadingHistoryTable';
import { SingleSeriesLineChart } from '@/components/item-detail/charts/SingleSeriesLineChart';
import { VazaoCorregoExplanation } from '@/components/item-detail/chartExplanations';
import { sectionStyle, sectionTitleStyle } from '@/components/item-detail/sectionStyles';
import type { SelectedMonth } from '@/components/shared/MonthSelector';
import { isInMonth, sortByDateAndRecordedAt } from '@/lib/metrics';
import { formatNumberBR } from '@/lib/format';
import type { MonitoredItem, Reading } from '@/types';

const METHOD_LABEL: Record<'regua' | 'tambor', string> = {
  regua: 'Régua',
  tambor: 'Tambor',
};

export function CorregoDetail({ item, readings, selectedMonth }: { item: MonitoredItem; readings: Reading[]; selectedMonth: SelectedMonth }) {
  const { year, month } = selectedMonth;
  const monthReadings = readings.filter((r) => isInMonth(r.date, year, month));

  // Tambor doesn't capture nível at all (CONTEXT.md → Reading Derivations) — the
  // chart section is omitted entirely rather than always shown empty.
  const isTambor = item.corregoMethod === 'tambor';

  const nivelPoints = sortByDateAndRecordedAt(monthReadings.filter((r) => r.values.nivel != null)).map((r) => ({
    date: r.date,
    value: r.values.nivel!,
  }));
  const vazaoPoints = sortByDateAndRecordedAt(monthReadings.filter((r) => r.values.vazao != null)).map((r) => ({
    date: r.date,
    value: r.values.vazao!,
  }));

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

      {!isTambor && (
        <div style={sectionStyle}>
          <h3 style={sectionTitleStyle}>Nível</h3>
          <SingleSeriesLineChart
            points={nivelPoints}
            label="Nível"
            unit="m"
            color="var(--color-info-text)"
            emptyMessage="Sem leituras de nível no período."
          />
        </div>
      )}

      <div style={sectionStyle}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <h3 style={{ ...sectionTitleStyle, margin: 0 }}>Vazão</h3>
          <InfoPopover label="Como a vazão é calculada">
            <VazaoCorregoExplanation method={item.corregoMethod} />
          </InfoPopover>
        </span>
        <SingleSeriesLineChart
          points={vazaoPoints}
          label="Vazão"
          unit="m³/s"
          color="var(--color-accent)"
          emptyMessage="Sem leituras de vazão no período."
        />
      </div>

      <ReadingHistoryTable columns={columns} rows={monthReadings} />
    </div>
  );
}
