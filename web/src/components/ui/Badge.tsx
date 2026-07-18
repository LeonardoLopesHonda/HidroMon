import type { ReactNode } from 'react';

type BadgeVariant = 'neutral' | 'info' | 'disabled' | 'warn' | 'danger';

const VARIANT_STYLES: Record<BadgeVariant, { bg: string; text: string }> = {
  neutral: { bg: 'var(--color-accent-bg)', text: 'var(--color-accent)' },
  info: { bg: 'var(--color-info-bg)', text: 'var(--color-info-text)' },
  disabled: { bg: 'var(--color-disabled-bg)', text: 'var(--color-disabled-text)' },
  warn: { bg: 'var(--color-warn-bg)', text: 'var(--color-warn-text)' },
  danger: { bg: 'var(--color-danger-bg)', text: 'var(--color-danger-text)' },
};

export function Badge({ variant = 'neutral', children }: { variant?: BadgeVariant; children: ReactNode }) {
  const { bg, text } = VARIANT_STYLES[variant];
  return (
    <span
      style={{
        flex: 'none',
        padding: '3px 10px',
        borderRadius: 999,
        background: bg,
        color: text,
        font: '500 11px var(--font-sans)',
      }}
    >
      {children}
    </span>
  );
}
