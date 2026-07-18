import { formatDateBR, formatNumberBR } from '@/lib/format';

interface PluviometroCompactCardProps {
  type: 'pluviometro';
  itemName: string;
  monthTotalMm: number;
}

interface CorregoCompactCardProps {
  type: 'corrego';
  itemName: string;
  latestDate: string | null;
  latestNivel: number | null;
  latestVazao: number | null;
}

type CompactCardProps = PluviometroCompactCardProps | CorregoCompactCardProps;

const cardStyle = {
  background: 'var(--color-surface)',
  border: '1px solid var(--color-border)',
  borderRadius: 10,
  padding: '16px 18px',
  display: 'flex',
  flexDirection: 'column' as const,
  gap: 6,
};

export function CompactCard(props: CompactCardProps) {
  return (
    <div style={cardStyle}>
      <span style={{ font: '600 13.5px var(--font-sans)', color: 'var(--color-text)' }}>{props.itemName}</span>
      {props.type === 'pluviometro' ? (
        <span style={{ font: '400 12.5px var(--font-sans)', color: 'var(--color-text-muted)' }}>
          {formatNumberBR(props.monthTotalMm)} mm no mês
        </span>
      ) : props.latestDate ? (
        <>
          <span style={{ font: '400 12.5px var(--font-sans)', color: 'var(--color-text-muted)' }}>
            {props.latestNivel != null ? `Nível: ${formatNumberBR(props.latestNivel)} cm` : 'Nível: —'}
          </span>
          <span style={{ font: '400 12.5px var(--font-sans)', color: 'var(--color-text-muted)' }}>
            {props.latestVazao != null ? `Vazão: ${formatNumberBR(props.latestVazao)} m³/s` : 'Vazão: —'}
          </span>
          <span style={{ font: '400 11px var(--font-sans)', color: 'var(--color-text-faint)' }}>
            Leitura de {formatDateBR(props.latestDate)}
          </span>
        </>
      ) : (
        <span style={{ font: '400 12.5px var(--font-sans)', color: 'var(--color-text-faint)' }}>Sem leituras</span>
      )}
    </div>
  );
}
