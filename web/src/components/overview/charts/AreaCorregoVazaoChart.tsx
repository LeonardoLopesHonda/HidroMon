import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatNumberBR } from '@/lib/format';
import { MONTH_ABBR, SERIES_COLORS, axisTick, emptyChartStyle, tooltipContentStyle } from '@/components/item-detail/charts/chartStyles';
import type { MonthlyVazaoPoint } from '@/lib/metrics';

export interface AreaCorregoSeries {
  id: string;
  name: string;
  points: MonthlyVazaoPoint[]; // 12 entries, months 1..12 in order
}

const legendStyle = { font: '400 11px var(--font-sans)', color: 'var(--color-text-muted)' };

// Custom content — recharts' built-in Legend can reorder items relative to Bar
// declaration order, but color must stay tied to the same entity every render.
function renderLegend(series: AreaCorregoSeries[]) {
  return (
    <ul style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center', padding: 0, margin: '8px 0 0', listStyle: 'none' }}>
      {series.map((s, i) => (
        <li key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 5, ...legendStyle }}>
          <span
            style={{ width: 10, height: 10, borderRadius: 2, background: SERIES_COLORS[i % SERIES_COLORS.length], display: 'inline-block' }}
          />
          {s.name}
        </li>
      ))}
    </ul>
  );
}

/** One grouped bar per área — each córrego in the área is its own series, so monthly average vazão is comparable side by side. */
export function AreaCorregoVazaoChart({ series }: { series: AreaCorregoSeries[] }) {
  const hasAnyData = series.some((s) => s.points.some((p) => p.hasData));
  if (!hasAnyData) {
    return <div style={emptyChartStyle}>Sem leituras de vazão neste ano.</div>;
  }

  const chartData = MONTH_ABBR.map((month, i) => {
    const row: Record<string, string | number | null> = { month };
    for (const s of series) {
      const point = s.points[i];
      row[s.id] = point?.hasData ? point.avgVazao : null;
    }
    return row;
  });

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={chartData}>
        <CartesianGrid stroke="var(--color-border-light)" vertical={false} />
        <XAxis dataKey="month" tick={axisTick} axisLine={{ stroke: 'var(--color-border)' }} tickLine={false} />
        <YAxis tick={axisTick} axisLine={false} tickLine={false} width={44} />
        <Tooltip
          contentStyle={tooltipContentStyle}
          formatter={(value, name) => [value == null ? 'Sem leituras' : `${formatNumberBR(Number(value))} m³/s`, String(name)]}
        />
        <Legend content={() => renderLegend(series)} />
        {series.map((s, i) => (
          <Bar key={s.id} dataKey={s.id} name={s.name} fill={SERIES_COLORS[i % SERIES_COLORS.length]} radius={[3, 3, 0, 0]} maxBarSize={20} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
