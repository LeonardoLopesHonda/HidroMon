import { apiClient } from '@/lib/api/client';
import type { Area, MonitoredItem, Reading, ReadingValues } from '@/types';

export const getAreas = () => apiClient.get<Area[]>('/areas');
export const getItems = () => apiClient.get<MonitoredItem[]>('/items');
export const getReadings = () => apiClient.get<Reading[]>('/readings');

export const updateReading = (id: string, body: { values: ReadingValues; observacoes: string | null }) =>
  apiClient.put<Reading>(`/readings/${id}`, body);

export interface ReadingCreateInput {
  id: string;
  itemId: string;
  date: string;
  recordedAt: string;
  values: ReadingValues;
  observacoes: string | null;
}

export const createReading = (body: ReadingCreateInput) => apiClient.post<Reading>('/readings', body);

export const archiveItem = (id: string, reason: string) =>
  apiClient.post<MonitoredItem>(`/items/${id}/archive`, { reason });

export const unarchiveItem = (id: string) => apiClient.post<MonitoredItem>(`/items/${id}/unarchive`, {});

export interface ItemCreateInput {
  id: string;
  areaId: string;
  name: string;
  type: MonitoredItem['type'];
  limiteOutorgado?: number | null;
  unit?: string | null;
  horasOperacao?: number;
  corregoMethod?: MonitoredItem['corregoMethod'];
  hasHorimetro?: boolean;
  durhNumber?: string | null;
  outorgaNumber?: string | null;
  barramentoDurh?: string | null;
}

export const createItem = (body: ItemCreateInput) => apiClient.post<MonitoredItem>('/items', body);

export interface ItemUpdateInput {
  name: string;
  limiteOutorgado?: number | null;
  unit?: string | null;
  horasOperacao?: number;
  corregoMethod?: MonitoredItem['corregoMethod'];
  hasHorimetro?: boolean;
  durhNumber?: string | null;
  outorgaNumber?: string | null;
  barramentoDurh?: string | null;
}

export const updateItem = (id: string, body: ItemUpdateInput) => apiClient.put<MonitoredItem>(`/items/${id}`, body);
