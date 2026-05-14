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
  total: number | null;   // null when not meaningful (córrego)
  media: number | null;   // null when not meaningful (hidrômetro)
  maximo: number | null;  // null when not meaningful (hidrômetro)
  minimo: number | null;  // null when not meaningful (hidrômetro)
  diasSemLeitura: number | null; // null for weekly-cadence areas
  limiteOutorgado: number;
  monthlyCap: number; // limiteOutorgado × horasOperacao × daysInMonth; 0 when not applicable
  unit: string;
  primaryKey: string;
}

export interface User {
  username: string;
  name: string;
}
