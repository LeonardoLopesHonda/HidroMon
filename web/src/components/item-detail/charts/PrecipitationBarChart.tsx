import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { PrecipitationPoint } from '@/lib/metrics';
import { formatDateBR, formatNumberBR } from '@/lib/format';
import { axisTick, emptyChartStyle, tooltipContentStyle } from '@/components/item-detail/charts/chartStyles';

export function PrecipitationBarChart({ points }: { points: PrecipitationPoint[] }) {
  if (points.length === 0) {
    return <div style={emptyChartStyle}>Sem leituras de precipitação no período.</div>;
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={points}>
        <CartesianGrid stroke="var(--color-border-light)" vertical={false} />
        <XAxis dataKey="date" tickFormatter={formatDateBR} tick={axisTick} axisLine={{ stroke: 'var(--color-border)' }} tickLine={false} />
        <YAxis tick={axisTick} axisLine={false} tickLine={false} width={44} />
        <Tooltip
          contentStyle={tooltipContentStyle}
          labelFormatter={(date) => formatDateBR(String(date))}
          formatter={(value) => [`${formatNumberBR(Number(value))} mm`, 'Precipitação']}
        />
        <Bar dataKey="mm" radius={[3, 3, 0, 0]} maxBarSize={26} fill="var(--color-info-text)" />
      </BarChart>
    </ResponsiveContainer>
  );
}
