import { useMemo, useState, type CSSProperties } from 'react';
import { StatTile } from '@/components/item-detail/StatTile';
import { InfoPopover } from '@/components/ui/InfoPopover';
import { ReadingHistoryTable, type ReadingHistoryColumn } from '@/components/item-detail/ReadingHistoryTable';
import { NumericCell } from '@/components/item-detail/NumericCell';
import { usePluviometroEditBuffer, type GridRow } from '@/components/item-detail/usePluviometroEditBuffer';
import { PrecipitationBarChart } from '@/components/item-detail/charts/PrecipitationBarChart';
import { YearlyPrecipitationSummary } from '@/components/item-detail/charts/YearlyPrecipitationSummary';
import { ComparativoMensalExplanation } from '@/components/item-detail/chartExplanations';
import { sectionStyle, sectionTitleStyle } from '@/components/item-detail/sectionStyles';
import type { SelectedMonth } from '@/components/shared/MonthSelector';
import { dailyPrecipitationPoints, isInMonth, missingDailyDates, monthlyPrecipitationMax } from '@/lib/metrics';
import { formatNumberBR } from '@/lib/format';
import type { Reading } from '@/types';

function todayISO(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

const GHOST_ID_PREFIX = 'ghost:';

/** A placeholder `Reading` for an expected-but-missing day, so it can flow through the same table/sort as real rows. */
function ghostReading(itemId: string, date: string): Reading {
  return { id: `${GHOST_ID_PREFIX}${date}`, itemId, date, recordedAt: '', values: {}, observacoes: null, createdBy: '', createdAt: '', updatedAt: '' };
}

function isGhost(r: Reading): boolean {
  return r.id.startsWith(GHOST_ID_PREFIX);
}

function toGridRow(r: Reading): GridRow {
  return isGhost(r) ? { kind: 'ghost', date: r.date } : { kind: 'existing', reading: r };
}

const ghostRowStyle: CSSProperties = { opacity: 0.6 };

const ghostAddButtonStyle: CSSProperties = {
  width: 28,
  height: 28,
  borderRadius: 6,
  border: '1px dashed var(--color-border-input)',
  background: 'transparent',
  color: 'var(--color-text-faint)',
  font: '600 14px var(--font-sans)',
  cursor: 'pointer',
  lineHeight: 1,
};

const observacoesInputStyle: CSSProperties = {
  width: 160,
  padding: '4px 8px',
  borderRadius: 6,
  border: '1px solid var(--color-border-input)',
  background: 'transparent',
  font: '400 12.5px var(--font-sans)',
  color: 'var(--color-text)',
};

export function PluviometroDetail({
  itemId,
  readings,
  selectedMonth,
  onReadingUpdated,
}: {
  itemId: string;
  readings: Reading[];
  selectedMonth: SelectedMonth;
  onReadingUpdated: (updated: Reading) => void;
}) {
  const { year, month } = selectedMonth;
  const today = todayISO();
  const monthReadings = readings.filter((r) => isInMonth(r.date, year, month));

  const [saving, setSaving] = useState(false);
  const editBuffer = usePluviometroEditBuffer(itemId, onReadingUpdated);

  const yearlyMax = monthlyPrecipitationMax(readings, year);
  const monthMax = yearlyMax.find((p) => p.month === month) ?? { maxMm: 0, hasData: false };

  const dailyPoints = dailyPrecipitationPoints(readings, year, month);

  // Ghost rows only cover the currently visible month, same reasoning as Hidrômetro's grid.
  const ghostRows = useMemo(
    () => missingDailyDates(readings, year, month, today).map((date) => ghostReading(itemId, date)),
    [readings, year, month, today, itemId]
  );

  const displayRows = [...monthReadings, ...ghostRows];

  const saveCandidates: GridRow[] = [...readings, ...ghostRows].map(toGridRow);
  const pendingCount = saveCandidates.filter(editBuffer.isDirty).length;

  const handleSave = async () => {
    setSaving(true);
    try {
      await editBuffer.save(saveCandidates);
    } finally {
      setSaving(false);
    }
  };

  const columns: ReadingHistoryColumn[] = [
    {
      key: 'valor',
      header: 'Precipitação (mm)',
      cell: (r) => {
        const row = toGridRow(r);
        if (isGhost(r) && !editBuffer.isActivated(row)) {
          return (
            <button type="button" onClick={() => editBuffer.activateGhost(r.date)} title="Adicionar leitura" style={ghostAddButtonStyle}>
              +
            </button>
          );
        }
        const state = editBuffer.getState(row);
        return <NumericCell draft={state.valorDraft} status={state.status} error={state.error} onChange={(v) => editBuffer.setValorDraft(row, v)} />;
      },
    },
    {
      key: 'observacoes',
      header: 'Observações',
      cell: (r) => {
        if (!isGhost(r)) return r.observacoes ?? '—';
        const row = toGridRow(r);
        if (!editBuffer.isActivated(row)) return '—';
        const state = editBuffer.getState(row);
        return (
          <input
            type="text"
            value={state.observacoesDraft}
            onChange={(e) => editBuffer.setObservacoesDraft(row, e.target.value)}
            disabled={state.status === 'saving'}
            placeholder="—"
            style={observacoesInputStyle}
          />
        );
      },
    },
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

      <ReadingHistoryTable
        columns={columns}
        rows={displayRows}
        rowStyle={(r) => (isGhost(r) ? ghostRowStyle : undefined)}
        footer={
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
        }
      />
    </div>
  );
}
