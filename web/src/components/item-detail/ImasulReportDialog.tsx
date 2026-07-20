import { useState, type CSSProperties, type FormEvent } from 'react';
import { downloadImasulReport } from '@/lib/api/reports';
import { ApiError } from '@/lib/api/client';
import type { MonitoredItem } from '@/types';

function todayISO(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function yearOptions(): number[] {
  const current = new Date().getFullYear();
  return Array.from({ length: 6 }, (_, i) => current - i);
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

export function ImasulReportDialog({ item, onClose }: { item: MonitoredItem; onClose: () => void }) {
  const [year, setYear] = useState(new Date().getFullYear());
  const [tecnico, setTecnico] = useState(item.lastTecnicoResponsavel ?? '');
  const [crea, setCrea] = useState(item.lastCrea ?? '');
  const [data, setData] = useState(todayISO());
  const [barramentoDurh, setBarramentoDurh] = useState(item.barramentoDurh ?? '');
  const [observacoes, setObservacoes] = useState('');
  const [downloadingFormat, setDownloadingFormat] = useState<'xlsx' | 'pdf' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const download = async (format: 'xlsx' | 'pdf') => {
    setDownloadingFormat(format);
    setError(null);
    try {
      await downloadImasulReport({
        itemId: item.id,
        year,
        tecnico,
        crea,
        data,
        observacoes: observacoes || undefined,
        barramentoDurh: barramentoDurh || undefined,
        format,
      });
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? 'Não foi possível gerar o relatório.' : 'Erro de conexão com o servidor.');
    } finally {
      setDownloadingFormat(null);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    download('xlsx');
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
          width: 400,
          maxWidth: '90vw',
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
          boxShadow: '0 12px 32px rgba(0, 0, 0, 0.2)',
        }}
      >
        <h2 style={{ margin: 0, font: '600 16px var(--font-sans)', color: 'var(--color-text)' }}>Gerar Relatório IMASUL</h2>
        <span style={{ font: '400 12.5px var(--font-sans)', color: 'var(--color-text-faint)' }}>{item.name}</span>

        <label style={labelStyle}>
          Ano
          <select value={year} onChange={(e) => setYear(Number(e.target.value))} style={inputStyle}>
            {yearOptions().map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </label>

        <label style={labelStyle}>
          Técnico Responsável
          <input type="text" required value={tecnico} onChange={(e) => setTecnico(e.target.value)} style={inputStyle} />
        </label>

        <label style={labelStyle}>
          CREA
          <input type="text" required value={crea} onChange={(e) => setCrea(e.target.value)} style={inputStyle} />
        </label>

        <label style={labelStyle}>
          Data
          <input type="date" required value={data} onChange={(e) => setData(e.target.value)} style={inputStyle} />
        </label>

        <label style={labelStyle}>
          Nº da DURH do Barramento (opcional)
          <input type="text" value={barramentoDurh} onChange={(e) => setBarramentoDurh(e.target.value)} style={inputStyle} />
        </label>

        <label style={labelStyle}>
          Observações (opcional)
          <textarea rows={3} value={observacoes} onChange={(e) => setObservacoes(e.target.value)} style={{ ...inputStyle, resize: 'vertical', font: '400 13px var(--font-sans)' }} />
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
            type="button"
            onClick={() => download('pdf')}
            disabled={downloadingFormat !== null}
            style={{
              padding: '7px 16px',
              borderRadius: 8,
              border: '1px solid var(--color-border-input)',
              background: 'var(--color-surface)',
              color: 'var(--color-text)',
              font: '600 12.5px var(--font-sans)',
              opacity: downloadingFormat !== null ? 0.5 : 1,
              cursor: downloadingFormat !== null ? 'default' : 'pointer',
            }}
          >
            {downloadingFormat === 'pdf' ? 'Gerando…' : 'Baixar .pdf'}
          </button>
          <button
            type="submit"
            disabled={downloadingFormat !== null}
            style={{
              padding: '7px 16px',
              borderRadius: 8,
              border: 'none',
              background: 'var(--color-accent)',
              color: '#fff',
              font: '600 12.5px var(--font-sans)',
              opacity: downloadingFormat !== null ? 0.5 : 1,
              cursor: downloadingFormat !== null ? 'default' : 'pointer',
            }}
          >
            {downloadingFormat === 'xlsx' ? 'Gerando…' : 'Baixar .xlsx'}
          </button>
        </div>
      </form>
    </div>
  );
}
