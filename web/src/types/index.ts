export type MonitoringType = 'hidrometro' | 'pluviometro' | 'corrego';

export interface Area {
  id: string;
  name: string;
  frequency: 'daily' | 'weekly';
  createdAt: string;
  updatedAt: string;
}

export interface MonitoredItem {
  id: string;
  areaId: string;
  name: string;
  type: MonitoringType;
  limiteOutorgado: number | null;
  unit: string | null;
  horasOperacao: number;
  corregoMethod: 'regua' | 'tambor' | null;
  hasHorimetro: boolean;
  disabled: boolean;
  durhNumber: string | null;
  outorgaNumber: string | null;
  barramentoDurh: string | null;
  lastTecnicoResponsavel: string | null;
  lastCrea: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ReadingValues {
  valor?: number;
  horimetro?: number;
  nivel?: number;
  vazao?: number;
  t1?: number;
  t2?: number;
  t3?: number;
}

export interface Reading {
  id: string;
  itemId: string;
  date: string; // YYYY-MM-DD
  recordedAt: string;
  values: ReadingValues;
  observacoes: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}
