import { Area, MonitoredItem, Reading } from '@/types';

// Deterministic LCG pseudo-random (avoids non-reproducible mock data)
function makePRNG(seed: number) {
  let s = seed;
  return () => {
    s = (Math.imul(1664525, s) + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

const rng = makePRNG(42);

export const MOCK_AREAS: Area[] = [
  { id: 'monjolinho', name: 'Monjolinho', frequency: 'daily' },
  { id: 'lais', name: 'Laís', frequency: 'weekly' }, // decommissioned site
];

export const MOCK_ITEMS: MonitoredItem[] = [
  // Monjolinho — Hidrômetros
  { id: 'mon-h1', areaId: 'monjolinho', name: 'Hidrômetro 01', type: 'hidrometro', limiteOutorgado: 3000, horasOperacao: 24, unit: 'm³' },
  { id: 'mon-h2', areaId: 'monjolinho', name: 'Hidrômetro 02', type: 'hidrometro', limiteOutorgado: 2500, horasOperacao: 24, unit: 'm³' },
  { id: 'mon-h3', areaId: 'monjolinho', name: 'Hidrômetro 03', type: 'hidrometro', limiteOutorgado: 1800, horasOperacao: 20, unit: 'm³' },
  // Monjolinho — Pluviômetros
  { id: 'mon-p1', areaId: 'monjolinho', name: 'Pluviômetro 01', type: 'pluviometro', limiteOutorgado: 0, horasOperacao: 24, unit: 'mm' },
  { id: 'mon-p2', areaId: 'monjolinho', name: 'Pluviômetro 02', type: 'pluviometro', limiteOutorgado: 0, horasOperacao: 24, unit: 'mm' },
  // Laís (decommissioned) — Córregos only
  { id: 'lais-c1', areaId: 'lais', name: 'Córrego das Laís', type: 'corrego', limiteOutorgado: 0, horasOperacao: 24, unit: 'm³/s' },
  { id: 'lais-c2', areaId: 'lais', name: 'Córrego Pedregulho', type: 'corrego', limiteOutorgado: 0, horasOperacao: 24, unit: 'm³/s' },
];

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T12:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function generateReadings(): Reading[] {
  const readings: Reading[] = [];

  // Generate 90 days back from today
  const today = new Date();
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - 89);
  const startStr = startDate.toISOString().slice(0, 10);

  for (const item of MOCK_ITEMS) {
    let base = 0;

    if (item.type === 'hidrometro') base = 80 + rng() * 40;
    else if (item.type === 'pluviometro') base = 5 + rng() * 10;
    else base = 30 + rng() * 20; // nivel cm for corregos

    for (let d = 0; d < 90; d++) {
      // ~70% chance of having a reading on any given day
      if (rng() > 0.30) {
        const date = addDays(startStr, d);
        let values: Record<string, number>;

        if (item.type === 'hidrometro') {
          const leitura = Math.round((base + rng() * 20 - 5) * 10) / 10;
          base = leitura;
          values = { leitura };
        } else if (item.type === 'pluviometro') {
          const precipitacao = Math.round((Math.max(0, base + rng() * 15 - 8)) * 10) / 10;
          base = precipitacao;
          values = { precipitacao };
        } else {
          const nivel = Math.round((Math.max(5, base + rng() * 10 - 4)) * 10) / 10;
          base = nivel;
          const vazao = Math.round((nivel * 0.003 + rng() * 0.02 - 0.01) * 1000) / 1000;
          values = { nivel, vazao: Math.max(0.001, vazao) };
        }

        readings.push({
          id: `mock-${item.id}-${date}`,
          itemId: item.id,
          date,
          values,
          isDirty: false,
          syncedAt: null,
        });
      }
    }
  }

  return readings;
}

export const MOCK_READINGS: Reading[] = generateReadings();
