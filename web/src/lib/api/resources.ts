import { apiClient } from '@/lib/api/client';
import type { Area, MonitoredItem, Reading, ReadingValues } from '@/types';

export const getAreas = () => apiClient.get<Area[]>('/areas');
export const getItems = () => apiClient.get<MonitoredItem[]>('/items');
export const getReadings = () => apiClient.get<Reading[]>('/readings');

export const updateReading = (id: string, body: { values: ReadingValues; observacoes: string | null }) =>
  apiClient.put<Reading>(`/readings/${id}`, body);
