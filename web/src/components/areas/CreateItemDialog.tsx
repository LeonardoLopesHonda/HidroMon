import { useState, type CSSProperties, type FormEvent } from 'react';
import { createItem } from '@/lib/api/resources';
import { ApiError } from '@/lib/api/client';
import type { MonitoredItem, MonitoringType } from '@/types';

const TYPE_LABELS: Record<MonitoringType, string> = {
  hidrometro: 'Hidrômetro',
  pluviometro: 'Pluviômetro',
  corrego: 'Córrego',
};

const labelStyle: CSSProperties = { display: 'flex', flexDirection: 'column', gap: 4, font: '500 12px var(--font-sans)', color: 'var(--color-text-muted)' };
const inputStyle: CSSProperties = {
  padding: '7px 10px',
  borderRadius: 6,
  border: '1px solid var(--color-border-input)',
  background: 'var(--color-surface)',
  font: '400 13px var(--font-sans)',
  color: 'var(--color-text)',
};
const checkboxLabelStyle: CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, font: '500 12px var(--font-sans)', color: 'var(--color-text-muted)' };

function errorDetail(err: unknown): string {
  if (err instanceof ApiError && err.body && typeof err.body === 'object' && 'detail' in err.body) {
    const detail = (err.body as { detail: unknown }).detail;
    if (typeof detail === 'string') return detail;
  }
  return err instanceof ApiError ? 'Não foi possível criar o item.' : 'Erro de conexão com o servidor.';
}

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
  const [horasOperacao, setHorasOperacao] = useState('24');
  const [limiteOutorgado, setLimiteOutorgado] = useState('');
  const [unit, setUnit] = useState('m³/h');
  const [hasHorimetro, setHasHorimetro] = useState(false);
  const [durhNumber, setDurhNumber] = useState('');
  const [outorgaNumber, setOutorgaNumber] = useState('');
  const [barramentoDurh, setBarramentoDurh] = useState('');
  const [corregoMethod, setCorregoMethod] = useState<'regua' | 'tambor'>('regua');
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
        horasOperacao: Number(horasOperacao) || 24,
        limiteOutorgado: type === 'hidrometro' && limiteOutorgado ? Number(limiteOutorgado) : null,
        unit: type === 'hidrometro' ? unit.trim() || null : null,
        hasHorimetro: type === 'hidrometro' ? hasHorimetro : false,
        durhNumber: type === 'hidrometro' ? durhNumber.trim() || null : null,
        outorgaNumber: type === 'hidrometro' ? outorgaNumber.trim() || null : null,
        barramentoDurh: type === 'hidrometro' ? barramentoDurh.trim() || null : null,
        corregoMethod: type === 'corrego' ? corregoMethod : null,
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

        <label style={labelStyle}>
          Nome
          <input required value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} />
        </label>

        <label style={labelStyle}>
          Tipo
          <select value={type} onChange={(e) => setType(e.target.value as MonitoringType)} style={inputStyle}>
            {(Object.keys(TYPE_LABELS) as MonitoringType[]).map((t) => (
              <option key={t} value={t}>
                {TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </label>

        {type === 'hidrometro' && (
          <>
            <label style={labelStyle}>
              Horas de operação autorizadas/dia
              <input type="number" min={1} max={24} value={horasOperacao} onChange={(e) => setHorasOperacao(e.target.value)} style={inputStyle} />
            </label>
            <label style={labelStyle}>
              Limite outorgado (m³/h) — opcional, pode ser preenchido depois
              <input type="number" step="any" value={limiteOutorgado} onChange={(e) => setLimiteOutorgado(e.target.value)} style={inputStyle} />
            </label>
            <label style={labelStyle}>
              Unidade
              <input value={unit} onChange={(e) => setUnit(e.target.value)} style={inputStyle} />
            </label>
            <label style={labelStyle}>
              Nº da DURH — opcional
              <input value={durhNumber} onChange={(e) => setDurhNumber(e.target.value)} style={inputStyle} />
            </label>
            <label style={labelStyle}>
              Nº da Outorga — opcional
              <input value={outorgaNumber} onChange={(e) => setOutorgaNumber(e.target.value)} style={inputStyle} />
            </label>
            <label style={labelStyle}>
              DURH do barramento vinculado — opcional
              <input value={barramentoDurh} onChange={(e) => setBarramentoDurh(e.target.value)} style={inputStyle} />
            </label>
            <label style={checkboxLabelStyle}>
              <input type="checkbox" checked={hasHorimetro} onChange={(e) => setHasHorimetro(e.target.checked)} />
              Equipado com horímetro
            </label>
          </>
        )}

        {type === 'corrego' && (
          <label style={labelStyle}>
            Método de medição
            <select value={corregoMethod} onChange={(e) => setCorregoMethod(e.target.value as 'regua' | 'tambor')} style={inputStyle}>
              <option value="regua">Régua</option>
              <option value="tambor">Tambor</option>
            </select>
          </label>
        )}

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
