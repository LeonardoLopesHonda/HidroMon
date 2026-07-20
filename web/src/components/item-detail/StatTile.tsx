export function StatTile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span
        style={{
          font: '600 11px var(--font-sans)',
          color: 'var(--color-text-faint)',
          textTransform: 'uppercase',
          letterSpacing: '.05em',
        }}
      >
        {label}
      </span>
      <span style={{ font: '600 19px var(--font-mono)', color: 'var(--color-text)' }}>{value}</span>
      {hint && <span style={{ font: '400 11.5px var(--font-sans)', color: 'var(--color-text-faint)' }}>{hint}</span>}
    </div>
  );
}
