import { afterEach, describe, expect, it, vi } from 'vitest';
import { TABLET_BREAKPOINT, getBreakpointTier } from '@/lib/useBreakpoint';

function stubMatchMedia(matches: boolean) {
  const mql = { matches, addEventListener: vi.fn(), removeEventListener: vi.fn() };
  const matchMediaMock = vi.fn().mockReturnValue(mql);
  vi.stubGlobal('matchMedia', matchMediaMock);
  return matchMediaMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('getBreakpointTier', () => {
  it('returns "desktop" when the viewport matches the tablet breakpoint or wider', () => {
    stubMatchMedia(true);
    expect(getBreakpointTier()).toBe('desktop');
  });

  it('returns "narrow" when the viewport is below the tablet breakpoint', () => {
    stubMatchMedia(false);
    expect(getBreakpointTier()).toBe('narrow');
  });

  it(`queries min-width: ${TABLET_BREAKPOINT}px, the single source of truth for the threshold`, () => {
    const matchMediaMock = stubMatchMedia(true);
    getBreakpointTier();
    expect(matchMediaMock).toHaveBeenCalledWith(`(min-width: ${TABLET_BREAKPOINT}px)`);
  });
});
