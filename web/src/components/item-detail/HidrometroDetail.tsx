import { Badge } from '@/components/ui/Badge';
import { StatTile } from '@/components/item-detail/StatTile';
import { ReadingHistoryTable, type ReadingHistoryColumn } from '@/components/item-detail/ReadingHistoryTable';
import { TaxaDiariaChart } from '@/components/item-detail/charts/TaxaDiariaChart';
import { VazaoMediaChart } from '@/components/item-detail/charts/VazaoMediaChart';
import { CumulativeConsumptionChart } from '@/components/item-detail/charts/CumulativeConsumptionChart';
import { STATE_LABEL } from '@/components/overview/ComplianceCard';
import type { SelectedMonth } from '@/components/shared/MonthSelector';
import { hidrometroMonthStats } from '@/lib/metrics';
import { formatNumberBR, formatPercentBR } from '@/lib/format';
import type { MonitoredItem, Reading } from '@/types';

const sectionStyle = {
  background: 'var(--color-surface)',
  border: '1px solid var(--color-border)',
  borderRadius: 10,
  padding: '18px 20px',
};

const sectionTitleStyle = {
  margin: '0 0 14px',
  font: '600 13px var(--font-sans)',
  color: 'var(--color-text)',
};

function todayISO(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export function HidrometroDetail({ item, readings, selectedMonth }: { item: MonitoredItem; readings: Reading[]; selectedMonth: SelectedMonth }) {
  const { year, month } = selectedMonth;
  const stats = hidrometroMonthStats(item, readings, year, month, todayISO());
  const ratio = stats.cap > 0 ? stats.monthToDateConsumption / stats.cap : null;

  const columns: ReadingHistoryColumn[] = [
    { key: 'valor', header: 'Leitura (m³)', cell: (r) => (r.values.valor != null ? formatNumberBR(r.values.valor) : '—') },
    { key: 'horimetro', header: 'Horímetro (h)', cell: (r) => (r.values.horimetro != null ? formatNumberBR(r.values.horimetro) : '—') },
    { key: 'observacoes', header: 'Observações', cell: (r) => r.observacoes ?? '—' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={sectionStyle}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <span style={{ font: '600 13px var(--font-sans)', color: 'var(--color-text)' }}>{STATE_LABEL[stats.checks.cardState]}</span>
          {(stats.checks.dailyRateOver || stats.checks.hoursOver) && (
            <div style={{ display: 'flex', gap: 6 }}>
              {stats.checks.dailyRateOver && <Badge variant="warn">Taxa diária acima do limite</Badge>}
              {stats.checks.hoursOver && <Badge variant="warn">Horas medidas acima de {formatNumberBR(item.horasOperacao)} h/dia</Badge>}
            </div>
          )}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 20 }}>
          <StatTile label="Consumo do mês" value={`${formatNumberBR(stats.monthToDateConsumption)} m³`} />
          <StatTile label="% da outorga" value={ratio != null ? formatPercentBR(ratio) : '—'} />
          <StatTile
            label="Projeção"
            value={`${formatNumberBR(stats.projection)} m³`}
            hint={stats.cap > 0 ? `${formatPercentBR(stats.projection / stats.cap)} da outorga` : undefined}
          />
          <StatTile label="Vazão média" value={stats.latestVazaoMedia != null ? `${formatNumberBR(stats.latestVazaoMedia)} m³/h` : '—'} />
          {stats.monthHoras != null && <StatTile label="Horas operadas" value={`${formatNumberBR(stats.monthHoras)} h`} />}
        </div>
      </div>

      <div style={sectionStyle}>
        <h3 style={sectionTitleStyle}>Taxa diária</h3>
        <TaxaDiariaChart points={stats.rateSeries} dailyCap={stats.dailyCap} />
      </div>

      <div style={sectionStyle}>
        <h3 style={sectionTitleStyle}>Vazão</h3>
        <VazaoMediaChart vazaoMediaSeries={stats.vazaoMediaSeries} vazaoEfetivaSeries={stats.vazaoEfetivaSeries} limiteOutorgado={item.limiteOutorgado} />
      </div>

      <div style={sectionStyle}>
        <h3 style={sectionTitleStyle}>Consumo acumulado</h3>
        <CumulativeConsumptionChart readings={readings} year={year} month={month} cap={stats.cap} />
      </div>

      <ReadingHistoryTable columns={columns} rows={stats.monthReadings} />
    </div>
  );
}
