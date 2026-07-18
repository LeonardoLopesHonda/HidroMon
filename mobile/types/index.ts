export type MonitoringType = 'hidrometro' | 'pluviometro' | 'corrego';

export interface Area {
  id: string;
  name: string;
  frequency: 'daily' | 'weekly';
  createdAt?: string;
  updatedAt?: string;
}

export interface MonitoredItem {
  id: string;
  areaId: string;
  name: string;
  type: MonitoringType;
  limiteOutorgado: number | null;
  horasOperacao: number; // artesian wells = 20h, surface captures = 24h
  unit: string | null;
  corregoMethod?: 'regua' | 'tambor'; // only set when type === 'corrego'
  hasHorimetro: boolean; // true for hidrômetros with an hour-counter (captured per reading)
  disabled: boolean; // retired item — no new readings; history stays visible/editable
  createdAt?: string;
  updatedAt?: string;
}

export interface ReadingValues {
  valor?: number;   // hidrômetro (m³ cumulative) / pluviômetro (mm)
  horimetro?: number; // hidrômetro hour-counter (cumulative hours) — only for hasHorimetro items
  nivel?: number;   // córrego régua (meters)
  vazao?: number;   // córrego — server-derived
  t1?: number;      // córrego tambor (seconds)
  t2?: number;
  t3?: number;
}

export interface Reading {
  id: string;
  itemId: string;
  date: string; // YYYY-MM-DD
  recordedAt: string; // ISO; frozen at first save (ADR 0005)
  values: ReadingValues;
  observacoes?: string;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
  // mobile-only sync state (never sent to server)
  isDirty: boolean;
  syncedAt: string | null;
}

export interface ReadingStats {
  total: number | null;   // null when not meaningful (córrego)
  media: number | null;   // null when not meaningful (hidrômetro)
  maximo: number | null;  // null when not meaningful (hidrômetro)
  minimo: number | null;  // null when not meaningful (hidrômetro)
  diasSemLeitura: number | null; // null for weekly-cadence areas
  horasOperadas: number | null; // last − first horímetro of month; null unless hasHorimetro
  limiteOutorgado: number;
  monthlyCap: number; // limiteOutorgado × horasOperacao × 30 (fixed 30-day month per outorga); 0 when not applicable
  unit: string;
  primaryKey: string;
}

export interface User {
  id: string;
  email: string;
}
