import { useState, type CSSProperties, type FormEvent } from 'react';
import { archiveItem } from '@/lib/api/resources';
import { ApiError } from '@/lib/api/client';
import type { MonitoredItem } from '@/types';

const labelStyle: CSSProperties = { display: 'flex', flexDirection: 'column', gap: 4, font: '500 12px var(--font-sans)', color: 'var(--color-text-muted)' };
const inputStyle: CSSProperties = {
  padding: '7px 10px',
  borderRadius: 6,
  border: '1px solid var(--color-border-input)',
  background: 'var(--color-surface)',
  font: '400 13px var(--font-sans)',
  color: 'var(--color-text)',
  resize: 'vertical',
};

function errorDetail(err: unknown): string {
  if (err instanceof ApiError && err.body && typeof err.body === 'object' && 'detail' in err.body) {
    const detail = (err.body as { detail: unknown }).detail;
    if (typeof detail === 'string') return detail;
  }
  return err instanceof ApiError ? 'Não foi possível arquivar o item.' : 'Erro de conexão com o servidor.';
}

export function ArchiveItemDialog({
  item,
  onArchived,
  onClose,
}: {
  item: MonitoredItem;
  onArchived: (item: MonitoredItem) => void;
  onClose: () => void;
}) {
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const updated = await archiveItem(item.id, reason);
      onArchived(updated);
      onClose();
    } catch (err) {
      setError(errorDetail(err));
    } finally {
      setSubmitting(false);
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
          width: 360,
          maxWidth: '90vw',
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
          boxShadow: '0 12px 32px rgba(0, 0, 0, 0.2)',
        }}
      >
        <h2 style={{ margin: 0, font: '600 16px var(--font-sans)', color: 'var(--color-text)' }}>Arquivar item</h2>
        <span style={{ font: '400 12.5px var(--font-sans)', color: 'var(--color-text-faint)' }}>{item.name}</span>

        <label style={labelStyle}>
          Motivo
          <textarea required rows={3} value={reason} onChange={(e) => setReason(e.target.value)} style={inputStyle} />
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
            disabled={submitting}
            style={{
              padding: '7px 16px',
              borderRadius: 8,
              border: 'none',
              background: 'var(--color-accent)',
              color: '#fff',
              font: '600 12.5px var(--font-sans)',
              opacity: submitting ? 0.5 : 1,
              cursor: submitting ? 'default' : 'pointer',
            }}
          >
            {submitting ? 'Arquivando…' : 'Arquivar'}
          </button>
        </div>
      </form>
    </div>
  );
}
