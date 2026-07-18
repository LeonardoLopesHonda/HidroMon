import { apiClient } from '@/lib/api/client';
import type { Area, MonitoredItem, Reading } from '@/types';

export const getAreas = () => apiClient.get<Area[]>('/areas');
export const getItems = () => apiClient.get<MonitoredItem[]>('/items');
export const getReadings = () => apiClient.get<Reading[]>('/readings');
