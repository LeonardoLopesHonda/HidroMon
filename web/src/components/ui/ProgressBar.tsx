type ProgressVariant = 'ok' | 'warn' | 'danger';

const FILL_COLOR: Record<ProgressVariant, string> = {
  ok: 'var(--color-ok-text)',
  warn: 'var(--color-warn-accent)',
  danger: 'var(--color-danger-text)',
};

/** `ratio` is consumption ÷ cap — can exceed 1; the fill visually caps at 100%. */
export function ProgressBar({ ratio, variant }: { ratio: number; variant: ProgressVariant }) {
  const widthPct = Math.min(Math.max(ratio, 0), 1) * 100;
  return (
    <div
      style={{
        height: 6,
        borderRadius: 999,
        background: 'var(--color-border-light)',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          height: '100%',
          width: `${widthPct}%`,
          borderRadius: 999,
          background: FILL_COLOR[variant],
        }}
      />
    </div>
  );
}
