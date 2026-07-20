import { CartesianGrid, Line, LineChart, ReferenceDot, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { cumulativeConsumptionSeries } from '@/lib/metrics';
import { formatNumberBR } from '@/lib/format';
import { axisTick, emptyChartStyle, tooltipContentStyle } from '@/components/item-detail/charts/chartStyles';
import type { Reading } from '@/types';

export function CumulativeConsumptionChart({
  readings,
  year,
  month,
  cap,
}: {
  readings: Reading[];
  year: number;
  month: number;
  cap: number;
}) {
  const points = cumulativeConsumptionSeries(readings, year, month, cap);
  const withData = points.filter((p) => p.cumulative != null);
  const last = withData.length > 0 ? withData[withData.length - 1] : null;

  if (cap === 0 && withData.length === 0) {
    return <div style={emptyChartStyle}>Sem leituras suficientes para o consumo acumulado.</div>;
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={points} margin={{ top: 16, right: 24, bottom: 0, left: 0 }}>
        <CartesianGrid stroke="var(--color-border-light)" vertical={false} />
        <XAxis dataKey="day" tick={axisTick} axisLine={{ stroke: 'var(--color-border)' }} tickLine={false} />
        <YAxis tick={axisTick} axisLine={false} tickLine={false} width={44} />
        <Tooltip
          contentStyle={tooltipContentStyle}
          labelFormatter={(day) => `Dia ${day}`}
          formatter={(value, name) => [value == null ? '—' : `${formatNumberBR(Number(value))} m³`, String(name)]}
        />
        <Line type="linear" dataKey="pace" name="Ritmo da outorga" stroke="var(--color-text-faint)" strokeWidth={1.5} strokeDasharray="5 4" dot={false} />
        <Line
          type="monotone"
          dataKey="cumulative"
          name="Consumo acumulado"
          stroke="var(--color-accent)"
          strokeWidth={2.5}
          dot={{ r: 3 }}
          connectNulls={false}
        />
        {last && (
          <ReferenceDot
            x={last.day}
            y={last.cumulative!}
            r={4}
            fill="var(--color-accent)"
            stroke="none"
            label={{ value: `${formatNumberBR(last.cumulative!)} m³`, position: 'top', fill: 'var(--color-text)', fontSize: 11 }}
          />
        )}
      </LineChart>
    </ResponsiveContainer>
  );
}
