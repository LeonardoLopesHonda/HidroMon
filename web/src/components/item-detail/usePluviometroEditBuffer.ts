import { useRef, useState } from 'react';
import { createReading, updateReading } from '@/lib/api/resources';
import { ApiError } from '@/lib/api/client';
import type { CellStatus } from '@/components/item-detail/NumericCell';
import type { Reading } from '@/types';

/** A row in the editable grid: either an existing reading, or a "ghost" placeholder for an expected-but-missing day. */
export type GridRow = { kind: 'existing'; reading: Reading } | { kind: 'ghost'; date: string };

export interface RowEditState {
  valorDraft: string;
  observacoesDraft: string;
  status: CellStatus;
  error?: string;
}

function keyFor(row: GridRow): string {
  return row.kind === 'existing' ? row.reading.id : `ghost:${row.date}`;
}

function dateOf(row: GridRow): string {
  return row.kind === 'existing' ? row.reading.date : row.date;
}

function recordedAtOf(row: GridRow): string {
  return row.kind === 'existing' ? row.reading.recordedAt : '';
}

function cleanState(row: GridRow): RowEditState {
  if (row.kind === 'ghost') return { valorDraft: '', observacoesDraft: '', status: 'clean' };
  const { valor } = row.reading.values;
  return { valorDraft: valor != null ? String(valor) : '', observacoesDraft: row.reading.observacoes ?? '', status: 'clean' };
}

function errorDetail(err: unknown): string {
  if (err instanceof ApiError && err.body && typeof err.body === 'object' && 'detail' in err.body) {
    const detail = (err.body as { detail: unknown }).detail;
    if (typeof detail === 'string') return detail;
  }
  return 'Erro ao salvar.';
}

/**
 * Editable grid state for Pluviômetro: a single `valor` field (mm), no
 * neighbor-bounds check to mirror — unlike Hidrômetro's cumulative odometer,
 * precipitation isn't monotonic and the backend's `_assert_monotonic` only
 * applies to `hidrometro` items. Otherwise the same ghost-activation /
 * batch-save shape as `useReadingEditBuffer`.
 */
export function usePluviometroEditBuffer(itemId: string, onReadingSaved: (updated: Reading) => void) {
  const [buffer, setBuffer] = useState<Record<string, RowEditState>>({});
  const bufferRef = useRef(buffer);
  bufferRef.current = buffer;

  const getState = (row: GridRow): RowEditState => buffer[keyFor(row)] ?? cleanState(row);

  const isActivated = (row: GridRow): boolean => row.kind === 'existing' || keyFor(row) in buffer;

  const activateGhost = (date: string) => {
    const key = `ghost:${date}`;
    setBuffer((b) => (key in b ? b : { ...b, [key]: { valorDraft: '', observacoesDraft: '', status: 'clean' } }));
  };

  const setValorDraft = (row: GridRow, value: string) => {
    const key = keyFor(row);
    setBuffer((b) => ({ ...b, [key]: { ...(b[key] ?? cleanState(row)), valorDraft: value, status: 'dirty' } }));
  };

  const setObservacoesDraft = (row: GridRow, value: string) => {
    const key = keyFor(row);
    setBuffer((b) => ({ ...b, [key]: { ...(b[key] ?? cleanState(row)), observacoesDraft: value, status: 'dirty' } }));
  };

  const isDirty = (row: GridRow): boolean => {
    const state = getState(row);
    if (state.status !== 'dirty' && state.status !== 'error') return false;
    if (row.kind === 'ghost') return state.valorDraft.trim() !== '' || state.observacoesDraft.trim() !== '';
    return true;
  };

  async function save(rows: GridRow[]) {
    const dirtyRows = rows.filter(isDirty);
    const ordered = [...dirtyRows].sort((a, b) => {
      if (dateOf(a) !== dateOf(b)) return dateOf(a) < dateOf(b) ? -1 : 1;
      const ra = recordedAtOf(a);
      const rb = recordedAtOf(b);
      return ra < rb ? -1 : ra > rb ? 1 : 0;
    });

    const setRowState = (key: string, patch: Partial<RowEditState>) =>
      setBuffer((b) => ({ ...b, [key]: { ...(b[key] as RowEditState), ...patch } }));

    for (const row of ordered) {
      const key = keyFor(row);
      const state = bufferRef.current[key] ?? cleanState(row);
      const valorRaw = state.valorDraft.trim();

      const valor = Number(valorRaw);
      if (valorRaw === '' || !Number.isFinite(valor)) {
        setRowState(key, { status: 'error', error: 'Valor é obrigatório.' });
        continue;
      }

      const observacoes = state.observacoesDraft.trim() || null;

      setRowState(key, { status: 'saving', error: undefined });
      try {
        let updated: Reading;
        if (row.kind === 'existing') {
          updated = await updateReading(row.reading.id, { values: { ...row.reading.values, valor }, observacoes });
        } else {
          updated = await createReading({
            id: crypto.randomUUID(),
            itemId,
            date: row.date,
            recordedAt: new Date().toISOString(),
            values: { valor },
            observacoes,
          });
        }
        onReadingSaved(updated);
        setRowState(key, { status: 'saved' });
      } catch (err) {
        setRowState(key, { status: 'error', error: errorDetail(err) });
      }
    }
  }

  return { getState, isActivated, activateGhost, setValorDraft, setObservacoesDraft, isDirty, save };
}
