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
