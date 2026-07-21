export type CellStatus = 'clean' | 'dirty' | 'saving' | 'saved' | 'error';

const backgroundFor: Record<CellStatus, string> = {
  clean: 'transparent',
  dirty: 'transparent',
  saving: 'transparent',
  saved: 'var(--color-ok-bg)',
  error: 'var(--color-danger-bg)',
};

export function NumericCell({
  draft,
  status,
  error,
  onChange,
}: {
  draft: string;
  status: CellStatus;
  error?: string;
  onChange: (value: string) => void;
}) {
  const isPending = draft === '' && status !== 'saved';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <input
        type="number"
        step="any"
        value={draft}
        onChange={(e) => onChange(e.target.value)}
        disabled={status === 'saving'}
        placeholder="—"
        style={{
          width: 92,
          padding: '4px 8px',
          borderRadius: 6,
          border: `1px solid ${status === 'error' ? 'var(--color-danger-text)' : 'var(--color-border-input)'}`,
          background: isPending ? 'var(--color-warn-bg)' : backgroundFor[status],
          font: '400 12.5px var(--font-mono)',
          color: 'var(--color-text)',
        }}
      />
      {status === 'error' && error && (
        <span style={{ font: '400 10.5px var(--font-sans)', color: 'var(--color-danger-text)' }}>{error}</span>
      )}
    </div>
  );
}
