import type { apiClient } from '@/lib/api/client';
import type { Reading } from '@/types';

type ApiClient = typeof apiClient;

export interface PushResult {
  succeeded: { id: string; updatedAt: string }[];
  failed: { id: string; error: unknown }[];
}

interface ServerReading {
  id: string;
  updatedAt: string;
}

export interface DeleteResult {
  succeeded: string[];
  failed: string[];
}

// Hard delete is idempotent server-side (204 even if already gone), so any
// non-error response drains the id from the queue. Network errors keep it.
export async function pushDeletes(client: ApiClient, ids: string[]): Promise<DeleteResult> {
  const succeeded: string[] = [];
  const failed: string[] = [];
  for (const id of ids) {
    try {
      await client.del(`/readings/${id}`);
      succeeded.push(id);
    } catch {
      failed.push(id);
    }
  }
  return { succeeded, failed };
}

export async function pushDirty(client: ApiClient, dirty: Reading[]): Promise<PushResult> {
  const succeeded: PushResult['succeeded'] = [];
  const failed: PushResult['failed'] = [];

  for (const r of dirty) {
    try {
      const resp =
        r.syncedAt === null
          ? await client.post<ServerReading>('/readings', {
              id: r.id,
              itemId: r.itemId,
              date: r.date,
              recordedAt: r.recordedAt,
              values: r.values,
              observacoes: r.observacoes,
            })
          : await client.put<ServerReading>(`/readings/${r.id}`, {
              values: r.values,
              observacoes: r.observacoes,
            });
      succeeded.push({ id: r.id, updatedAt: resp.updatedAt });
    } catch (err) {
      failed.push({ id: r.id, error: err });
    }
  }

  return { succeeded, failed };
}
