export type MonitoringType = 'hidrometro' | 'pluviometro' | 'corrego';

export interface Area {
  id: string;
  name: string;
  frequency: 'daily' | 'weekly';
}

export interface MonitoredItem {
  id: string;
  areaId: string;
  name: string;
  type: MonitoringType;
  limiteOutorgado: number;
  horasOperacao: number; // artesian wells = 20h, surface captures = 24h
  unit: string;
  corregoMethod?: 'regua' | 'tambor'; // only set when type === 'corrego'
}

export interface Reading {
  id: string;
  itemId: string;
  date: string; // YYYY-MM-DD
  values: Record<string, number>;
  observacoes?: string;
  isDirty: boolean;
  syncedAt: string | null;
}

export interface ReadingStats {
  total: number;
  media: number;
  maximo: number;
  minimo: number;
  diasSemLeitura: number | null; // null for weekly-cadence areas
  limiteOutorgado: number;
  unit: string;
  primaryKey: string;
}

export interface User {
  username: string;
  name: string;
}
