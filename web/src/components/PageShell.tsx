import type { ReactNode } from 'react';
import { AppHeader } from '@/components/AppHeader';
import { useBreakpoint } from '@/lib/useBreakpoint';

/** Shared page chrome (header + main padding/max-width) for every page except the horímetro backfill grid, which stays desktop-only. */
export function PageShell({ children }: { children: ReactNode }) {
  const tier = useBreakpoint();

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)' }}>
      <AppHeader />
      <main
        style={{
          padding: tier === 'narrow' ? '18px 16px 48px' : '26px 28px 60px',
          maxWidth: 1200,
          margin: '0 auto',
        }}
      >
        {children}
      </main>
    </div>
  );
}
