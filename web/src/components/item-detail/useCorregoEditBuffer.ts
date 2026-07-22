import { useRef, useState } from 'react';
import { createReading, updateReading } from '@/lib/api/resources';
import { ApiError } from '@/lib/api/client';
import type { CellStatus } from '@/components/item-detail/NumericCell';
import type { Reading } from '@/types';

/** A row in the editable grid: either an existing reading, or a "ghost" placeholder for an expected-but-missing week/day. */
export type GridRow = { kind: 'existing'; reading: Reading } | { kind: 'ghost'; date: string };

export interface RowEditState {
  nivelDraft: string;
  t1Draft: string;
  t2Draft: string;
  t3Draft: string;
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

const EMPTY_DRAFTS = { nivelDraft: '', t1Draft: '', t2Draft: '', t3Draft: '' };

function cleanState(row: GridRow): RowEditState {
  if (row.kind === 'ghost') return { ...EMPTY_DRAFTS, observacoesDraft: '', status: 'clean' };
  const { nivel, t1, t2, t3 } = row.reading.values;
  return {
    nivelDraft: nivel != null ? String(nivel) : '',
    t1Draft: t1 != null ? String(t1) : '',
    t2Draft: t2 != null ? String(t2) : '',
    t3Draft: t3 != null ? String(t3) : '',
    observacoesDraft: row.reading.observacoes ?? '',
    status: 'clean',
  };
}

function errorDetail(err: unknown): string {
  if (err instanceof ApiError && err.body && typeof err.body === 'object' && 'detail' in err.body) {
    const detail = (err.body as { detail: unknown }).detail;
    if (typeof detail === 'string') return detail;
  }
  return 'Erro ao salvar.';
}

/**
 * Editable grid state for Córrego. Field set is method-dependent (régua:
 * `nivel` alone; tambor: `t1`/`t2`/`t3` together) — `method` is fixed for the
 * whole item (`item.corregoMethod`), never per-row, so it's a hook parameter
 * rather than something read off individual rows. `vazao` is always
 * server-derived (backend `_derive`) and never sent. No neighbor-bounds check
 * — `_assert_monotonic` only applies to `hidrometro` items — but tambor's
 * all-or-nothing rule is mirrored client-side ahead of the server's 422
 * (backend `_derive`: "Tambor requires all three fill-time samples (t1, t2,
 * t3) > 0").
 */
export function useCorregoEditBuffer(itemId: string, method: 'regua' | 'tambor' | null, onReadingSaved: (updated: Reading) => void) {
  const [buffer, setBuffer] = useState<Record<string, RowEditState>>({});
  const bufferRef = useRef(buffer);
  bufferRef.current = buffer;

  const getState = (row: GridRow): RowEditState => buffer[keyFor(row)] ?? cleanState(row);

  const isActivated = (row: GridRow): boolean => row.kind === 'existing' || keyFor(row) in buffer;

  const activateGhost = (date: string) => {
    const key = `ghost:${date}`;
    setBuffer((b) => (key in b ? b : { ...b, [key]: { ...EMPTY_DRAFTS, observacoesDraft: '', status: 'clean' } }));
  };

  const setField = (field: 'nivelDraft' | 't1Draft' | 't2Draft' | 't3Draft' | 'observacoesDraft', row: GridRow, value: string) => {
    const key = keyFor(row);
    setBuffer((b) => ({ ...b, [key]: { ...(b[key] ?? cleanState(row)), [field]: value, status: 'dirty' } }));
  };

  const setNivelDraft = (row: GridRow, value: string) => setField('nivelDraft', row, value);
  const setT1Draft = (row: GridRow, value: string) => setField('t1Draft', row, value);
  const setT2Draft = (row: GridRow, value: string) => setField('t2Draft', row, value);
  const setT3Draft = (row: GridRow, value: string) => setField('t3Draft', row, value);
  const setObservacoesDraft = (row: GridRow, value: string) => setField('observacoesDraft', row, value);

  const isDirty = (row: GridRow): boolean => {
    const state = getState(row);
    if (state.status !== 'dirty' && state.status !== 'error') return false;
    if (row.kind === 'ghost') {
      return (
        state.nivelDraft.trim() !== '' ||
        state.t1Draft.trim() !== '' ||
        state.t2Draft.trim() !== '' ||
        state.t3Draft.trim() !== '' ||
        state.observacoesDraft.trim() !== ''
      );
    }
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

      let values: { nivel?: number; t1?: number; t2?: number; t3?: number };
      if (method === 'tambor') {
        const raws = [state.t1Draft, state.t2Draft, state.t3Draft].map((d) => d.trim());
        const filled = raws.filter((r) => r !== '').length;
        if (filled === 0) {
          setRowState(key, { status: 'error', error: 'Preencha t1, t2 e t3.' });
          continue;
        }
        if (filled < 3) {
          setRowState(key, { status: 'error', error: 'Tambor exige as três amostras de tempo (t1, t2, t3) preenchidas.' });
          continue;
        }
        const [t1, t2, t3] = raws.map(Number);
        if (![t1, t2, t3].every((v) => Number.isFinite(v) && v > 0)) {
          setRowState(key, { status: 'error', error: 't1, t2 e t3 devem ser maiores que zero.' });
          continue;
        }
        values = { t1, t2, t3 };
      } else {
        const nivelRaw = state.nivelDraft.trim();
        const nivel = Number(nivelRaw);
        if (nivelRaw === '' || !Number.isFinite(nivel)) {
          setRowState(key, { status: 'error', error: 'Nível é obrigatório.' });
          continue;
        }
        values = { nivel };
      }

      const observacoes = state.observacoesDraft.trim() || null;

      setRowState(key, { status: 'saving', error: undefined });
      try {
        let updated: Reading;
        if (row.kind === 'existing') {
          updated = await updateReading(row.reading.id, { values: { ...row.reading.values, ...values }, observacoes });
        } else {
          updated = await createReading({
            id: crypto.randomUUID(),
            itemId,
            date: row.date,
            recordedAt: new Date().toISOString(),
            values,
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

  return {
    getState,
    isActivated,
    activateGhost,
    setNivelDraft,
    setT1Draft,
    setT2Draft,
    setT3Draft,
    setObservacoesDraft,
    isDirty,
    save,
  };
}
