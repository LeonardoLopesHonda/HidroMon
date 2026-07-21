const numberFormatterBR = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatNumberBR(value: number): string {
  return numberFormatterBR.format(value);
}

export function formatPercentBR(ratio: number): string {
  return `${Math.round(ratio * 100)}%`;
}

/** "máx. X unidade" hint line — undefined when max <= 0, meaning the limit isn't configured yet. */
export function formatMaxHint(max: number, unit: string): string | undefined {
  return max > 0 ? `máx. ${formatNumberBR(max)} ${unit}` : undefined;
}

const MONTH_NAMES_PT_BR = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

export function formatMonthYearBR(year: number, month: number): string {
  return `${MONTH_NAMES_PT_BR[month - 1]} ${year}`;
}

export function formatDateBR(isoDate: string): string {
  const [year, month, day] = isoDate.split('-');
  return `${day}/${month}/${year}`;
}
