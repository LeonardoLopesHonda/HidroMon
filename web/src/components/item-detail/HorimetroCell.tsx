import type { HorimetroRowState } from '@/components/item-detail/useHorimetroEditBuffer';

const backgroundFor: Record<HorimetroRowState['status'], string> = {
  clean: 'transparent',
  dirty: 'transparent',
  saving: 'transparent',
  saved: 'var(--color-ok-bg)',
  error: 'var(--color-danger-bg)',
};

export function HorimetroCell({ state, onChange }: { state: HorimetroRowState; onChange: (value: string) => void }) {
  const isPending = state.draft === '' && state.status !== 'saved';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <input
        type="number"
        step="any"
        value={state.draft}
        onChange={(e) => onChange(e.target.value)}
        disabled={state.status === 'saving'}
        placeholder="—"
        style={{
          width: 92,
          padding: '4px 8px',
          borderRadius: 6,
          border: `1px solid ${state.status === 'error' ? 'var(--color-danger-text)' : 'var(--color-border-input)'}`,
          background: isPending ? 'var(--color-warn-bg)' : backgroundFor[state.status],
          font: '400 12.5px var(--font-mono)',
          color: 'var(--color-text)',
        }}
      />
      {state.status === 'error' && state.error && (
        <span style={{ font: '400 10.5px var(--font-sans)', color: 'var(--color-danger-text)' }}>{state.error}</span>
      )}
    </div>
  );
}
