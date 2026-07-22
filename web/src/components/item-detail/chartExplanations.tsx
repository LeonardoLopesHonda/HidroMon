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
      Maior leitura diária de precipitação (mm) registrada em cada mês — não a soma do mês. Um mês sem nenhuma leitura aparece como um vão
      no gráfico, não como zero.
    </p>
  );
}

export function VazaoCorregoExplanation({ method }: { method: 'regua' | 'tambor' | null }) {
  if (method === 'tambor') {
    return (
      <p style={lastP}>
        O operador nunca digita a vazão — ela é calculada pelo servidor a partir de três cronometragens (t1, t2, t3) do tempo para encher
        o mesmo balde de 200 L: <em>vazão = 0,2 ÷ média(t1, t2, t3)</em> (m³/s). As três amostras existem para reduzir erro de medição.
      </p>
    );
  }
  return (
    <p style={lastP}>
      O operador nunca digita a vazão — ela é calculada pelo servidor a partir do nível medido na régua, pela fórmula do vertedor
      retangular de crista viva: <em>vazão = 1,8 × 0,6 × nível^1,5</em> (m³/s).
    </p>
  );
}
