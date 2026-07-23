import type { CSSProperties } from 'react';
import type { MonitoringType } from '@/types';

export const TYPE_LABELS: Record<MonitoringType, string> = {
  hidrometro: 'Hidrômetro',
  pluviometro: 'Pluviômetro',
  corrego: 'Córrego',
};

export const itemFieldLabelStyle: CSSProperties = { display: 'flex', flexDirection: 'column', gap: 4, font: '500 12px var(--font-sans)', color: 'var(--color-text-muted)' };
export const itemFieldInputStyle: CSSProperties = {
  padding: '7px 10px',
  borderRadius: 6,
  border: '1px solid var(--color-border-input)',
  background: 'var(--color-surface)',
  font: '400 13px var(--font-sans)',
  color: 'var(--color-text)',
};
export const itemFieldCheckboxLabelStyle: CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, font: '500 12px var(--font-sans)', color: 'var(--color-text-muted)' };

export interface ItemTypeFieldsValue {
  horasOperacao: string;
  limiteOutorgado: string;
  unit: string;
  hasHorimetro: boolean;
  durhNumber: string;
  outorgaNumber: string;
  barramentoDurh: string;
  corregoMethod: 'regua' | 'tambor';
}

/** Fields shown depend on MonitoringType — only hidrômetros carry outorga/DURH data, only córregos carry a measurement method. */
export function ItemTypeFields({
  type,
  value,
  onChange,
}: {
  type: MonitoringType;
  value: ItemTypeFieldsValue;
  onChange: (patch: Partial<ItemTypeFieldsValue>) => void;
}) {
  if (type === 'hidrometro') {
    return (
      <>
        <label style={itemFieldLabelStyle}>
          Horas de operação autorizadas/dia
          <input
            type="number"
            min={1}
            max={24}
            value={value.horasOperacao}
            onChange={(e) => onChange({ horasOperacao: e.target.value })}
            style={itemFieldInputStyle}
          />
        </label>
        <label style={itemFieldLabelStyle}>
          Limite outorgado (m³/h) — opcional, pode ser preenchido depois
          <input
            type="number"
            step="any"
            value={value.limiteOutorgado}
            onChange={(e) => onChange({ limiteOutorgado: e.target.value })}
            style={itemFieldInputStyle}
          />
        </label>
        <label style={itemFieldLabelStyle}>
          Unidade
          <input value={value.unit} onChange={(e) => onChange({ unit: e.target.value })} style={itemFieldInputStyle} />
        </label>
        <label style={itemFieldLabelStyle}>
          Nº da DURH — opcional
          <input value={value.durhNumber} onChange={(e) => onChange({ durhNumber: e.target.value })} style={itemFieldInputStyle} />
        </label>
        <label style={itemFieldLabelStyle}>
          Nº da Outorga — opcional
          <input value={value.outorgaNumber} onChange={(e) => onChange({ outorgaNumber: e.target.value })} style={itemFieldInputStyle} />
        </label>
        <label style={itemFieldLabelStyle}>
          DURH do barramento vinculado — opcional
          <input value={value.barramentoDurh} onChange={(e) => onChange({ barramentoDurh: e.target.value })} style={itemFieldInputStyle} />
        </label>
        <label style={itemFieldCheckboxLabelStyle}>
          <input type="checkbox" checked={value.hasHorimetro} onChange={(e) => onChange({ hasHorimetro: e.target.checked })} />
          Equipado com horímetro
        </label>
      </>
    );
  }

  if (type === 'corrego') {
    return (
      <label style={itemFieldLabelStyle}>
        Método de medição
        <select
          value={value.corregoMethod}
          onChange={(e) => onChange({ corregoMethod: e.target.value as 'regua' | 'tambor' })}
          style={itemFieldInputStyle}
        >
          <option value="regua">Régua</option>
          <option value="tambor">Tambor</option>
        </select>
      </label>
    );
  }

  return null;
}
