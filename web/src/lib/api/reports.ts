import { ApiError, authHeader, BASE_URL } from '@/lib/api/client';

export interface ImasulReportParams {
  itemId: string;
  year: number;
  tecnico: string;
  crea: string;
  data: string; // YYYY-MM-DD
  observacoes?: string;
  barramentoDurh?: string;
  format?: 'xlsx' | 'pdf';
}

function filenameFromContentDisposition(header: string | null, fallback: string): string {
  const match = header?.match(/filename="?([^"]+)"?/);
  return match?.[1] ?? fallback;
}

/** Downloads the filled IMASUL workbook (or its PDF conversion) and triggers a browser save. */
export async function downloadImasulReport(params: ImasulReportParams): Promise<void> {
  const format = params.format ?? 'xlsx';
  const url = new URL('/reports/imasul', BASE_URL);
  url.searchParams.set('item_id', params.itemId);
  url.searchParams.set('year', String(params.year));
  url.searchParams.set('tecnico', params.tecnico);
  url.searchParams.set('crea', params.crea);
  url.searchParams.set('data', params.data);
  if (params.observacoes) url.searchParams.set('observacoes', params.observacoes);
  if (params.barramentoDurh) url.searchParams.set('barramento_durh', params.barramentoDurh);
  url.searchParams.set('format', format);

  const res = await fetch(url.toString(), { headers: await authHeader() });
  if (!res.ok) {
    const body = await res.text();
    throw new ApiError(res.status, body, `GET /reports/imasul -> ${res.status}`);
  }

  const blob = await res.blob();
  const filename = filenameFromContentDisposition(
    res.headers.get('Content-Disposition'),
    `formulario-monitoramento-${params.itemId}-${params.year}.${format}`
  );

  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(objectUrl);
}
