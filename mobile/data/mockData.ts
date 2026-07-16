// DEV-ONLY mock dataset for local UI testing without the backend.
// Activated by EXPO_PUBLIC_USE_MOCK=1 (see AppContext). Never bundled into a
// normal build — production loads master data from the API (ADR 0006).
//
// Covers every new UI branch:
//   • a plain hidrômetro            (baseline, no horímetro, active)
//   • a horímetro-equipped hidrômetro with a filled + a PENDING reading
//   • a disabled (retired) hidrômetro with history
import { Area, MonitoredItem, Reading } from '@/types';

const AREA_ID = 'aaaaaaaa-0000-4000-8000-000000000001';

export const mockAreas: Area[] = [
  { id: AREA_ID, name: 'Monjolinho (MOCK)', frequency: 'daily' },
];

export const mockItems: MonitoredItem[] = [
  {
    id: 'bbbbbbbb-0000-4000-8000-000000000001',
    areaId: AREA_ID,
    name: 'Pavisan 02 (MOCK)',
    type: 'hidrometro',
    limiteOutorgado: 65,
    horasOperacao: 24,
    unit: 'm³',
    hasHorimetro: false,
    disabled: false,
  },
  {
    id: 'bbbbbbbb-0000-4000-8000-000000000002',
    areaId: AREA_ID,
    name: 'Captação NOVO (MOCK)',
    type: 'hidrometro',
    limiteOutorgado: 22.36,
    horasOperacao: 24,
    unit: 'm³',
    hasHorimetro: true, // ← horímetro field + horas-operadas stat + pending marker
    disabled: false,
  },
  {
    id: 'bbbbbbbb-0000-4000-8000-000000000003',
    areaId: AREA_ID,
    name: 'Captação (MOCK, desativado)',
    type: 'hidrometro',
    limiteOutorgado: 22.36,
    horasOperacao: 24,
    unit: 'm³',
    hasHorimetro: false,
    disabled: true, // ← greyed + "Desativado" badge, FAB hidden, still viewable/editable
  },
];

const synced = (iso: string) => ({ isDirty: false, syncedAt: iso });

export const mockReadings: Reading[] = [
  // Plain hidrômetro
  {
    id: 'cccccccc-0000-4000-8000-000000000001',
    itemId: 'bbbbbbbb-0000-4000-8000-000000000001',
    date: '2026-07-12',
    recordedAt: '2026-07-12T09:00:00.000Z',
    values: { valor: 200 },
    ...synced('2026-07-12T09:05:00.000Z'),
  },
  // Horímetro-equipped: filled → pending → filled (horas operadas = 160 − 120 = 40)
  {
    id: 'cccccccc-0000-4000-8000-000000000010',
    itemId: 'bbbbbbbb-0000-4000-8000-000000000002',
    date: '2026-07-05',
    recordedAt: '2026-07-05T09:00:00.000Z',
    values: { valor: 1000, horimetro: 120 },
    ...synced('2026-07-05T09:05:00.000Z'),
  },
  {
    id: 'cccccccc-0000-4000-8000-000000000011',
    itemId: 'bbbbbbbb-0000-4000-8000-000000000002',
    date: '2026-07-10',
    recordedAt: '2026-07-10T09:00:00.000Z',
    values: { valor: 1050 }, // ← horímetro blank → "Horímetro pendente"
    ...synced('2026-07-10T09:05:00.000Z'),
  },
  {
    id: 'cccccccc-0000-4000-8000-000000000012',
    itemId: 'bbbbbbbb-0000-4000-8000-000000000002',
    date: '2026-07-15',
    recordedAt: '2026-07-15T09:00:00.000Z',
    values: { valor: 1100, horimetro: 160 },
    ...synced('2026-07-15T09:05:00.000Z'),
  },
  // Disabled item — history preserved
  {
    id: 'cccccccc-0000-4000-8000-000000000020',
    itemId: 'bbbbbbbb-0000-4000-8000-000000000003',
    date: '2026-07-01',
    recordedAt: '2026-07-01T09:00:00.000Z',
    values: { valor: 500 },
    ...synced('2026-07-01T09:05:00.000Z'),
  },
  {
    id: 'cccccccc-0000-4000-8000-000000000021',
    itemId: 'bbbbbbbb-0000-4000-8000-000000000003',
    date: '2026-07-08',
    recordedAt: '2026-07-08T09:00:00.000Z',
    values: { valor: 540 },
    ...synced('2026-07-08T09:05:00.000Z'),
  },
];
