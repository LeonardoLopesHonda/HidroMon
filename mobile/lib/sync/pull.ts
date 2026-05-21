import type { apiClient } from '@/lib/api/client';
import type { Area, MonitoredItem, Reading } from '@/types';

type ApiClient = typeof apiClient;

function sinceParam(since: string | null) {
  return since ? { since } : undefined;
}

export function pullAreas(client: ApiClient, since: string | null): Promise<Area[]> {
  return client.get<Area[]>('/areas', sinceParam(since));
}

export function pullItems(client: ApiClient, since: string | null): Promise<MonitoredItem[]> {
  return client.get<MonitoredItem[]>('/items', sinceParam(since));
}

export function pullReadings(client: ApiClient, since: string | null): Promise<Reading[]> {
  return client.get<Reading[]>('/readings', sinceParam(since));
}
