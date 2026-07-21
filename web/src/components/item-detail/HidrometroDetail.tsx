import { useMemo, useState, type CSSProperties } from 'react';
import { Badge } from '@/components/ui/Badge';
import { ImasulReportDialog } from '@/components/item-detail/ImasulReportDialog';
import { StatTile } from '@/components/item-detail/StatTile';
import { ReadingHistoryTable, type ReadingHistoryColumn } from '@/components/item-detail/ReadingHistoryTable';
import { NumericCell } from '@/components/item-detail/NumericCell';
import { useReadingEditBuffer, type GridRow } from '@/components/item-detail/useReadingEditBuffer';
import { TaxaDiariaChart } from '@/components/item-detail/charts/TaxaDiariaChart';
import { VazaoMediaChart } from '@/components/item-detail/charts/VazaoMediaChart';
import { CumulativeConsumptionChart } from '@/components/item-detail/charts/CumulativeConsumptionChart';
import { STATE_LABEL } from '@/components/overview/ComplianceCard';
import { sectionStyle, sectionTitleStyle } from '@/components/item-detail/sectionStyles';
import type { SelectedMonth } from '@/components/shared/MonthSelector';
import { dailyPrecipitationPoints, hidrometroMonthStats, missingDailyDates } from '@/lib/metrics';
import { formatMaxHint, formatNumberBR, formatPercentBR } from '@/lib/format';
import type { MonitoredItem, Reading } from '@/types';

