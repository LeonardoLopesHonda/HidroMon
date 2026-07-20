import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatDateBR, formatNumberBR } from '@/lib/format';
import { axisTick, emptyChartStyle, tooltipContentStyle } from '@/components/item-detail/charts/chartStyles';

export interface SeriesPoint {
  date: string;
  value: number;
}

/** Single-series line chart for weekly-cadence measurements (córrego nível/vazão) — gaps between visits are normal, never connected across or filled with zeros. */
export function SingleSeriesLineChart({
  points,
  label,
  unit,
  color,
  emptyMessage,
}: {
  points: SeriesPoint[];
  label: string;
  unit: string;
  color: string;
  emptyMessage: string;
}) {
  if (points.length === 0) {
    return <div style={emptyChartStyle}>{emptyMessage}</div>;
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
          formatter={(value) => [`${formatNumberBR(Number(value))} ${unit}`, label]}
        />
        <Line type="monotone" dataKey="value" name={label} stroke={color} strokeWidth={2} dot={{ r: 3 }} connectNulls={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
