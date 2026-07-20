import type { CSSProperties, ReactNode } from 'react';
import { formatDateBR } from '@/lib/format';
import type { Reading } from '@/types';

export interface ReadingHistoryColumn {
  key: string;
  header: string;
  cell: (reading: Reading) => ReactNode;
}

const thStyle: CSSProperties = {
  textAlign: 'left',
  padding: '10px 16px',
  font: '600 11px var(--font-sans)',
  color: 'var(--color-text-faint)',
  textTransform: 'uppercase',
  letterSpacing: '.05em',
  whiteSpace: 'nowrap',
};

const tdStyle: CSSProperties = {
  padding: '10px 16px',
  font: '400 12.5px var(--font-mono)',
  color: 'var(--color-text)',
  whiteSpace: 'nowrap',
};

function sortNewestFirst(rows: Reading[]): Reading[] {
  return [...rows].sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? 1 : -1;
    return a.recordedAt < b.recordedAt ? 1 : a.recordedAt > b.recordedAt ? -1 : 0;
  });
}

/** Type-agnostic reading history table — callers supply the value columns; the date column and sort order are shared. */
export function ReadingHistoryTable({
  columns,
  rows,
  footer,
}: {
  columns: ReadingHistoryColumn[];
  rows: Reading[];
  footer?: ReactNode;
}) {
  const sorted = sortNewestFirst(rows);

  return (
    <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 10, overflow: 'hidden' }}>
      <div style={{ maxHeight: 460, overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ ...thStyle, position: 'sticky', top: 0, background: 'var(--color-surface-muted)', zIndex: 1 }}>Data</th>
              {columns.map((c) => (
                <th key={c.key} style={{ ...thStyle, position: 'sticky', top: 0, background: 'var(--color-surface-muted)', zIndex: 1 }}>
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 && (
              <tr>
                <td colSpan={columns.length + 1} style={{ padding: '18px 20px', font: '400 12.5px var(--font-sans)', color: 'var(--color-text-faint)' }}>
                  Nenhuma leitura no período.
                </td>
              </tr>
            )}
            {sorted.map((r) => (
              <tr key={r.id} style={{ borderTop: '1px solid var(--color-border-light)' }}>
                <td style={tdStyle}>{formatDateBR(r.date)}</td>
                {columns.map((c) => (
                  <td key={c.key} style={tdStyle}>
                    {c.cell(r)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {footer && (
        <div style={{ position: 'sticky', bottom: 0, background: 'var(--color-surface)', borderTop: '1px solid var(--color-border)', padding: '10px 16px' }}>
          {footer}
        </div>
      )}
    </div>
  );
}
