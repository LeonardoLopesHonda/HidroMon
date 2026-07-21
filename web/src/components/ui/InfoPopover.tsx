import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';

const buttonStyle: CSSProperties = {
  width: 18,
  height: 18,
  borderRadius: '50%',
  border: '1px solid var(--color-border-input)',
  background: 'var(--color-surface)',
  color: 'var(--color-text-faint)',
  font: '600 11px var(--font-sans)',
  lineHeight: 1,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  padding: 0,
  flexShrink: 0,
};

const popoverStyle: CSSProperties = {
  position: 'absolute',
  top: '100%',
  right: 0,
  marginTop: 8,
  width: 300,
  maxWidth: '80vw',
  background: 'var(--color-surface)',
  border: '1px solid var(--color-border)',
  borderRadius: 8,
  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.16)',
  padding: '12px 14px',
  font: '400 12.5px var(--font-sans)',
  color: 'var(--color-text-muted)',
  lineHeight: 1.5,
  zIndex: 20,
};

/** Click-to-open explainer for a chart or stat, anchored next to its title. Not the recharts hover tooltip — this one explains what a value means and how it's calculated, and stays open while reading. */
export function InfoPopover({ label, children }: { label: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div ref={containerRef} style={{ position: 'relative', display: 'inline-flex' }}>
      <button type="button" aria-label={label} aria-expanded={open} onClick={() => setOpen((v) => !v)} style={buttonStyle}>
        i
      </button>
      {open && (
        <div role="dialog" aria-label={label} style={popoverStyle}>
          {children}
        </div>
      )}
    </div>
  );
}
