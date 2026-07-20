import { useState } from 'react';
import { updateReading } from '@/lib/api/resources';
import { ApiError } from '@/lib/api/client';
import { horimetroBounds, sortByDateAndRecordedAt } from '@/lib/metrics';
import type { Reading } from '@/types';

export type HorimetroRowStatus = 'clean' | 'dirty' | 'saving' | 'saved' | 'error';

export interface HorimetroRowState {
  draft: string;
  status: HorimetroRowStatus;
  error?: string;
}

function cleanState(reading: Reading): HorimetroRowState {
  return { draft: reading.values.horimetro != null ? String(reading.values.horimetro) : '', status: 'clean' };
}

function errorDetail(err: unknown): string {
  if (err instanceof ApiError && err.body && typeof err.body === 'object' && 'detail' in err.body) {
    return String((err.body as { detail: unknown }).detail);
  }
  return 'Erro ao salvar.';
}

/**
 * Owns the horímetro backfill grid's edit state: per-row draft text, a batch
 * save that submits sequentially in chronological order (both because the
 * server's neighbor-bounds check is order-sensitive, and because it's what
 * makes "already saved earlier in this batch" well-defined), and client-side
 * validation mirroring the server's neighbor-bounded rule. Validation is
 * checked against server-persisted values plus rows already saved earlier in
 * *this* batch — never against sibling drafts still unsaved, since the server
 * only ever commits one value at a time and a combination that's only valid
 * together can't be verified client-side; that case falls through to the
 * server's 422, which the caller surfaces on the row via `status: 'error'`.
 */
export function useHorimetroEditBuffer(onReadingUpdated: (updated: Reading) => void) {
  const [buffer, setBuffer] = useState<Record<string, HorimetroRowState>>({});

  const getState = (reading: Reading): HorimetroRowState => buffer[reading.id] ?? cleanState(reading);

  const setDraft = (readingId: string, draft: string) => {
    setBuffer((b) => ({ ...b, [readingId]: { draft, status: 'dirty' } }));
  };

  const isDirty = (reading: Reading) => {
    const state = getState(reading);
    return state.status === 'dirty' && state.draft.trim() !== '';
  };

  async function save(readings: Reading[]) {
    const dirtyRows = readings.filter(isDirty);
    const ordered = sortByDateAndRecordedAt(dirtyRows);

    // Patched locally as each save lands, so later rows in this batch validate
    // against already-saved values rather than the stale snapshot from render start.
    let working = readings;

    for (const row of ordered) {
      const raw = getState(row).draft.trim();
      const value = Number(raw);
      if (Number.isNaN(value)) {
        setBuffer((b) => ({ ...b, [row.id]: { ...b[row.id], status: 'error', error: 'Valor inválido.' } }));
        continue;
      }

      const { lower, upper } = horimetroBounds(working, row.id);
      if (lower != null && value < lower) {
        setBuffer((b) => ({ ...b, [row.id]: { ...b[row.id], status: 'error', error: `Deve ser ≥ ${lower} h (leitura anterior).` } }));
        continue;
      }
      if (upper != null && value > upper) {
        setBuffer((b) => ({ ...b, [row.id]: { ...b[row.id], status: 'error', error: `Deve ser ≤ ${upper} h (leitura posterior).` } }));
        continue;
      }

      setBuffer((b) => ({ ...b, [row.id]: { draft: raw, status: 'saving' } }));
      try {
        const updated = await updateReading(row.id, { values: { ...row.values, horimetro: value }, observacoes: row.observacoes });
        working = working.map((r) => (r.id === updated.id ? updated : r));
        onReadingUpdated(updated);
        setBuffer((b) => ({ ...b, [row.id]: { draft: raw, status: 'saved' } }));
      } catch (err) {
        setBuffer((b) => ({ ...b, [row.id]: { draft: raw, status: 'error', error: errorDetail(err) } }));
      }
    }
  }

  return { getState, setDraft, save, isDirty };
}
