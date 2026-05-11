export type MonitoringType = 'hidrometro' | 'pluviometro' | 'corrego';

export interface Area {
  id: string;
  name: string;
}

export interface MonitoredItem {
  id: string;
  areaId: string;
  name: string;
  type: MonitoringType;
  limiteOutorgado: number;
  unit: string;
}

export interface Reading {
  id: string;
  itemId: string;
  date: string; // YYYY-MM-DD
  values: Record<string, number>;
  observacoes?: string;
}

export interface ReadingStats {
  total: number;
  media: number;
  maximo: number;
  minimo: number;
  diasSemLeitura: number;
  limiteOutorgado: number;
  unit: string;
  primaryKey: string;
}

export interface User {
  username: string;
  name: string;
}
