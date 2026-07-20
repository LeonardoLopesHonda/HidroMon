import { Bar, BarChart, CartesianGrid, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { dailyRate, isInMonth } from '@/lib/metrics';
import { formatDateBR, formatNumberBR } from '@/lib/format';
import { axisTick, emptyChartStyle, tooltipContentStyle } from '@/components/item-detail/charts/chartStyles';
import type { Reading } from '@/types';

export function TaxaDiariaChart({
  readingsUpToMonth,
  year,
  month,
  dailyCap,
}: {
  readingsUpToMonth: Reading[];
  year: number;
  month: number;
  dailyCap: number;
}) {
  const points = dailyRate(readingsUpToMonth).filter((p) => isInMonth(p.date, year, month));

  if (points.length === 0) {
    return <div style={emptyChartStyle}>Sem leituras suficientes para a taxa diária.</div>;
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
          formatter={(value) => [`${formatNumberBR(Number(value))} m³/dia`, 'Taxa diária']}
        />
        {dailyCap > 0 && <ReferenceLine y={dailyCap} stroke="var(--color-warn-accent)" strokeDasharray="6 4" />}
        <Bar dataKey="rate" radius={[3, 3, 0, 0]} maxBarSize={26}>
          {points.map((p) => (
            <Cell key={p.date} fill={dailyCap > 0 && p.rate > dailyCap ? 'var(--color-danger-text)' : 'var(--color-accent)'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
