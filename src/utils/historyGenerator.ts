import { HistoricalRecord, YardItem } from '../types/occupancy';

export function generateHistoricalData(currentYards: YardItem[], daysCount: number = 30): HistoricalRecord[] {
  const records: HistoricalRecord[] = [];
  const today = new Date();

  // Baseline occupied m2 by yard
  const baseOccupied = currentYards.reduce<Record<string, number>>((acc, y) => {
    acc[y.id] = y.currentOccupiedM2;
    return acc;
  }, {});

  const sprbTotalArea = currentYards.filter((y) => y.terminal === 'SPRB').reduce((sum, y) => sum + y.areaTotalM2, 0) || 24948;
  const bitcoTotalArea = currentYards.filter((y) => y.terminal === 'BITCO').reduce((sum, y) => sum + y.areaTotalM2, 0) || 28100;
  const globalTotalArea = sprbTotalArea + bitcoTotalArea || 53048;

  // Zonas segregadas por IP
  const sprbCubTotalArea = currentYards.filter((y) => y.terminal === 'SPRB' && y.zone === 'CUBIERTA').reduce((sum, y) => sum + y.areaTotalM2, 0) || 5824;
  const sprbDescTotalArea = currentYards.filter((y) => y.terminal === 'SPRB' && y.zone === 'DESCUBIERTA').reduce((sum, y) => sum + y.areaTotalM2, 0) || 19124;
  const bitcoCubTotalArea = currentYards.filter((y) => y.terminal === 'BITCO' && y.zone === 'CUBIERTA').reduce((sum, y) => sum + y.areaTotalM2, 0) || 2100;
  const bitcoDescTotalArea = currentYards.filter((y) => y.terminal === 'BITCO' && y.zone === 'DESCUBIERTA').reduce((sum, y) => sum + y.areaTotalM2, 0) || 26000;

  for (let i = daysCount - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const dayLabel = d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' });

    // Deterministic pseudo-random variation based on date index
    const wave = Math.sin((30 - i) * 0.45) * 0.08 + Math.cos((30 - i) * 0.2) * 0.05;
    const factor = Math.max(0.45, Math.min(0.95, 1 - (i * 0.003) + wave));

    const dayYardOccupancies: Record<string, number> = {};
    let sprbCubOccupied = 0;
    let sprbDescOccupied = 0;
    let bitcoCubOccupied = 0;
    let bitcoDescOccupied = 0;

    for (const y of currentYards) {
      let yardOcc: number;
      if (i === 0) {
        // Today is exactly the current state
        yardOcc = baseOccupied[y.id];
      } else {
        // Variance per yard
        const yardHash = (y.id.charCodeAt(0) + (y.id.charCodeAt(1) || 0)) % 7;
        const individualWave = Math.sin((i + yardHash) * 0.6) * 0.06;
        const occ = Math.round(baseOccupied[y.id] * (factor + individualWave));
        yardOcc = Math.max(50, Math.min(y.areaTotalM2, occ));
      }

      dayYardOccupancies[y.id] = yardOcc;

      if (y.terminal === 'SPRB') {
        if (y.zone === 'CUBIERTA') {
          sprbCubOccupied += yardOcc;
        } else {
          sprbDescOccupied += yardOcc;
        }
      } else {
        if (y.zone === 'CUBIERTA') {
          bitcoCubOccupied += yardOcc;
        } else {
          bitcoDescOccupied += yardOcc;
        }
      }
    }

    const sprbOccupied = sprbCubOccupied + sprbDescOccupied;
    const bitcoOccupied = bitcoCubOccupied + bitcoDescOccupied;
    const globalOccupied = sprbOccupied + bitcoOccupied;

    records.push({
      date: dateStr,
      label: dayLabel,
      globalOccupiedM2: globalOccupied,
      globalOccupancyPct: (globalOccupied / globalTotalArea) * 100,
      sprbOccupiedM2: sprbOccupied,
      sprbOccupancyPct: (sprbOccupied / sprbTotalArea) * 100,
      bitcoOccupiedM2: bitcoOccupied,
      bitcoOccupancyPct: (bitcoOccupied / bitcoTotalArea) * 100,
      // Zonas segregadas por IP
      sprbCubiertaPct: (sprbCubOccupied / sprbCubTotalArea) * 100,
      sprbDescubiertaPct: (sprbDescOccupied / sprbDescTotalArea) * 100,
      bitcoCubiertaPct: (bitcoCubOccupied / bitcoCubTotalArea) * 100,
      bitcoDescubiertaPct: (bitcoDescOccupied / bitcoDescTotalArea) * 100,
      yardOccupancies: dayYardOccupancies,
    });
  }

  return records;
}
