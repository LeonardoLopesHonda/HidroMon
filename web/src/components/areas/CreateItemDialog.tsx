import { useState, type FormEvent } from 'react';
import { createItem } from '@/lib/api/resources';
import { ApiError } from '@/lib/api/client';
import { ItemTypeFields, TYPE_LABELS, itemFieldLabelStyle, itemFieldInputStyle, type ItemTypeFieldsValue } from '@/components/shared/ItemTypeFields';
import type { MonitoredItem, MonitoringType } from '@/types';

function errorDetail(err: unknown): string {
  if (err instanceof ApiError && err.body && typeof err.body === 'object' && 'detail' in err.body) {
    const detail = (err.body as { detail: unknown }).detail;
    if (typeof detail === 'string') return detail;
  }
  return err instanceof ApiError ? 'Não foi possível criar o item.' : 'Erro de conexão com o servidor.';
}

const DEFAULT_FIELDS: ItemTypeFieldsValue = {
  horasOperacao: '24',
  limiteOutorgado: '',
  unit: 'm³/h',
  hasHorimetro: false,
  durhNumber: '',
  outorgaNumber: '',
  barramentoDurh: '',
  corregoMethod: 'regua',
};

export function CreateItemDialog({
  areaId,
  areaName,
  onCreated,
  onClose,
}: {
  areaId: string;
  areaName: string;
  onCreated: (item: MonitoredItem) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState('');
  const [type, setType] = useState<MonitoringType>('hidrometro');
  const [fields, setFields] = useState<ItemTypeFieldsValue>(DEFAULT_FIELDS);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const created = await createItem({
        id: crypto.randomUUID(),
        areaId,
        name: name.trim(),
        type,
        horasOperacao: Number(fields.horasOperacao) || 24,
        limiteOutorgado: type === 'hidrometro' && fields.limiteOutorgado ? Number(fields.limiteOutorgado) : null,
        unit: type === 'hidrometro' ? fields.unit.trim() || null : null,
        hasHorimetro: type === 'hidrometro' ? fields.hasHorimetro : false,
        durhNumber: type === 'hidrometro' ? fields.durhNumber.trim() || null : null,
        outorgaNumber: type === 'hidrometro' ? fields.outorgaNumber.trim() || null : null,
        barramentoDurh: type === 'hidrometro' ? fields.barramentoDurh.trim() || null : null,
        corregoMethod: type === 'corrego' ? fields.corregoMethod : null,
      });
      onCreated(created);
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
        <h2 style={{ margin: 0, font: '600 16px var(--font-sans)', color: 'var(--color-text)' }}>Novo ponto monitorado</h2>
        <span style={{ font: '400 12.5px var(--font-sans)', color: 'var(--color-text-faint)' }}>{areaName}</span>

        <label style={itemFieldLabelStyle}>
          Nome
          <input required value={name} onChange={(e) => setName(e.target.value)} style={itemFieldInputStyle} />
        </label>

        <label style={itemFieldLabelStyle}>
          Tipo
          <select value={type} onChange={(e) => setType(e.target.value as MonitoringType)} style={itemFieldInputStyle}>
            {(Object.keys(TYPE_LABELS) as MonitoringType[]).map((t) => (
              <option key={t} value={t}>
                {TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </label>

        <ItemTypeFields type={type} value={fields} onChange={(patch) => setFields((f) => ({ ...f, ...patch }))} />

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
            {submitting ? 'Criando…' : 'Criar item'}
          </button>
        </div>
      </form>
    </div>
  );
}
