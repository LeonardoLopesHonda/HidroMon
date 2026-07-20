import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatDateBR, formatNumberBR } from '@/lib/format';
import { axisTick, emptyChartStyle, tooltipContentStyle } from '@/components/item-detail/charts/chartStyles';

export interface NivelPoint {
  date: string;
  nivel: number;
}

/** Weekly-cadence points, plotted as-is by date — gaps between visits are normal, never connected across or filled with zeros. */
export function NivelChart({ points }: { points: NivelPoint[] }) {
  if (points.length === 0) {
    return <div style={emptyChartStyle}>Sem leituras de nível no período.</div>;
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={points}>
        <CartesianGrid stroke="var(--color-border-light)" vertical={false} />
        <XAxis dataKey="date" tickFormatter={formatDateBR} tick={axisTick} axisLine={{ stroke: 'var(--color-border)' }} tickLine={false} />
        <YAxis tick={axisTick} axisLine={false} tickLine={false} width={44} />
        <Tooltip
          contentStyle={tooltipContentStyle}
          labelFormatter={(date) => formatDateBR(String(date))}
          formatter={(value) => [`${formatNumberBR(Number(value))} m`, 'Nível']}
        />
        <Line type="monotone" dataKey="nivel" name="Nível" stroke="var(--color-info-text)" strokeWidth={2} dot={{ r: 3 }} connectNulls={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