function todayISO(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

const GHOST_ID_PREFIX = 'ghost:';

/** A placeholder `Reading` for an expected-but-missing day, so it can flow through the same table/sort as real rows. */
function ghostReading(itemId: string, date: string): Reading {
  return {
    id: `${GHOST_ID_PREFIX}${date}`,
    itemId,
    date,
    recordedAt: '',
    values: {},
    observacoes: null,
    createdBy: '',
    createdAt: '',
    updatedAt: '',
  };
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

const ghostBackfillButtonStyle: CSSProperties = {
  ...ghostAddButtonStyle,
  width: 'auto',
  padding: '0 8px',
  font: '600 11px var(--font-sans)',
  color: 'var(--color-text-muted)',
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

export function HidrometroDetail({
  item,
  readings,
  selectedMonth,
  onReadingUpdated,
  pluviometro,
  pluviometroReadings,
}: {
  item: MonitoredItem;
  readings: Reading[];
  selectedMonth: SelectedMonth;
  onReadingUpdated: (updated: Reading) => void;
  pluviometro?: MonitoredItem;
  pluviometroReadings: Reading[];
}) {
  const { year, month } = selectedMonth;
  const today = todayISO();
  const stats = hidrometroMonthStats(item, readings, year, month, today);

  const [onlyMissingHours, setOnlyMissingHours] = useState(false);
  const [saving, setSaving] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [showRain, setShowRain] = useState(false);
  const editBuffer = useReadingEditBuffer(item.id, onReadingUpdated);
  const canGenerateReport = item.durhNumber != null && item.outorgaNumber != null;

  const rainPoints = useMemo(() => dailyPrecipitationPoints(pluviometroReadings, year, month), [pluviometroReadings, year, month]);

  // Ghost rows only cover the currently visible month — matches the table's existing
  // scope (stats.monthReadings), so navigating months never mixes gaps across ranges.
  const ghostRows = useMemo(
    () => missingDailyDates(readings, year, month, today).map((date) => ghostReading(item.id, date)),
    [readings, year, month, today, item.id]
  );

  const displayRows = onlyMissingHours ? stats.monthReadings.filter((r) => r.values.horimetro == null) : [...stats.monthReadings, ...ghostRows];

  // Save candidates span full item history (a pending edit made in a different month
  // must still count and still save) plus this month's ghost rows — a ghost activated
  // in another month view isn't tracked here once that month scrolls out of range.
  const saveCandidates: GridRow[] = [...readings, ...ghostRows].map(toGridRow);
  const pendingCount = saveCandidates.filter(editBuffer.isDirty).length;

  const handleSave = async () => {
    setSaving(true);
    try {
      await editBuffer.save(saveCandidates, readings);
    } finally {
      setSaving(false);
    }
  };

  const columns: ReadingHistoryColumn[] = [
    {
      key: 'valor',
      header: 'Leitura (m³)',
      cell: (r) => {
        const row = toGridRow(r);
        if (isGhost(r) && !editBuffer.isActivated(row)) {
          return (
            <div style={{ display: 'flex', gap: 4 }}>
              <button type="button" onClick={() => editBuffer.activateGhost(r.date)} title="Adicionar leitura" style={ghostAddButtonStyle}>
                +
              </button>
              <button
                type="button"
                onClick={() => editBuffer.backfillGhost(r.date, readings)}
                title="Retroativo: preencher com valor estimado e observação automática (domingo/feriado)"
                style={ghostBackfillButtonStyle}
              >
                Retroativo
              </button>
            </div>
          );
        }
        const state = editBuffer.getState(row);
        return <NumericCell draft={state.valorDraft} status={state.status} error={state.error} onChange={(v) => editBuffer.setValorDraft(row, v)} />;
      },
    },
    {
      key: 'horimetro',
      header: 'Horímetro (h)',
      cell: item.hasHorimetro
        ? (r) => {
            const row = toGridRow(r);
            if (isGhost(r) && !editBuffer.isActivated(row)) return '—';
            const state = editBuffer.getState(row);
            return (
              <NumericCell
                draft={state.horimetroDraft}
                status={state.status}
                error={state.error}
                onChange={(v) => editBuffer.setHorimetroDraft(row, v)}
              />
            );
          }
        : (r) => (!isGhost(r) && r.values.horimetro != null ? formatNumberBR(r.values.horimetro) : '—'),
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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, gap: 12, flexWrap: 'wrap' }}>
          <span style={{ font: '600 13px var(--font-sans)', color: 'var(--color-text)' }}>{STATE_LABEL[stats.checks.cardState]}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            {(stats.checks.dailyRateOver || stats.checks.hoursOver) && (
              <>
                {stats.checks.dailyRateOver && <Badge variant="warn">Taxa diária acima do limite</Badge>}
                {stats.checks.hoursOver && <Badge variant="warn">Horas medidas acima de {formatNumberBR(item.horasOperacao)} h/dia</Badge>}
              </>
            )}
            {canGenerateReport && (
              <button
                type="button"
                onClick={() => setReportOpen(true)}
                style={{
                  padding: '6px 14px',
                  borderRadius: 8,
                  border: '1px solid var(--color-border-input)',
                  background: 'var(--color-surface)',
                  color: 'var(--color-text)',
                  font: '600 12px var(--font-sans)',
                  cursor: 'pointer',
                }}
              >
                Gerar Relatório IMASUL
              </button>
            )}
          </div>
        </div>
        {reportOpen && <ImasulReportDialog item={item} onClose={() => setReportOpen(false)} />}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 20 }}>
          <StatTile
            label="Consumo do mês"
            value={`${formatNumberBR(stats.monthToDateConsumption)} m³`}
            hint={formatMaxHint(stats.cap, 'm³')}
          />
          <StatTile
            label="Taxa diária"
            value={stats.latestDailyRate != null ? `${formatNumberBR(stats.latestDailyRate)} m³/dia` : '—'}
            hint={formatMaxHint(stats.dailyCap, 'm³/dia')}
          />
          <StatTile
            label="Vazão média"
            value={stats.latestVazaoMedia != null ? `${formatNumberBR(stats.latestVazaoMedia)} m³/h` : '—'}
            hint={formatMaxHint(item.limiteOutorgado ?? 0, 'm³/h')}
          />
          <StatTile
            label="Projeção"
            value={`${formatNumberBR(stats.projection)} m³`}
            hint={stats.cap > 0 ? `${formatPercentBR(stats.projection / stats.cap)} da outorga` : undefined}
          />
          {stats.monthHoras != null && <StatTile label="Horas operadas" value={`${formatNumberBR(stats.monthHoras)} h`} />}
        </div>
      </div>

      <div style={sectionStyle}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, gap: 12, flexWrap: 'wrap' }}>
          <h3 style={{ ...sectionTitleStyle, margin: 0 }}>Taxa diária</h3>
          {pluviometro && (
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, font: '400 12.5px var(--font-sans)', color: 'var(--color-text-muted)' }}>
              <input type="checkbox" checked={showRain} onChange={(e) => setShowRain(e.target.checked)} />
              Mostrar chuva
            </label>
          )}
        </div>
        <TaxaDiariaChart points={stats.rateSeries} dailyCap={stats.dailyCap} rainPoints={pluviometro ? rainPoints : undefined} showRain={showRain} />
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
