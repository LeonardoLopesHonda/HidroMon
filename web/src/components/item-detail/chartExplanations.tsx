import type { CSSProperties } from 'react';

const p: CSSProperties = { margin: '0 0 8px' };
const lastP: CSSProperties = { margin: 0 };
const heading: CSSProperties = { display: 'block', margin: '0 0 2px', color: 'var(--color-text)' };

export function TaxaDiariaExplanation() {
  return (
    <p style={lastP}>
      Volume consumido em cada dia (leitura atual − leitura anterior do hidrômetro). A linha tracejada é o limite diário da outorga
      (<em>limiteOutorgado × horasOperacao</em>); barras vermelhas marcam dias que ultrapassaram esse limite.
    </p>
  );
}

export function VazaoExplanation() {
  return (
    <>
      <p style={p}>
        <strong style={heading}>Vazão média (outorga)</strong>
        Taxa horária permitida: consumo do dia ÷ horas de operação autorizadas na outorga. Comparável diretamente ao limite outorgado
        (m³/h).
      </p>
      <p style={p}>
        <strong style={heading}>Vazão efetiva (horímetro)</strong>
        Taxa horária medida de fato: variação de volume ÷ variação do horímetro entre duas leituras com horas registradas. Só existe em
        hidrômetros com horímetro instalado, por isso é esparsa.
      </p>
      <p style={lastP}>As duas divergem sempre que as horas de operação reais (horímetro) diferem das horas autorizadas assumidas pela outorga.</p>
    </>
  );
}

export function ConsumoAcumuladoExplanation() {
  return (
    <>
      <p style={p}>
        <strong style={heading}>Consumo acumulado</strong>
        Soma do volume desde o início do mês (leitura atual − leitura-base do início do mês). Dias sem leitura ficam em branco, nunca caem
        para zero.
      </p>
      <p style={lastP}>
        <strong style={heading}>Ritmo da outorga</strong>
        Reta de referência (limite mensal ÷ 30) × dia — o consumo esperado se o limite outorgado fosse usado igualmente todos os dias. O
        mês da outorga é sempre 30 dias, independente do calendário.
      </p>
    </>
  );
}

export function ComparativoMensalExplanation() {
  return (
    <p style={lastP}>
      Total de chuva (mm) somado por mês a partir das leituras diárias de precipitação. Um mês sem nenhuma leitura aparece como um vão no
      gráfico, não como zero.
    </p>
  );
}
