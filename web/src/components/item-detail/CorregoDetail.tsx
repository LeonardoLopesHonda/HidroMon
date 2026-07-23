import { useMemo, useState, type CSSProperties } from 'react';
import { Badge } from '@/components/ui/Badge';
import { InfoPopover } from '@/components/ui/InfoPopover';
import { ReadingHistoryTable, type ReadingHistoryColumn } from '@/components/item-detail/ReadingHistoryTable';
import { NumericCell } from '@/components/item-detail/NumericCell';
import { useCorregoEditBuffer, type GridRow } from '@/components/item-detail/useCorregoEditBuffer';
import { SingleSeriesLineChart } from '@/components/item-detail/charts/SingleSeriesLineChart';
import { VazaoCorregoExplanation } from '@/components/item-detail/chartExplanations';
import { sectionStyle, sectionTitleStyle } from '@/components/item-detail/sectionStyles';
import type { SelectedMonth } from '@/components/shared/MonthSelector';
import { isInMonth, missingDailyDates, missingWeeklyDates, sortByDateAndRecordedAt } from '@/lib/metrics';
import { formatNumberBR } from '@/lib/format';
import type { Area, MonitoredItem, Reading } from '@/types';

const METHOD_LABEL: Record<'regua' | 'tambor', string> = {
  regua: 'Régua',
  tambor: 'Tambor',
};

function todayISO(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

const GHOST_ID_PREFIX = 'ghost:';

/** A placeholder `Reading` for an expected-but-missing day/week, so it can flow through the same table/sort as real rows. */
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

export function CorregoDetail({
  item,
  area,
  readings,
  selectedMonth,
  onReadingUpdated,
}: {
  item: MonitoredItem;
  area?: Area;
  readings: Reading[];
  selectedMonth: SelectedMonth;
  onReadingUpdated: (updated: Reading) => void;
}) {
  const { year, month } = selectedMonth;
  const today = todayISO();
  const monthReadings = readings.filter((r) => isInMonth(r.date, year, month));

  const [saving, setSaving] = useState(false);
  const editBuffer = useCorregoEditBuffer(item.id, item.corregoMethod, onReadingUpdated);

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

  // Ghost cadence follows the Área, not the monitoring type (CONTEXT.md's design
  // decision for diasSemLeitura) — weekly Áreas get one ghost per missing Mon–Sun
  // week, daily Áreas get the same per-day ghosts as Hidrômetro/Pluviômetro.
  const ghostRows = useMemo(() => {
    const missing = area?.frequency === 'weekly' ? missingWeeklyDates(readings, year, month, today) : missingDailyDates(readings, year, month, today);
    return missing.map((date) => ghostReading(item.id, date));
  }, [readings, year, month, today, item.id, area?.frequency]);

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

  const valueColumns: ReadingHistoryColumn[] = isTambor
    ? [
        {
          key: 't1',
          header: 't1 (s)',
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
            return <NumericCell draft={state.t1Draft} status={state.status} error={state.error} onChange={(v) => editBuffer.setT1Draft(row, v)} />;
          },
        },
        {
          key: 't2',
          header: 't2 (s)',
          cell: (r) => {
            const row = toGridRow(r);
            if (isGhost(r) && !editBuffer.isActivated(row)) return '—';
            const state = editBuffer.getState(row);
            return <NumericCell draft={state.t2Draft} status={state.status} error={undefined} onChange={(v) => editBuffer.setT2Draft(row, v)} />;
          },
        },
        {
          key: 't3',
          header: 't3 (s)',
          cell: (r) => {
            const row = toGridRow(r);
            if (isGhost(r) && !editBuffer.isActivated(row)) return '—';
            const state = editBuffer.getState(row);
            return <NumericCell draft={state.t3Draft} status={state.status} error={undefined} onChange={(v) => editBuffer.setT3Draft(row, v)} />;
          },
        },
        { key: 'vazao', header: 'Vazão (m³/s)', cell: (r) => (r.values.vazao != null ? formatNumberBR(r.values.vazao) : '—') },
      ]
    : [
        {
          key: 'nivel',
          header: 'Nível (m)',
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
            return <NumericCell draft={state.nivelDraft} status={state.status} error={state.error} onChange={(v) => editBuffer.setNivelDraft(row, v)} />;
          },
        },
        { key: 'vazao', header: 'Vazão (m³/s)', cell: (r) => (r.values.vazao != null ? formatNumberBR(r.values.vazao) : '—') },
      ];

  const columns: ReadingHistoryColumn[] = [
    ...valueColumns,
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
