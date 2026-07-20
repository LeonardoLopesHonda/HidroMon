import { Bar, CartesianGrid, Cell, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { mergeSeriesByDate, type DailyRatePoint, type PrecipitationPoint } from '@/lib/metrics';
import { formatDateBR, formatNumberBR } from '@/lib/format';
import { axisTick, emptyChartStyle, tooltipContentStyle } from '@/components/item-detail/charts/chartStyles';

function mergeRain(points: DailyRatePoint[], rainPoints: PrecipitationPoint[]) {
  return mergeSeriesByDate(points, rainPoints, (p) => p.rate, (p) => p.mm).map((p) => ({ date: p.date, rate: p.a, mm: p.b }));
}

export function TaxaDiariaChart({
  points,
  dailyCap,
  rainPoints,
  showRain,
}: {
  points: DailyRatePoint[];
  dailyCap: number;
  rainPoints?: PrecipitationPoint[];
  showRain?: boolean;
}) {
  if (points.length === 0) {
    return <div style={emptyChartStyle}>Sem leituras suficientes para a taxa diária.</div>;
  }

  const rainVisible = Boolean(showRain && rainPoints && rainPoints.length > 0);
  const data = mergeRain(points, rainVisible ? rainPoints! : []);

  return (
    <ResponsiveContainer width="100%" height={220}>
      <ComposedChart data={data}>
        <CartesianGrid stroke="var(--color-border-light)" vertical={false} />
        <XAxis dataKey="date" tickFormatter={formatDateBR} tick={axisTick} axisLine={{ stroke: 'var(--color-border)' }} tickLine={false} />
        <YAxis yAxisId="rate" tick={axisTick} axisLine={false} tickLine={false} width={44} />
        {rainVisible && <YAxis yAxisId="rain" orientation="right" tick={axisTick} axisLine={false} tickLine={false} width={44} />}
        <Tooltip
          contentStyle={tooltipContentStyle}
          labelFormatter={(date) => formatDateBR(String(date))}
          formatter={(value, name) =>
            name === 'Chuva'
              ? [value == null ? 'Sem leitura' : `${formatNumberBR(Number(value))} mm`, 'Chuva']
              : [value == null ? 'Sem leitura' : `${formatNumberBR(Number(value))} m³/dia`, 'Taxa diária']
          }
        />
        {dailyCap > 0 && <ReferenceLine yAxisId="rate" y={dailyCap} stroke="var(--color-warn-accent)" strokeDasharray="6 4" />}
        <Bar yAxisId="rate" dataKey="rate" radius={[3, 3, 0, 0]} maxBarSize={26}>
          {data.map((p) => (
            <Cell key={p.date} fill={dailyCap > 0 && p.rate != null && p.rate > dailyCap ? 'var(--color-danger-text)' : 'var(--color-accent)'} />
          ))}
        </Bar>
        {rainVisible && (
          <Line
            yAxisId="rain"
            type="monotone"
            dataKey="mm"
            name="Chuva"
            stroke="var(--color-info-text)"
            strokeWidth={1.5}
            strokeDasharray="5 4"
            dot={{ r: 3 }}
            connectNulls={false}
          />
        )}
      </ComposedChart>
    </ResponsiveContainer>
  );
}
