import type { CSSProperties } from 'react';
import { formatMonthYearBR } from '@/lib/format';

export interface SelectedMonth {
  year: number;
  month: number; // 1-12
}

function shiftMonth({ year, month }: SelectedMonth, delta: number): SelectedMonth {
  const total = (year * 12 + (month - 1)) + delta;
  return { year: Math.floor(total / 12), month: (total % 12) + 1 };
}

export function currentMonth(): SelectedMonth {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

function isCurrentMonth(selected: SelectedMonth): boolean {
  const now = currentMonth();
  return selected.year === now.year && selected.month === now.month;
}

const buttonStyle: CSSProperties = {
  width: 30,
  height: 30,
  borderRadius: 8,
  border: '1px solid var(--color-border-input)',
  background: 'var(--color-surface)',
  color: 'var(--color-text)',
  font: '600 14px var(--font-sans)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

export function MonthSelector({
  value,
  onChange,
}: {
  value: SelectedMonth;
  onChange: (month: SelectedMonth) => void;
}) {
  const atCurrentMonth = isCurrentMonth(value);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <button
        type="button"
        aria-label="Mês anterior"
        onClick={() => onChange(shiftMonth(value, -1))}
        style={buttonStyle}
      >
        ‹
      </button>
      <span style={{ font: '600 13.5px var(--font-sans)', color: 'var(--color-text)', minWidth: 130, textAlign: 'center' }}>
        {formatMonthYearBR(value.year, value.month)}
      </span>
      <button
        type="button"
        aria-label="Próximo mês"
        onClick={() => onChange(shiftMonth(value, 1))}
        disabled={atCurrentMonth}
        style={{ ...buttonStyle, opacity: atCurrentMonth ? 0.4 : 1, cursor: atCurrentMonth ? 'default' : 'pointer' }}
      >
        ›
      </button>
    </div>
  );
}
