import { useSyncExternalStore } from 'react';

/**
 * Single source of truth for the tablet-width threshold (issue #19). Referenced
 * here and by any CSS media queries that turn out to be necessary, so the
 * value can't drift between JS and CSS.
 */
export const TABLET_BREAKPOINT = 768;

const QUERY = `(min-width: ${TABLET_BREAKPOINT}px)`;

/** 'desktop' at/above the tablet breakpoint (tablet and desktop share the same chrome); 'narrow' below it (phone-width, deferred — see issue #19). */
export type BreakpointTier = 'narrow' | 'desktop';

function getBreakpointTier(): BreakpointTier {
  return matchMedia(QUERY).matches ? 'desktop' : 'narrow';
}

function subscribe(onChange: () => void): () => void {
  const mql = matchMedia(QUERY);
  mql.addEventListener('change', onChange);
  return () => mql.removeEventListener('change', onChange);
}

export function useBreakpoint(): BreakpointTier {
  return useSyncExternalStore(subscribe, getBreakpointTier);
}

export { getBreakpointTier };
