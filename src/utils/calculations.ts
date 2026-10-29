import {
  YardItem,
  YardCalculated,
  ZoneSummary,
  TerminalMetrics,
  ConsolidatedMetrics,
  CapacityAlert,
  TerminalId,
} from '../types/occupancy';

export function calculateStatus(occupancyPct: number): 'OPTIMAL' | 'WARNING' | 'ALERT' | 'CRITICAL' {
  if (occupancyPct >= 92) return 'CRITICAL';
  if (occupancyPct >= 85) return 'ALERT';
  if (occupancyPct >= 75) return 'WARNING';
  return 'OPTIMAL';
}

export function computeMetrics(yards: YardItem[]): ConsolidatedMetrics {
  // Terminal totals
  const sprbYardsRaw = yards.filter((y) => y.terminal === 'SPRB');
  const bitcoYardsRaw = yards.filter((y) => y.terminal === 'BITCO');

  const sprbTotalArea = sprbYardsRaw.reduce((sum, y) => sum + y.areaTotalM2, 0) || 24948;
  const bitcoTotalArea = bitcoYardsRaw.reduce((sum, y) => sum + y.areaTotalM2, 0) || 28100;
  const globalTotalArea = sprbTotalArea + bitcoTotalArea || 53048;

  // Calculate each yard's weighted figures
  const calculatedYards: YardCalculated[] = yards.map((y) => {
    const termTotal = y.terminal === 'SPRB' ? sprbTotalArea : bitcoTotalArea;
    const occPct = y.areaTotalM2 > 0 ? (y.currentOccupiedM2 / y.areaTotalM2) * 100 : 0;
    const availM2 = Math.max(0, y.areaTotalM2 - y.currentOccupiedM2);
    const weightInTerminalPct = termTotal > 0 ? (y.areaTotalM2 / termTotal) * 100 : 0;
    const weightInGlobalPct = globalTotalArea > 0 ? (y.areaTotalM2 / globalTotalArea) * 100 : 0;
    const weightedContributionToTerminalPct = (occPct * weightInTerminalPct) / 100;
    const weightedContributionToGlobalPct = (occPct * weightInGlobalPct) / 100;

    return {
      ...y,
      occupancyPct: occPct,
      availableM2: availM2,
      weightInTerminalPct,
      weightInGlobalPct,
      weightedContributionToTerminalPct,
      weightedContributionToGlobalPct,
      status: calculateStatus(occPct),
    };
  });

  // Calculate terminal metrics
  function buildTerminalMetrics(termId: TerminalId, termName: string, termYards: YardCalculated[], termArea: number): TerminalMetrics {
    const cubiertaYards = termYards.filter((y) => y.zone === 'CUBIERTA');
    const descubiertaYards = termYards.filter((y) => y.zone === 'DESCUBIERTA');

    const cubTotal = cubiertaYards.reduce((acc, y) => acc + y.areaTotalM2, 0);
    const cubOccupied = cubiertaYards.reduce((acc, y) => acc + y.currentOccupiedM2, 0);
    const cubAvail = Math.max(0, cubTotal - cubOccupied);
    const cubPct = cubTotal > 0 ? (cubOccupied / cubTotal) * 100 : 0;
    const cubWeightInTerm = termArea > 0 ? (cubTotal / termArea) * 100 : 0;
    const cubWeightInGlob = globalTotalArea > 0 ? (cubTotal / globalTotalArea) * 100 : 0;

    const descTotal = descubiertaYards.reduce((acc, y) => acc + y.areaTotalM2, 0);
    const descOccupied = descubiertaYards.reduce((acc, y) => acc + y.currentOccupiedM2, 0);
    const descAvail = Math.max(0, descTotal - descOccupied);
    const descPct = descTotal > 0 ? (descOccupied / descTotal) * 100 : 0;
    const descWeightInTerm = termArea > 0 ? (descTotal / termArea) * 100 : 0;
    const descWeightInGlob = globalTotalArea > 0 ? (descTotal / globalTotalArea) * 100 : 0;

    const totalOccupied = cubOccupied + descOccupied;
    const totalAvail = Math.max(0, termArea - totalOccupied);
    const weightedOccupancyPct = termArea > 0 ? (totalOccupied / termArea) * 100 : 0;
    const weightInGlobalPct = globalTotalArea > 0 ? (termArea / globalTotalArea) * 100 : 0;

    const cubiertaSummary: ZoneSummary = {
      zone: 'CUBIERTA',
      areaTotalM2: cubTotal,
      occupiedM2: cubOccupied,
      availableM2: cubAvail,
      weightInTerminalPct: cubWeightInTerm,
      weightInGlobalPct: cubWeightInGlob,
      weightedOccupancyPct: cubPct,
      status: calculateStatus(cubPct),
    };

    const descubiertaSummary: ZoneSummary = {
      zone: 'DESCUBIERTA',
      areaTotalM2: descTotal,
      occupiedM2: descOccupied,
      availableM2: descAvail,
      weightInTerminalPct: descWeightInTerm,
      weightInGlobalPct: descWeightInGlob,
      weightedOccupancyPct: descPct,
      status: calculateStatus(descPct),
    };

    const criticalCount = termYards.filter((y) => y.status === 'CRITICAL' || y.status === 'ALERT').length;
    const warningCount = termYards.filter((y) => y.status === 'WARNING').length;

    return {
      terminal: termId,
      name: termName,
      areaTotalM2: termArea,
      occupiedM2: totalOccupied,
      availableM2: totalAvail,
      weightedOccupancyPct,
      weightInGlobalPct,
      cubierta: cubiertaSummary,
      descubierta: descubiertaSummary,
      yards: termYards,
      status: calculateStatus(weightedOccupancyPct),
      criticalYardsCount: criticalCount,
      warningYardsCount: warningCount,
    };
  }

  const sprbMetrics = buildTerminalMetrics(
    'SPRB',
    'Sociedad Portuaria Regional de Barranquilla (SPRB)',
    calculatedYards.filter((y) => y.terminal === 'SPRB'),
    sprbTotalArea
  );

  const bitcoMetrics = buildTerminalMetrics(
    'BITCO',
    'Barranquilla International Terminal Company (BITCO)',
    calculatedYards.filter((y) => y.terminal === 'BITCO'),
    bitcoTotalArea
  );

  // Global zone sums
  const globalCubiertaTotal = sprbMetrics.cubierta.areaTotalM2 + bitcoMetrics.cubierta.areaTotalM2;
  const globalCubiertaOccupied = sprbMetrics.cubierta.occupiedM2 + bitcoMetrics.cubierta.occupiedM2;
  const globalCubiertaPct = globalCubiertaTotal > 0 ? (globalCubiertaOccupied / globalCubiertaTotal) * 100 : 0;

  const globalDescubiertaTotal = sprbMetrics.descubierta.areaTotalM2 + bitcoMetrics.descubierta.areaTotalM2;
  const globalDescubiertaOccupied = sprbMetrics.descubierta.occupiedM2 + bitcoMetrics.descubierta.occupiedM2;
  const globalDescubiertaPct = globalDescubiertaTotal > 0 ? (globalDescubiertaOccupied / globalDescubiertaTotal) * 100 : 0;

  const totalOccupiedGlobal = sprbMetrics.occupiedM2 + bitcoMetrics.occupiedM2;
  const totalAvailGlobal = Math.max(0, globalTotalArea - totalOccupiedGlobal);
  const globalWeightedOccupancyPct = globalTotalArea > 0 ? (totalOccupiedGlobal / globalTotalArea) * 100 : 0;

  return {
    totalAreaM2: globalTotalArea,
    occupiedM2: totalOccupiedGlobal,
    availableM2: totalAvailGlobal,
    weightedOccupancyPct: globalWeightedOccupancyPct,
    status: calculateStatus(globalWeightedOccupancyPct),
    cubierta: {
      areaTotalM2: globalCubiertaTotal,
      occupiedM2: globalCubiertaOccupied,
      availableM2: Math.max(0, globalCubiertaTotal - globalCubiertaOccupied),
      weightedOccupancyPct: globalCubiertaPct,
      weightInGlobalPct: globalTotalArea > 0 ? (globalCubiertaTotal / globalTotalArea) * 100 : 0,
    },
    descubierta: {
      areaTotalM2: globalDescubiertaTotal,
      occupiedM2: globalDescubiertaOccupied,
      availableM2: Math.max(0, globalDescubiertaTotal - globalDescubiertaOccupied),
      weightedOccupancyPct: globalDescubiertaPct,
      weightInGlobalPct: globalTotalArea > 0 ? (globalDescubiertaTotal / globalTotalArea) * 100 : 0,
    },
    sprb: sprbMetrics,
    bitco: bitcoMetrics,
    allYards: calculatedYards,
  };
}

