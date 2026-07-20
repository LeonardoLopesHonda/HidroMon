import { ProgressBar } from '@/components/ui/ProgressBar';
import { Badge } from '@/components/ui/Badge';
import { formatNumberBR, formatPercentBR } from '@/lib/format';
import type { ExceedanceChecks } from '@/lib/metrics';

export const STATE_LABEL: Record<ExceedanceChecks['cardState'], string> = {
  within: 'Dentro da outorga',
  'projected-over': 'Projeção acima da outorga',
  over: 'Consumo acima da outorga',
};

const STATE_VARIANT: Record<ExceedanceChecks['cardState'], 'ok' | 'warn' | 'danger'> = {
  within: 'ok',
  'projected-over': 'warn',
  over: 'danger',
};

const STATE_TEXT_COLOR: Record<ExceedanceChecks['cardState'], string> = {
  within: 'var(--color-ok-text)',
  'projected-over': 'var(--color-warn-text)',
  over: 'var(--color-danger-text)',
};

export interface ComplianceCardProps {
  itemName: string;
  monthToDateConsumption: number;
  cap: number;
  projection: number;
  checks: ExceedanceChecks;
  horasOperadas: number | null;
  vazaoEfetiva: number | null;
  horasOperacao: number;
}

export function ComplianceCard({
  itemName,
  monthToDateConsumption,
  cap,
  projection,
  checks,
  horasOperadas,
  vazaoEfetiva,
  horasOperacao,
}: ComplianceCardProps) {
  const variant = STATE_VARIANT[checks.cardState];
  const ratio = cap > 0 ? monthToDateConsumption / cap : 0;
  const projectionRatio = cap > 0 ? projection / cap : 0;

  return (
    <div
      style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 10,
        padding: '16px 18px',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <span style={{ font: '600 13.5px var(--font-sans)', color: 'var(--color-text)' }}>{itemName}</span>
        <span style={{ font: '600 11px var(--font-sans)', color: STATE_TEXT_COLOR[checks.cardState] }}>
          {STATE_LABEL[checks.cardState]}
        </span>
      </div>

      <ProgressBar ratio={ratio} variant={variant} />

      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <span style={{ font: '400 12px var(--font-sans)', color: 'var(--color-text-muted)' }}>
          {formatNumberBR(monthToDateConsumption)} / {formatNumberBR(cap)} m³
        </span>
        <span style={{ font: '600 12px var(--font-sans)', color: 'var(--color-text)' }}>
          {formatPercentBR(ratio)}
        </span>
      </div>

      <div style={{ font: '400 11.5px var(--font-sans)', color: 'var(--color-text-faint)' }}>
        Projeção: {formatNumberBR(projection)} m³ ({formatPercentBR(projectionRatio)} da outorga)
      </div>

      {horasOperadas != null && (
        <div style={{ font: '400 11.5px var(--font-sans)', color: 'var(--color-text-faint)' }}>
          Horas operadas: {formatNumberBR(horasOperadas)} h
          {vazaoEfetiva != null && ` · Vazão efetiva: ${formatNumberBR(vazaoEfetiva)} m³/h`}
        </div>
      )}

      {(checks.dailyRateOver || checks.hoursOver) && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {checks.dailyRateOver && <Badge variant="warn">Taxa diária acima do limite</Badge>}
          {checks.hoursOver && (
            <Badge variant="warn">Horas medidas acima de {formatNumberBR(horasOperacao)} h/dia</Badge>
          )}
        </div>
      )}
    </div>
  );
}
