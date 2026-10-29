export type TerminalId = 'SPRB' | 'BITCO';
export type ZoneType = 'CUBIERTA' | 'DESCUBIERTA';

export interface YardItem {
  id: string; // e.g., '4Y5', 'B15', 'PATCO'
  name: string;
  terminal: TerminalId;
  zone: ZoneType;
  areaTotalM2: number;
  currentOccupiedM2: number;
  criticalThreshold?: number; // default 92%
  warningThreshold?: number;  // default 75%
  updatedAt?: string;
  notes?: string;
}

export interface YardCalculated extends YardItem {
  occupancyPct: number;
  availableM2: number;
  weightInTerminalPct: number;
  weightInGlobalPct: number;
  weightedContributionToTerminalPct: number;
  weightedContributionToGlobalPct: number;
  status: 'OPTIMAL' | 'WARNING' | 'ALERT' | 'CRITICAL';
}

export interface ZoneSummary {
  zone: ZoneType;
  areaTotalM2: number;
  occupiedM2: number;
  availableM2: number;
  weightInTerminalPct: number; // Porcentaje de participación dentro de su respectiva IP
  weightInGlobalPct: number;
  weightedOccupancyPct: number; // Ocupación real ponderada dentro de la zona de esa IP
  status: 'OPTIMAL' | 'WARNING' | 'ALERT' | 'CRITICAL';
}

export interface TerminalMetrics {
  terminal: TerminalId;
  name: string;
  areaTotalM2: number;
  occupiedM2: number;
  availableM2: number;
  weightedOccupancyPct: number;
  weightInGlobalPct: number; // 47.03% para SPRB, 52.97% para BITCO
  cubierta: ZoneSummary;     // Manejada de forma separada por IP
  descubierta: ZoneSummary;  // Manejada de forma separada por IP
  yards: YardCalculated[];
  status: 'OPTIMAL' | 'WARNING' | 'ALERT' | 'CRITICAL';
  criticalYardsCount: number;
  warningYardsCount: number;
}

export interface ConsolidatedMetrics {
  totalAreaM2: number; // 53,048 m²
  occupiedM2: number;
  availableM2: number;
  weightedOccupancyPct: number;
  status: 'OPTIMAL' | 'WARNING' | 'ALERT' | 'CRITICAL';
  // Terminales segregadas geográficamente
  sprb: TerminalMetrics;
  bitco: TerminalMetrics;
  // Totales de referencia global
  cubierta: {
    areaTotalM2: number; // 7,924
    occupiedM2: number;
    availableM2: number;
    weightedOccupancyPct: number;
    weightInGlobalPct: number;
  };
  descubierta: {
    areaTotalM2: number; // 45,124
    occupiedM2: number;
    availableM2: number;
    weightedOccupancyPct: number;
    weightInGlobalPct: number;
  };
  allYards: YardCalculated[];
}

export interface HistoricalRecord {
  date: string; // YYYY-MM-DD
  label: string;
  globalOccupiedM2: number;
  globalOccupancyPct: number;
  sprbOccupiedM2: number;
  sprbOccupancyPct: number;
  bitcoOccupiedM2: number;
  bitcoOccupancyPct: number;
  // Zonas segregadas por IP
  sprbCubiertaPct: number;
  sprbDescubiertaPct: number;
  bitcoCubiertaPct: number;
  bitcoDescubiertaPct: number;
  yardOccupancies: Record<string, number>; // yardId -> occupiedM2
}

export interface CapacityAlert {
  id: string;
  yardId: string;
  yardName: string;
  terminal: TerminalId;
  zone: ZoneType;
  severity: 'CRITICAL' | 'ALERT' | 'WARNING';
  occupancyPct: number;
  availableM2: number;
  totalM2: number;
  message: string;
  recommendation: string;
  timestamp: string;
}

export interface SheetValidationAlert {
  id: string;
  type: 'CODE_MISMATCH' | 'NON_NUMERIC_VALUE' | 'MISSING_DATE' | 'SYNC_ERROR';
  severity: 'CRITICAL' | 'ALERT' | 'WARNING';
  sheetName: string;
  rowNumber?: number;
  colName?: string;
  code?: string;
  date?: string;
  rawValue?: string;
  message: string;
  recommendation: string;
  timestamp: string;
}

export interface DirectSheetSyncConfig {
  spreadsheetUrl: string;
  spreadsheetId: string;
  autoSync: boolean;
  syncIntervalMinutes: number;
  lastSyncedAt?: string;
  detectedSheets: string[];
  totalRecordsSynced: number;
  activeMonth?: string;
}

export interface DirectSyncResult {
  updatedYards: YardItem[];
  history: HistoricalRecord[];
  alerts: SheetValidationAlert[];
  sheetsProcessed: string[];
  datesFound: string[];
  totalCellsProcessed: number;
  unrecognizedCodes: string[];
  nonNumericCount: number;
}

