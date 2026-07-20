import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { mergeSeriesByDate, type VazaoEfetivaPoint } from '@/lib/metrics';
import { formatDateBR, formatNumberBR } from '@/lib/format';
import { axisTick, emptyChartStyle, tooltipContentStyle } from '@/components/item-detail/charts/chartStyles';

function mergeByDate(a: VazaoEfetivaPoint[], b: VazaoEfetivaPoint[]) {
  return mergeSeriesByDate(a, b, (p) => p.vazao, (p) => p.vazao).map((p) => ({ date: p.date, vazaoMedia: p.a, vazaoEfetiva: p.b }));
}

export function VazaoMediaChart({
  vazaoMediaSeries,
  vazaoEfetivaSeries,
  limiteOutorgado,
}: {
  vazaoMediaSeries: VazaoEfetivaPoint[];
  vazaoEfetivaSeries: VazaoEfetivaPoint[];
  limiteOutorgado: number | null;
}) {
  const points = mergeByDate(vazaoMediaSeries, vazaoEfetivaSeries);

  if (points.length === 0) {
    return <div style={emptyChartStyle}>Sem leituras suficientes para vazão.</div>;
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
          formatter={(value, name) => [`${formatNumberBR(Number(value))} m³/h`, String(name)]}
        />
        {limiteOutorgado != null && <ReferenceLine y={limiteOutorgado} stroke="var(--color-warn-accent)" strokeDasharray="6 4" />}
        <Line
          type="monotone"
          dataKey="vazaoMedia"
          name="Vazão média (outorga)"
          stroke="var(--color-accent)"
          strokeWidth={2}
          dot={false}
          connectNulls={false}
        />
        <Line
          type="monotone"
          dataKey="vazaoEfetiva"
          name="Vazão efetiva (horímetro)"
          stroke="var(--color-info-text)"
          strokeWidth={1.5}
          strokeDasharray="5 4"
          dot={{ r: 4 }}
          connectNulls={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
