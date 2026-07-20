import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { isInMonth, vazaoEfetivaHorimetro, vazaoMediaOutorgaSeries, type VazaoEfetivaPoint } from '@/lib/metrics';
import { formatDateBR, formatNumberBR } from '@/lib/format';
import { axisTick, emptyChartStyle, tooltipContentStyle } from '@/components/item-detail/charts/chartStyles';
import type { MonitoredItem, Reading } from '@/types';

interface MergedPoint {
  date: string;
  vazaoMedia: number | null;
  vazaoEfetiva: number | null;
}

function mergeByDate(a: VazaoEfetivaPoint[], b: VazaoEfetivaPoint[]): MergedPoint[] {
  const dates = Array.from(new Set([...a.map((p) => p.date), ...b.map((p) => p.date)])).sort();
  const aByDate = new Map(a.map((p) => [p.date, p.vazao]));
  const bByDate = new Map(b.map((p) => [p.date, p.vazao]));
  return dates.map((date) => ({
    date,
    vazaoMedia: aByDate.get(date) ?? null,
    vazaoEfetiva: bByDate.get(date) ?? null,
  }));
}

export function VazaoMediaChart({
  readingsUpToMonth,
  year,
  month,
  item,
}: {
  readingsUpToMonth: Reading[];
  year: number;
  month: number;
  item: MonitoredItem;
}) {
  const inMonth = (p: VazaoEfetivaPoint) => isInMonth(p.date, year, month);
  const vazaoMedia = vazaoMediaOutorgaSeries(readingsUpToMonth, item.horasOperacao).filter(inMonth);
  const vazaoEfetiva = item.hasHorimetro ? vazaoEfetivaHorimetro(readingsUpToMonth).filter(inMonth) : [];
  const points = mergeByDate(vazaoMedia, vazaoEfetiva);

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
        {item.limiteOutorgado != null && <ReferenceLine y={item.limiteOutorgado} stroke="var(--color-warn-accent)" strokeDasharray="6 4" />}
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
