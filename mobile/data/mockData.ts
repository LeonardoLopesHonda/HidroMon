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
  // Monjolinho — Hidrômetros (5 items, daily)
  { id: 'mon-h1', areaId: 'monjolinho', name: 'Capitação - Out3892 - DURH2450',         type: 'hidrometro', limiteOutorgado: 3000, horasOperacao: 24, unit: 'm³' },
  { id: 'mon-h2', areaId: 'monjolinho', name: 'Pavisan 02 - Out3895 - DURH19146',       type: 'hidrometro', limiteOutorgado: 2500, horasOperacao: 24, unit: 'm³' },
  { id: 'mon-h3', areaId: 'monjolinho', name: 'Poço 1 Viveiro - Out4085 - DURH20484',   type: 'hidrometro', limiteOutorgado: 1800, horasOperacao: 20, unit: 'm³' },
  { id: 'mon-h4', areaId: 'monjolinho', name: 'Poço 2 Captação - Out4085 - DURH20485', type: 'hidrometro', limiteOutorgado: 1800, horasOperacao: 20, unit: 'm³' },
  { id: 'mon-h5', areaId: 'monjolinho', name: 'Poço 4 Novo - Out4085 - DURH20487',     type: 'hidrometro', limiteOutorgado: 1800, horasOperacao: 20, unit: 'm³' },
  // Monjolinho — Pluviômetro (1 item, daily)
  { id: 'mon-p1', areaId: 'monjolinho', name: 'Pluviômetro Mina Monjolinho', type: 'pluviometro', limiteOutorgado: 0, horasOperacao: 24, unit: 'mm' },
  // Laís (decommissioned) — Pluviômetros (3 items, weekly)
  { id: 'lais-p1', areaId: 'lais', name: 'Barragem Sul',       type: 'pluviometro', limiteOutorgado: 0, horasOperacao: 24, unit: 'mm' },
  { id: 'lais-p2', areaId: 'lais', name: 'Colúvio Sul PRAD',   type: 'pluviometro', limiteOutorgado: 0, horasOperacao: 24, unit: 'mm' },
  { id: 'lais-p3', areaId: 'lais', name: 'Mirante',            type: 'pluviometro', limiteOutorgado: 0, horasOperacao: 24, unit: 'mm' },
  // Laís (decommissioned) — Córregos (2 régua + 1 tambor, weekly)
  { id: 'lais-c1', areaId: 'lais', name: 'Córrego das Pedras',  type: 'corrego', corregoMethod: 'regua',  limiteOutorgado: 0, horasOperacao: 24, unit: 'm³/s' },
  { id: 'lais-c2', areaId: 'lais', name: 'Baia Sul',            type: 'corrego', corregoMethod: 'regua',  limiteOutorgado: 0, horasOperacao: 24, unit: 'm³/s' },
  { id: 'lais-c3', areaId: 'lais', name: 'Córrego Arigolândia', type: 'corrego', corregoMethod: 'tambor', limiteOutorgado: 0, horasOperacao: 24, unit: 'L/s' },
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

    if (item.type === 'hidrometro') base = 800 + rng() * 200;
    else if (item.type === 'pluviometro') base = 5 + rng() * 10;
    else if (item.corregoMethod === 'tambor') base = 45 + rng() * 30; // base fill time in seconds
    else base = 0.2 + rng() * 0.4; // base nivel in metres for regua

    for (let d = 0; d < 90; d++) {
      // ~70% chance of having a reading on any given day
      if (rng() > 0.30) {
        const date = addDays(startStr, d);
        let values: Record<string, number>;

        if (item.type === 'hidrometro') {
          const leitura = Math.round((base + rng() * 20 - 5) * 10) / 10;
          base = Math.max(base, leitura); // odometer never goes backwards
          values = { leitura: base };
        } else if (item.type === 'pluviometro') {
          const precipitacao = Math.round(Math.max(0, base + rng() * 15 - 8) * 10) / 10;
          base = precipitacao;
          values = { precipitacao };
        } else if (item.corregoMethod === 'tambor') {
          const avgTime = Math.round((base + rng() * 10 - 5) * 10) / 10;
          base = Math.max(10, avgTime);
          const spread = rng() * 3;
          values = {
            t1: Math.round(Math.max(5, base - spread) * 10) / 10,
            t2: Math.round(Math.max(5, base + rng() * 2 - 1) * 10) / 10,
            t3: Math.round(Math.max(5, base + spread) * 10) / 10,
          };
        } else {
          // regua — store nivel in metres only; flow derived by backend
          const nivel = Math.round(Math.max(0.05, base + rng() * 0.2 - 0.1) * 100) / 100;
          base = nivel;
          values = { nivel };
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
