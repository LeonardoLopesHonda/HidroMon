import { useState, type CSSProperties, type FormEvent } from 'react';
import { downloadReadingsExport } from '@/lib/api/reports';
import { ApiError } from '@/lib/api/client';
import type { SelectedMonth } from '@/components/shared/MonthSelector';
import type { MonitoredItem } from '@/types';

function monthRange(year: number, month: number): { from: string; to: string } {
  const pad = String(month).padStart(2, '0');
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return { from: `${year}-${pad}-01`, to: `${year}-${pad}-${String(lastDay).padStart(2, '0')}` };
}

const labelStyle: CSSProperties = { display: 'flex', flexDirection: 'column', gap: 4, font: '500 12px var(--font-sans)', color: 'var(--color-text-muted)' };
const inputStyle: CSSProperties = {
  padding: '7px 10px',
  borderRadius: 6,
  border: '1px solid var(--color-border-input)',
  background: 'var(--color-surface)',
  font: '400 13px var(--font-sans)',
  color: 'var(--color-text)',
};

export function ReadingsExportDialog({
  item,
  selectedMonth,
  onClose,
}: {
  item: MonitoredItem;
  selectedMonth: SelectedMonth;
  onClose: () => void;
}) {
  const defaults = monthRange(selectedMonth.year, selectedMonth.month);
  const [from, setFrom] = useState(defaults.from);
  const [to, setTo] = useState(defaults.to);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (to < from) {
      setError("'Até' não pode ser anterior a 'De'.");
      return;
    }
    setDownloading(true);
    setError(null);
    try {
      await downloadReadingsExport({ itemId: item.id, from, to });
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? 'Não foi possível gerar a exportação.' : 'Erro de conexão com o servidor.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{ position: 'fixed', inset: 0, background: 'rgba(28, 40, 34, 0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}
      onClick={onClose}
    >
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--color-surface)',
          borderRadius: 12,
          padding: 24,
          width: 340,
          maxWidth: '90vw',
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
          boxShadow: '0 12px 32px rgba(0, 0, 0, 0.2)',
        }}
      >
        <h2 style={{ margin: 0, font: '600 16px var(--font-sans)', color: 'var(--color-text)' }}>Exportar leituras</h2>
        <span style={{ font: '400 12.5px var(--font-sans)', color: 'var(--color-text-faint)' }}>{item.name}</span>

        <label style={labelStyle}>
          De
          <input type="date" required value={from} onChange={(e) => setFrom(e.target.value)} style={inputStyle} />
        </label>

        <label style={labelStyle}>
          Até
          <input type="date" required value={to} onChange={(e) => setTo(e.target.value)} style={inputStyle} />
        </label>

        {error && <span style={{ font: '400 12px var(--font-sans)', color: 'var(--color-danger-text)' }}>{error}</span>}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
          <button
            type="button"
            onClick={onClose}
            style={{ padding: '7px 16px', borderRadius: 8, border: '1px solid var(--color-border-input)', background: 'var(--color-surface)', color: 'var(--color-text)', font: '600 12.5px var(--font-sans)', cursor: 'pointer' }}
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={downloading}
            style={{
              padding: '7px 16px',
              borderRadius: 8,
              border: 'none',
              background: 'var(--color-accent)',
              color: '#fff',
              font: '600 12.5px var(--font-sans)',
              opacity: downloading ? 0.5 : 1,
              cursor: downloading ? 'default' : 'pointer',
            }}
          >
            {downloading ? 'Gerando…' : 'Baixar .xlsx'}
          </button>
        </div>
      </form>
    </div>
  );
}