export function generateAlerts(yards: YardCalculated[]): CapacityAlert[] {
  const alerts: CapacityAlert[] = [];
  const now = new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });

  for (const y of yards) {
    if (y.occupancyPct >= 92) {
      alerts.push({
        id: `alert-${y.id}-${Date.now()}`,
        yardId: y.id,
        yardName: y.name,
        terminal: y.terminal,
        zone: y.zone,
        severity: 'CRITICAL',
        occupancyPct: y.occupancyPct,
        availableM2: y.availableM2,
        totalM2: y.areaTotalM2,
        message: `Saturación crítica en ${y.name} (${y.occupancyPct.toFixed(1)}%). Quedan solo ${y.availableM2.toLocaleString('es-CO')} m² libres.`,
        recommendation: `Desviar arribo de carga a patios alternos de ${y.terminal} o coordinar retiro prioritario con agentes de aduana.`,
        timestamp: now,
      });
    } else if (y.occupancyPct >= 85) {
      alerts.push({
        id: `alert-${y.id}-${Date.now()}`,
        yardId: y.id,
        yardName: y.name,
        terminal: y.terminal,
        zone: y.zone,
        severity: 'ALERT',
        occupancyPct: y.occupancyPct,
        availableM2: y.availableM2,
        totalM2: y.areaTotalM2,
        message: `Capacidad de almacenamiento en riesgo en ${y.name} (${y.occupancyPct.toFixed(1)}%).`,
        recommendation: `Acelerar inspección física y pre-asignar espacio contiguo para evitar estancamiento operativo.`,
        timestamp: now,
      });
    } else if (y.occupancyPct >= 75) {
      alerts.push({
        id: `alert-${y.id}-${Date.now()}`,
        yardId: y.id,
        yardName: y.name,
        terminal: y.terminal,
        zone: y.zone,
        severity: 'WARNING',
        occupancyPct: y.occupancyPct,
        availableM2: y.availableM2,
        totalM2: y.areaTotalM2,
        message: `Nivel de ocupación preventivo en ${y.name} (${y.occupancyPct.toFixed(1)}%).`,
        recommendation: `Monitorear rotación en los turnos de muelle durante las próximas 12 horas.`,
        timestamp: now,
      });
    }
  }

  // Sort: CRITICAL first, then ALERT, then WARNING; then by highest occupancyPct descending
  const severityRank: Record<string, number> = { CRITICAL: 3, ALERT: 2, WARNING: 1 };
  return alerts.sort((a, b) => {
    if (severityRank[b.severity] !== severityRank[a.severity]) {
      return severityRank[b.severity] - severityRank[a.severity];
    }
    return b.occupancyPct - a.occupancyPct;
  });
}
