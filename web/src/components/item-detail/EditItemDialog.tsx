import { useState, type FormEvent } from 'react';
import { updateItem } from '@/lib/api/resources';
import { ApiError } from '@/lib/api/client';
import { ItemTypeFields, TYPE_LABELS, itemFieldLabelStyle, itemFieldInputStyle, type ItemTypeFieldsValue } from '@/components/shared/ItemTypeFields';
import type { MonitoredItem } from '@/types';

function errorDetail(err: unknown): string {
  if (err instanceof ApiError && err.body && typeof err.body === 'object' && 'detail' in err.body) {
    const detail = (err.body as { detail: unknown }).detail;
    if (typeof detail === 'string') return detail;
  }
  return err instanceof ApiError ? 'Não foi possível salvar o item.' : 'Erro de conexão com o servidor.';
}

function fieldsFromItem(item: MonitoredItem): ItemTypeFieldsValue {
  return {
    horasOperacao: String(item.horasOperacao),
    limiteOutorgado: item.limiteOutorgado != null ? String(item.limiteOutorgado) : '',
    unit: item.unit ?? '',
    hasHorimetro: item.hasHorimetro,
    durhNumber: item.durhNumber ?? '',
    outorgaNumber: item.outorgaNumber ?? '',
    barramentoDurh: item.barramentoDurh ?? '',
    corregoMethod: item.corregoMethod ?? 'regua',
  };
}

export function EditItemDialog({
  item,
  onUpdated,
  onClose,
}: {
  item: MonitoredItem;
  onUpdated: (item: MonitoredItem) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(item.name);
  const [fields, setFields] = useState<ItemTypeFieldsValue>(fieldsFromItem(item));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const updated = await updateItem(item.id, {
        name: name.trim(),
        horasOperacao: Number(fields.horasOperacao) || 24,
        limiteOutorgado: item.type === 'hidrometro' && fields.limiteOutorgado ? Number(fields.limiteOutorgado) : null,
        unit: item.type === 'hidrometro' ? fields.unit.trim() || null : null,
        hasHorimetro: item.type === 'hidrometro' ? fields.hasHorimetro : false,
        durhNumber: item.type === 'hidrometro' ? fields.durhNumber.trim() || null : null,
        outorgaNumber: item.type === 'hidrometro' ? fields.outorgaNumber.trim() || null : null,
        barramentoDurh: item.type === 'hidrometro' ? fields.barramentoDurh.trim() || null : null,
        corregoMethod: item.type === 'corrego' ? fields.corregoMethod : null,
      });
      onUpdated(updated);
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
          width: 400,
          maxWidth: '90vw',
          maxHeight: '85vh',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
          boxShadow: '0 12px 32px rgba(0, 0, 0, 0.2)',
        }}
      >
        <h2 style={{ margin: 0, font: '600 16px var(--font-sans)', color: 'var(--color-text)' }}>Editar item</h2>
        <span style={{ font: '400 12.5px var(--font-sans)', color: 'var(--color-text-faint)' }}>{TYPE_LABELS[item.type]}</span>

        <label style={itemFieldLabelStyle}>
          Nome
          <input required value={name} onChange={(e) => setName(e.target.value)} style={itemFieldInputStyle} />
        </label>

        <ItemTypeFields type={item.type} value={fields} onChange={(patch) => setFields((f) => ({ ...f, ...patch }))} />

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
            {submitting ? 'Salvando…' : 'Salvar'}
          </button>
        </div>
      </form>
    </div>
  );
}
