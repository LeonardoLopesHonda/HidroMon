import { useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { StatTile } from '@/components/item-detail/StatTile';
import { ReadingHistoryTable, type ReadingHistoryColumn } from '@/components/item-detail/ReadingHistoryTable';
import { HorimetroCell } from '@/components/item-detail/HorimetroCell';
import { useHorimetroEditBuffer } from '@/components/item-detail/useHorimetroEditBuffer';
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

export function HidrometroDetail({
  item,
  readings,
  selectedMonth,
  onReadingUpdated,
}: {
  item: MonitoredItem;
  readings: Reading[];
  selectedMonth: SelectedMonth;
  onReadingUpdated: (updated: Reading) => void;
}) {
  const { year, month } = selectedMonth;
  const stats = hidrometroMonthStats(item, readings, year, month, todayISO());
  const ratio = stats.cap > 0 ? stats.monthToDateConsumption / stats.cap : null;

  const [onlyMissingHours, setOnlyMissingHours] = useState(false);
  const [saving, setSaving] = useState(false);
  const editBuffer = useHorimetroEditBuffer(onReadingUpdated);

  const rows = onlyMissingHours ? stats.monthReadings.filter((r) => r.values.horimetro == null) : stats.monthReadings;
  const pendingCount = stats.monthReadings.filter((r) => editBuffer.isDirty(r)).length;

  const handleSave = async () => {
    setSaving(true);
    try {
      // Full item history, not just the selected month — a reading's nearest
      // hours-bearing neighbor can fall in an adjacent month.
      await editBuffer.save(readings);
    } finally {
      setSaving(false);
    }
  };

  const columns: ReadingHistoryColumn[] = [
    { key: 'valor', header: 'Leitura (m³)', cell: (r) => (r.values.valor != null ? formatNumberBR(r.values.valor) : '—') },
    {
      key: 'horimetro',
      header: 'Horímetro (h)',
      cell: item.hasHorimetro
        ? (r) => <HorimetroCell state={editBuffer.getState(r)} onChange={(value) => editBuffer.setDraft(r.id, value)} />
        : (r) => (r.values.horimetro != null ? formatNumberBR(r.values.horimetro) : '—'),
    },
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

      {item.hasHorimetro && (
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, font: '400 12.5px var(--font-sans)', color: 'var(--color-text-muted)' }}>
          <input type="checkbox" checked={onlyMissingHours} onChange={(e) => setOnlyMissingHours(e.target.checked)} />
          Somente sem horas
        </label>
      )}

      <ReadingHistoryTable
        columns={columns}
        rows={rows}
        footer={
          item.hasHorimetro ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ font: '400 12px var(--font-sans)', color: 'var(--color-text-faint)' }}>
                {pendingCount > 0 ? `${pendingCount} ${pendingCount === 1 ? 'alteração pendente' : 'alterações pendentes'}` : 'Nenhuma alteração pendente'}
              </span>
              <button
                type="button"
                onClick={handleSave}
                disabled={pendingCount === 0 || saving}
                style={{
                  padding: '7px 16px',
                  borderRadius: 8,
                  border: 'none',
                  background: 'var(--color-accent)',
                  color: '#fff',
                  font: '600 12.5px var(--font-sans)',
                  opacity: pendingCount === 0 || saving ? 0.5 : 1,
                  cursor: pendingCount === 0 || saving ? 'default' : 'pointer',
                }}
              >
                {saving ? 'Salvando…' : 'Salvar'}
              </button>
            </div>
          ) : undefined
        }
      />
    </div>
  );
}
