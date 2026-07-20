import { Badge } from '@/components/ui/Badge';
import { StatTile } from '@/components/item-detail/StatTile';
import { ReadingHistoryTable, type ReadingHistoryColumn } from '@/components/item-detail/ReadingHistoryTable';
import { TaxaDiariaChart } from '@/components/item-detail/charts/TaxaDiariaChart';
import { VazaoMediaChart } from '@/components/item-detail/charts/VazaoMediaChart';
import { CumulativeConsumptionChart } from '@/components/item-detail/charts/CumulativeConsumptionChart';
import type { SelectedMonth } from '@/components/shared/MonthSelector';
import {
  dailyRate,
  daysElapsedInMonth,
  exceedanceChecks,
  horasOperadas,
  isInMonth,
  measuredHoursPerDay,
  monthEndProjection,
  monthlyCap,
  monthlyConsumption,
  nextMonthStartISO,
  vazaoMediaOutorga,
} from '@/lib/metrics';
import { formatNumberBR, formatPercentBR } from '@/lib/format';
import type { MonitoredItem, Reading } from '@/types';

const STATE_LABEL: Record<'within' | 'projected-over' | 'over', string> = {
  within: 'Dentro da outorga',
  'projected-over': 'Projeção acima da outorga',
  over: 'Consumo acima da outorga',
};

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

export function HidrometroDetail({ item, readings, selectedMonth }: { item: MonitoredItem; readings: Reading[]; selectedMonth: SelectedMonth }) {
  const { year, month } = selectedMonth;

  const today = new Date();
  const todayISO = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const daysElapsed = daysElapsedInMonth(year, month, todayISO);
  const monthBoundary = nextMonthStartISO(year, month);
  const readingsUpToMonth = readings.filter((r) => r.date < monthBoundary);
  const monthReadings = readings.filter((r) => isInMonth(r.date, year, month));

  const monthToDateConsumption = monthlyConsumption(readings, year, month);
  const cap = monthlyCap(item);
  const projection = monthEndProjection(monthToDateConsumption, daysElapsed);
  const ratio = cap > 0 ? monthToDateConsumption / cap : null;

  const rateSeries = dailyRate(readingsUpToMonth).filter((p) => isInMonth(p.date, year, month));
  const latestDailyRate = rateSeries.length > 0 ? rateSeries[rateSeries.length - 1].rate : null;
  const dailyCap = item.limiteOutorgado != null ? item.limiteOutorgado * item.horasOperacao : 0;
  const latestVazaoMedia = latestDailyRate != null ? vazaoMediaOutorga(latestDailyRate, item.horasOperacao) : null;

  const hoursPerDaySeries = item.hasHorimetro
    ? measuredHoursPerDay(readingsUpToMonth).filter((p) => isInMonth(p.date, year, month))
    : [];
  const latestHoursPerDay = hoursPerDaySeries.length > 0 ? hoursPerDaySeries[hoursPerDaySeries.length - 1].hoursPerDay : null;

  const checks = exceedanceChecks({
    monthToDateConsumption,
    cap,
    projection,
    latestDailyRate,
    dailyCap,
    measuredHoursPerDay: latestHoursPerDay,
    horasOperacao: item.horasOperacao,
  });

  const monthHoras = item.hasHorimetro ? horasOperadas(readings, year, month) : null;

  const columns: ReadingHistoryColumn[] = [
    { key: 'valor', header: 'Leitura (m³)', cell: (r) => (r.values.valor != null ? formatNumberBR(r.values.valor) : '—') },
    { key: 'horimetro', header: 'Horímetro (h)', cell: (r) => (r.values.horimetro != null ? formatNumberBR(r.values.horimetro) : '—') },
    { key: 'observacoes', header: 'Observações', cell: (r) => r.observacoes ?? '—' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={sectionStyle}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <span style={{ font: '600 13px var(--font-sans)', color: 'var(--color-text)' }}>{STATE_LABEL[checks.cardState]}</span>
          {(checks.dailyRateOver || checks.hoursOver) && (
            <div style={{ display: 'flex', gap: 6 }}>
              {checks.dailyRateOver && <Badge variant="warn">Taxa diária acima do limite</Badge>}
              {checks.hoursOver && <Badge variant="warn">Horas medidas acima de {formatNumberBR(item.horasOperacao)} h/dia</Badge>}
            </div>
          )}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 20 }}>
          <StatTile label="Consumo do mês" value={`${formatNumberBR(monthToDateConsumption)} m³`} />
          <StatTile label="% da outorga" value={ratio != null ? formatPercentBR(ratio) : '—'} />
          <StatTile
            label="Projeção"
            value={`${formatNumberBR(projection)} m³`}
            hint={cap > 0 ? `${formatPercentBR(projection / cap)} da outorga` : undefined}
          />
          <StatTile label="Vazão média" value={latestVazaoMedia != null ? `${formatNumberBR(latestVazaoMedia)} m³/h` : '—'} />
          {monthHoras != null && <StatTile label="Horas operadas" value={`${formatNumberBR(monthHoras)} h`} />}
        </div>
      </div>

      <div style={sectionStyle}>
        <h3 style={sectionTitleStyle}>Taxa diária</h3>
        <TaxaDiariaChart readingsUpToMonth={readingsUpToMonth} year={year} month={month} dailyCap={dailyCap} />
      </div>

      <div style={sectionStyle}>
        <h3 style={sectionTitleStyle}>Vazão</h3>
        <VazaoMediaChart readingsUpToMonth={readingsUpToMonth} year={year} month={month} item={item} />
      </div>

      <div style={sectionStyle}>
        <h3 style={sectionTitleStyle}>Consumo acumulado</h3>
        <CumulativeConsumptionChart readings={readings} year={year} month={month} cap={cap} />
      </div>

      <ReadingHistoryTable columns={columns} rows={monthReadings} />
    </div>
  );
}
