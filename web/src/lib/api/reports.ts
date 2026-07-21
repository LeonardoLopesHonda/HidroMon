import { ApiError, authHeader, BASE_URL } from '@/lib/api/client';

export interface ImasulReportParams {
  itemId: string;
  year: number;
  tecnico: string;
  crea: string;
  data: string; // YYYY-MM-DD
  observacoes?: string;
  barramentoDurh?: string;
}

function filenameFromContentDisposition(header: string | null, fallback: string): string {
  const match = header?.match(/filename="?([^"]+)"?/);
  return match?.[1] ?? fallback;
}

/** Fetches a file response and triggers a browser save; shared by every /reports download. */
async function downloadFile(url: URL, path: string, fallbackFilename: string): Promise<void> {
  const res = await fetch(url.toString(), { headers: await authHeader() });
  if (!res.ok) {
    const body = await res.text();
    throw new ApiError(res.status, body, `GET ${path} -> ${res.status}`);
  }

  const blob = await res.blob();
  const filename = filenameFromContentDisposition(res.headers.get('Content-Disposition'), fallbackFilename);

  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(objectUrl);
}

/** Downloads the filled IMASUL workbook and triggers a browser save. */
export async function downloadImasulReport(params: ImasulReportParams): Promise<void> {
  const url = new URL('/reports/imasul', BASE_URL);
  url.searchParams.set('item_id', params.itemId);
  url.searchParams.set('year', String(params.year));
  url.searchParams.set('tecnico', params.tecnico);
  url.searchParams.set('crea', params.crea);
  url.searchParams.set('data', params.data);
  if (params.observacoes) url.searchParams.set('observacoes', params.observacoes);
  if (params.barramentoDurh) url.searchParams.set('barramento_durh', params.barramentoDurh);

  await downloadFile(url, '/reports/imasul', `formulario-monitoramento-${params.itemId}-${params.year}.xlsx`);
}

export interface ReadingsExportParams {
  itemId: string;
  from: string; // YYYY-MM-DD
  to: string; // YYYY-MM-DD
}

/** Downloads the item's raw readings for an arbitrary date range and triggers a browser save. */
export async function downloadReadingsExport(params: ReadingsExportParams): Promise<void> {
  const url = new URL('/reports/readings', BASE_URL);
  url.searchParams.set('item_id', params.itemId);
  url.searchParams.set('from', params.from);
  url.searchParams.set('to', params.to);

  await downloadFile(url, '/reports/readings', `leituras-${params.itemId}-${params.from}-a-${params.to}.xlsx`);
}
