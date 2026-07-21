import { useRef, useState } from 'react';
import { createReading, updateReading } from '@/lib/api/resources';
import { ApiError } from '@/lib/api/client';
import { BACKFILL_OBSERVACAO, estimateBackfillValor, fieldBoundsForNewDate, horimetroBounds, valorBoundsForReading } from '@/lib/metrics';
import type { CellStatus } from '@/components/item-detail/NumericCell';
import type { Reading } from '@/types';

/** A row in the editable grid: either an existing reading, or a "ghost" placeholder for an expected-but-missing day. */
export type GridRow = { kind: 'existing'; reading: Reading } | { kind: 'ghost'; date: string };

export interface RowEditState {
  valorDraft: string;
  horimetroDraft: string;
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

// Ghost rows have no recordedAt yet (assigned at save time) and can never collide on
// date with another row — same-day ties only happen between two existing readings.
function recordedAtOf(row: GridRow): string {
  return row.kind === 'existing' ? row.reading.recordedAt : '';
}

function cleanState(row: GridRow): RowEditState {
  if (row.kind === 'ghost') return { valorDraft: '', horimetroDraft: '', observacoesDraft: '', status: 'clean' };
  const { valor, horimetro } = row.reading.values;
  return {
    valorDraft: valor != null ? String(valor) : '',
    horimetroDraft: horimetro != null ? String(horimetro) : '',
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
 * Owns the editable reading grid's state: per-row draft text for `valor` and
 * `horimetro`, ghost-row activation (a missing day becomes editable once
 * clicked), and a batch save that submits sequentially in chronological
 * order — both because the server's neighbor-bounds checks are
 * order-sensitive, and so a ghost day created earlier in the same batch is
 * visible as a bound for one created later. Validation mirrors the server's
 * neighbor-bounded rule (see `fieldBoundsForNewDate` / `valorBoundsForReading`
 * / `horimetroBounds`) against server-persisted values plus rows already
 * saved earlier in *this* batch — never against sibling drafts still
 * unsaved, since the server only ever commits one value at a time; a
 * combination that's only valid together falls through to the server's 422.
 */
export function useReadingEditBuffer(itemId: string, onReadingSaved: (updated: Reading) => void) {
  const [buffer, setBuffer] = useState<Record<string, RowEditState>>({});
  // save() runs across multiple awaits; a plain closure over `buffer` would freeze at
  // whatever it was when the batch started. This ref always holds the latest value so
  // save() can read live drafts on each iteration.
  const bufferRef = useRef(buffer);
  bufferRef.current = buffer;

  const getState = (row: GridRow): RowEditState => buffer[keyFor(row)] ?? cleanState(row);

  const isActivated = (row: GridRow): boolean => row.kind === 'existing' || keyFor(row) in buffer;

  const activateGhost = (date: string) => {
    const key = `ghost:${date}`;
    setBuffer((b) => (key in b ? b : { ...b, [key]: { valorDraft: '', horimetroDraft: '', observacoesDraft: '', status: 'clean' } }));
  };

  // "Retroativo": prefills a Sunday/holiday ghost row with an estimated valor and a
  // fixed observação, rather than leaving the day absent from the record. Still lands
  // in the buffer as 'dirty' — it's a draft like any other, saved via the normal flow.
  const backfillGhost = (date: string, readings: Reading[]) => {
    const key = `ghost:${date}`;
    const estimate = estimateBackfillValor(readings, date);
    setBuffer((b) => ({
      ...b,
      [key]: {
        valorDraft: estimate != null ? String(estimate) : '',
        horimetroDraft: b[key]?.horimetroDraft ?? '',
        observacoesDraft: BACKFILL_OBSERVACAO,
        status: 'dirty',
      },
    }));
  };

  const setValorDraft = (row: GridRow, value: string) => {
    const key = keyFor(row);
    setBuffer((b) => ({ ...b, [key]: { ...(b[key] ?? cleanState(row)), valorDraft: value, status: 'dirty' } }));
  };

  const setHorimetroDraft = (row: GridRow, value: string) => {
    const key = keyFor(row);
    setBuffer((b) => ({ ...b, [key]: { ...(b[key] ?? cleanState(row)), horimetroDraft: value, status: 'dirty' } }));
  };

  const setObservacoesDraft = (row: GridRow, value: string) => {
    const key = keyFor(row);
    setBuffer((b) => ({ ...b, [key]: { ...(b[key] ?? cleanState(row)), observacoesDraft: value, status: 'dirty' } }));
  };

  // 'error' rows still hold an unsaved edit and must remain retriable via the Salvar
  // button. A ghost row only counts once something was actually typed into it — an
  // observação alone still counts, so it isn't silently dropped; save() below then
  // surfaces the missing-valor error rather than losing the note.
  const isDirty = (row: GridRow): boolean => {
    const state = getState(row);
    if (state.status !== 'dirty' && state.status !== 'error') return false;
    if (row.kind === 'ghost') {
      return state.valorDraft.trim() !== '' || state.horimetroDraft.trim() !== '' || state.observacoesDraft.trim() !== '';
    }
    return true;
  };

  async function save(rows: GridRow[], readings: Reading[]) {
    const dirtyRows = rows.filter(isDirty);
    const ordered = [...dirtyRows].sort((a, b) => {
      if (dateOf(a) !== dateOf(b)) return dateOf(a) < dateOf(b) ? -1 : 1;
      const ra = recordedAtOf(a);
      const rb = recordedAtOf(b);
      return ra < rb ? -1 : ra > rb ? 1 : 0;
    });

    // Patched locally as each save lands, so later rows in this batch validate
    // against already-saved values rather than the stale snapshot from render start.
    let working = readings;

    const setRowState = (key: string, patch: Partial<RowEditState>) =>
      setBuffer((b) => ({ ...b, [key]: { ...(b[key] as RowEditState), ...patch } }));

    for (const row of ordered) {
      const key = keyFor(row);
      const state = bufferRef.current[key] ?? cleanState(row);
      const valorRaw = state.valorDraft.trim();
      const horimetroRaw = state.horimetroDraft.trim();

      const valor = Number(valorRaw);
      if (valorRaw === '' || !Number.isFinite(valor)) {
        setRowState(key, { status: 'error', error: 'Valor é obrigatório.' });
        continue;
      }

      let horimetro: number | undefined;
      if (horimetroRaw !== '') {
        horimetro = Number(horimetroRaw);
        if (!Number.isFinite(horimetro)) {
          setRowState(key, { status: 'error', error: 'Horímetro inválido.' });
          continue;
        }
      }

      const valorBounds =
        row.kind === 'existing' ? valorBoundsForReading(working, row.reading.id) : fieldBoundsForNewDate(working, 'valor', row.date);
      if (valorBounds.lower != null && valor < valorBounds.lower) {
        setRowState(key, { status: 'error', error: `Deve ser ≥ ${valorBounds.lower} m³ (leitura anterior).` });
        continue;
      }
      if (valorBounds.upper != null && valor > valorBounds.upper) {
        setRowState(key, { status: 'error', error: `Deve ser ≤ ${valorBounds.upper} m³ (leitura posterior).` });
        continue;
      }

      if (horimetro != null) {
        const hBounds =
          row.kind === 'existing' ? horimetroBounds(working, row.reading.id) : fieldBoundsForNewDate(working, 'horimetro', row.date);
        if (hBounds.lower != null && horimetro < hBounds.lower) {
          setRowState(key, { status: 'error', error: `Horímetro deve ser ≥ ${hBounds.lower} h (leitura anterior).` });
          continue;
        }
        if (hBounds.upper != null && horimetro > hBounds.upper) {
          setRowState(key, { status: 'error', error: `Horímetro deve ser ≤ ${hBounds.upper} h (leitura posterior).` });
          continue;
        }
      }

      const observacoes = state.observacoesDraft.trim() || null;

      setRowState(key, { status: 'saving', error: undefined });
      try {
        let updated: Reading;
        if (row.kind === 'existing') {
          updated = await updateReading(row.reading.id, {
            values: { ...row.reading.values, valor, horimetro },
            observacoes,
          });
          working = working.map((r) => (r.id === updated.id ? updated : r));
        } else {
          updated = await createReading({
            id: crypto.randomUUID(),
            itemId,
            date: row.date,
            recordedAt: new Date().toISOString(),
            values: { valor, horimetro },
            observacoes,
          });
          working = [...working, updated];
        }
        onReadingSaved(updated);
        setRowState(key, { status: 'saved' });
      } catch (err) {
        setRowState(key, { status: 'error', error: errorDetail(err) });
      }
    }
  }

  return { getState, isActivated, activateGhost, backfillGhost, setValorDraft, setHorimetroDraft, setObservacoesDraft, isDirty, save };
}
