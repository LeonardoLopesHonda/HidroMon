export const axisTick = { fontFamily: 'IBM Plex Mono', fontSize: 10, fill: 'var(--color-text-faint)' };

export const tooltipContentStyle = {
  background: 'var(--color-surface)',
  border: '1px solid var(--color-border)',
  borderRadius: 8,
  font: '400 12px var(--font-sans)',
};

export const emptyChartStyle = {
  height: 220,
  display: 'flex' as const,
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
  font: '400 12.5px var(--font-sans)',
  color: 'var(--color-text-faint)',
};

export const MONTH_ABBR = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

/** Fixed hue order (dataviz skill categorical theme) — assigned by series position, never cycled or re-sorted. */
export const SERIES_COLORS = ['var(--color-series-1)', 'var(--color-series-2)', 'var(--color-series-3)', 'var(--color-series-4)'];
