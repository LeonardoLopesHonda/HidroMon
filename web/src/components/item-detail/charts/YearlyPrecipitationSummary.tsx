import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatNumberBR } from '@/lib/format';
import { axisTick, emptyChartStyle, tooltipContentStyle } from '@/components/item-detail/charts/chartStyles';
import type { MonthlyPrecipitationPoint } from '@/lib/metrics';

const MONTH_ABBR = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

/** Year-scoped, independent of the page's MonthSelector day/month — only reacts to a year change. */
export function YearlyPrecipitationSummary({ points, selectedMonth }: { points: MonthlyPrecipitationPoint[]; selectedMonth: number }) {
  const hasAnyData = points.some((p) => p.hasData);
  if (!hasAnyData) {
    return <div style={emptyChartStyle}>Sem leituras de precipitação neste ano.</div>;
  }

  // hasData:false becomes null (not 0) so a month with no readings renders as a gap, not a fake zero bar.
  const chartData = points.map((p) => ({
    month: MONTH_ABBR[p.month - 1],
    totalMm: p.hasData ? p.totalMm : null,
    isSelected: p.month === selectedMonth,
  }));

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={chartData}>
        <CartesianGrid stroke="var(--color-border-light)" vertical={false} />
        <XAxis dataKey="month" tick={axisTick} axisLine={{ stroke: 'var(--color-border)' }} tickLine={false} />
        <YAxis tick={axisTick} axisLine={false} tickLine={false} width={44} />
        <Tooltip
          contentStyle={tooltipContentStyle}
          formatter={(value) => [value == null ? 'Sem leituras' : `${formatNumberBR(Number(value))} mm`, 'Total']}
        />
        <Bar dataKey="totalMm" radius={[3, 3, 0, 0]} maxBarSize={26}>
          {chartData.map((d) => (
            <Cell key={d.month} fill={d.isSelected ? 'var(--color-accent)' : 'var(--color-info-text)'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
