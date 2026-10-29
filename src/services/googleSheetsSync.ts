import * as XLSX from 'xlsx';
import {
  YardItem,
  HistoricalRecord,
  SheetValidationAlert,
  DirectSyncResult,
} from '../types/occupancy';
import { CONSTANTS } from '../data/initialYards';

/**
 * Utility to convert column index (0-based) to Excel/Sheets column letters (A, B, ..., Z, AA, AB)
 */
export function getColLetter(colIndex: number): string {
  let temp = colIndex;
  let letter = '';
  while (temp >= 0) {
    letter = String.fromCharCode((temp % 26) + 65) + letter;
    temp = Math.floor(temp / 26) - 1;
  }
  return letter;
}

/**
 * Extracts a clean Google Spreadsheet ID from either a raw ID or a full Google Sheets URL
 */
export function extractSpreadsheetId(urlOrId: string): string {
  if (!urlOrId) return '';
  const trimmed = urlOrId.trim();

  // Pattern for /spreadsheets/d/([a-zA-Z0-9-_]+)
  const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match && match[1]) {
    return match[1];
  }

  // Pattern for /file/d/([a-zA-Z0-9-_]+)
  const fileMatch = trimmed.match(/\/file\/d\/([a-zA-Z0-9-_]+)/);
  if (fileMatch && fileMatch[1]) {
    return fileMatch[1];
  }

  // Pattern for ?id=([a-zA-Z0-9-_]+)
  const idParamMatch = trimmed.match(/[?&]id=([a-zA-Z0-9-_]+)/);
  if (idParamMatch && idParamMatch[1]) {
    return idParamMatch[1];
  }

  // If already an ID (alphanumeric, dashes, underscores, length >= 20)
  if (/^[a-zA-Z0-9-_]{20,}$/.test(trimmed)) {
    return trimmed;
  }

  return trimmed;
}

const MONTH_NAMES_ES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];

/**
 * Identifies the month number (1-12) from a sheet title
 */
export function getMonthFromSheetName(sheetName: string): number | null {
  const clean = sheetName.toLowerCase().trim();
  for (let i = 0; i < MONTH_NAMES_ES.length; i++) {
    if (clean.includes(MONTH_NAMES_ES[i])) {
      return i + 1;
    }
  }

  // Check numeric prefixes like "01", "02", "1 -", "01-"
  const numMatch = clean.match(/\b(0?[1-9]|1[0-2])\b/);
  if (numMatch && numMatch[1]) {
    return parseInt(numMatch[1], 10);
  }

  return null;
}

/**
 * Normalizes yard code for comparison (e.g., 'P10-12' -> 'P1012', 'BOD-B' -> 'BODB')
 */
function normalizeCode(str: string): string {
  return str.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
}

/**
 * Parses raw grid rows from a 2026 month sheet according to user specification:
 * - Dates in row 2 from Column B onwards
 * - Yard codes in Column A from row 2 / 3
 * - Values are interpreted as %
 * - Alerts on unrecognized codes
 * - Alerts on non-numeric values
 * - Empty cells treated as empty / unrecorded
 */
export function parseMonthSheetGrid(
  sheetName: string,
  rows: any[][],
  masterYards: YardItem[]
): {
  dailyYardPct: Record<string, Record<string, number>>; // date -> (yardId -> pct)
  alerts: SheetValidationAlert[];
  unrecognizedCodes: string[];
  nonNumericCount: number;
  datesFound: string[];
} {
  const alerts: SheetValidationAlert[] = [];
  const unrecognizedCodes: string[] = [];
  let nonNumericCount = 0;
  const dailyYardPct: Record<string, Record<string, number>> = {};
  const datesFoundSet = new Set<string>();

  if (!rows || rows.length < 2) {
    return { dailyYardPct, alerts, unrecognizedCodes, nonNumericCount, datesFound: [] };
  }

  const defaultMonth = getMonthFromSheetName(sheetName) || 1;

  // Step 1: Detect date row (check row index 1 / Row 2 first as requested, or row index 0 as fallback)
  let dateRowIndex = 1;
  if (rows.length > 1 && rows[1] && rows[1].slice(1).some((cell) => isPotentialDateCell(cell))) {
    dateRowIndex = 1; // Row 2 (0-indexed 1)
  } else if (rows[0] && rows[0].slice(1).some((cell) => isPotentialDateCell(cell))) {
    dateRowIndex = 0; // Row 1 (0-indexed 0)
  }

  const dateHeaders = rows[dateRowIndex] || [];
  const colDateMap: Record<number, string> = {};

  for (let colIdx = 1; colIdx < dateHeaders.length; colIdx++) {
    const rawVal = dateHeaders[colIdx];
    if (rawVal === undefined || rawVal === null || String(rawVal).trim() === '') {
      continue;
    }

    const cleanDate = parseDateHeader(rawVal, defaultMonth, 2026);
    if (cleanDate) {
      colDateMap[colIdx] = cleanDate;
    }
  }

  // Pre-build index of master yards for fast matching
  const masterByCode = new Map<string, YardItem>();
  const masterByNormalized = new Map<string, YardItem>();
  for (const y of masterYards) {
    masterByCode.set(y.id.toUpperCase(), y);
    masterByNormalized.set(normalizeCode(y.id), y);
  }

  // Step 2: Parse yard rows from dateRowIndex + 1 onwards
  const startRow = dateRowIndex + 1;

  for (let rowIdx = startRow; rowIdx < rows.length; rowIdx++) {
    const row = rows[rowIdx];
    if (!row || row.length === 0) continue;

    const rawCodeCell = row[0];
    if (rawCodeCell === undefined || rawCodeCell === null || String(rawCodeCell).trim() === '') {
      continue; // Empty row or spacer
    }

    const rawCode = String(rawCodeCell).trim();
    const upperCode = rawCode.toUpperCase();

    // Skip generic non-code table labels
    if (
      [
        'PATIO',
        'PATIOS',
        'BODEGA',
        'BODEGAS',
        'ZONA',
        'ZONAS',
        'CODIGO',
        'CÓDIGO',
        'IP',
        'TERMINAL',
        'FECHA',
        'TOTAL',
        'PROMEDIO',
        'AREA',
        'ÁREA',
      ].includes(upperCode)
    ) {
      continue;
    }

    // Try finding matching master yard
    let matchedYard = masterByCode.get(upperCode);
    if (!matchedYard) {
      matchedYard = masterByNormalized.get(normalizeCode(rawCode));
    }
    // Also try checking if yard name is written (e.g. "PATIO 4Y5" or "BODEGA B15")
    if (!matchedYard) {
      matchedYard = masterYards.find(
        (y) => normalizeCode(y.name) === normalizeCode(rawCode) || upperCode.endsWith(y.id.toUpperCase())
      );
    }

    // If code does NOT match any yard in master: Generate Alert!
    if (!matchedYard) {
      unrecognizedCodes.push(rawCode);
      alerts.push({
        id: `alert-code-mismatch-${sheetName}-${rowIdx + 1}-${rawCode}`,
        type: 'CODE_MISMATCH',
        severity: 'WARNING',
        sheetName,
        rowNumber: rowIdx + 1,
        code: rawCode,
        message: `Código no reconocido: "${rawCode}" en hoja "${sheetName}" (Fila ${rowIdx + 1}). No coincide con el Maestro de Patios y Bodegas.`,
        recommendation: `Verifique la nomenclatura en la columna A o registre la nueva área en el Maestro de Patios.`,
        timestamp: new Date().toLocaleTimeString('es-CO'),
      });
      continue; // Skip calculating occupancy for non-existent yard
    }

    const yardId = matchedYard.id;

    // Step 3: Parse daily percentage values in columns B onwards
    for (const [colIdxStr, dateStr] of Object.entries(colDateMap)) {
      const colIdx = parseInt(colIdxStr, 10);
      const cellVal = row[colIdx];

      // Empty cell check: "si no encuentras valores en alguna celda, interprétalo como celda vacía o sin valores."
      if (cellVal === undefined || cellVal === null || String(cellVal).trim() === '') {
        continue;
      }

      // Check numeric percentage value
      const parsedNum = parsePercentageValue(cellVal);

      if (parsedNum === null) {
        // Non-numeric value alert: "si algún valor no es numérico en el % de ocupacion, genera una alerta"
        nonNumericCount++;
        alerts.push({
          id: `alert-non-numeric-${sheetName}-${rowIdx + 1}-${colIdx}-${yardId}`,
          type: 'NON_NUMERIC_VALUE',
          severity: 'ALERT',
          sheetName,
          rowNumber: rowIdx + 1,
          colName: getColLetter(colIdx),
          code: yardId,
          date: dateStr,
          rawValue: String(cellVal),
          message: `Valor no numérico detectado en hoja "${sheetName}", celda ${getColLetter(colIdx)}${rowIdx + 1} (${dateStr}): "${cellVal}" para el patio "${yardId}".`,
          recommendation: `Corrija el valor ingresado en Google Sheets para reflejar un porcentaje numérico válido (ej: 75% o 0.75). Se omitió del cálculo.`,
          timestamp: new Date().toLocaleTimeString('es-CO'),
        });
      } else {
        // Valid numeric percentage
        if (!dailyYardPct[dateStr]) {
          dailyYardPct[dateStr] = {};
        }
        dailyYardPct[dateStr][yardId] = parsedNum;
        datesFoundSet.add(dateStr);
      }
    }
  }

  return {
    dailyYardPct,
    alerts,
    unrecognizedCodes,
    nonNumericCount,
    datesFound: Array.from(datesFoundSet).sort(),
  };
}

/**
 * Checks if a cell value looks like a date or day number
 */
function isPotentialDateCell(val: any): boolean {
  if (val === undefined || val === null) return false;
  if (val instanceof Date) return true;
  if (typeof val === 'number') {
    // day of month 1..31 or Excel serial date
    if (val >= 1 && val <= 31) return true;
    if (val > 40000 && val < 60000) return true;
  }
  const s = String(val).trim();
  if (!s) return false;
  // number 1..31
  if (/^([1-9]|[12][0-9]|3[01])$/.test(s)) return true;
  // date format like 2026-01-01, 01/01/2026, 01-01-2026, 01-Ene
  if (/\d{1,4}[-/\s]\d{1,2}/.test(s)) return true;
  return false;
}

/**
 * Converts a raw header cell into standard YYYY-MM-DD
 */
function parseDateHeader(raw: any, defaultMonth: number, year = 2026): string | null {
  // If native Date object
  if (raw instanceof Date && !isNaN(raw.getTime())) {
    const y = raw.getFullYear();
    const m = raw.getMonth() + 1;
    const d = raw.getDate();
    return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }

  // If Excel serial date number (e.g., 46000+ for year 2026)
  if (typeof raw === 'number' && raw > 40000 && raw < 60000) {
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
    const dateObj = new Date(excelEpoch.getTime() + raw * 86400000);
    const y = dateObj.getUTCFullYear();
    const m = dateObj.getUTCMonth() + 1;
    const d = dateObj.getUTCDate();
    return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }

  const s = String(raw).trim();

  // If it's a day number like "1", "2", "15", "31"
  const dayMatch = s.match(/^([1-9]|[12][0-9]|3[01])$/);
  if (dayMatch) {
    const day = parseInt(dayMatch[1], 10);
    return `${year}-${String(defaultMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  // If it's ISO date YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    return s.slice(0, 10);
  }

  // If DD/MM/YYYY or DD-MM-YYYY
  const dmyMatch = s.match(/^(\d{1,2})[-/](\d{1,2})(?:[-/](\d{2,4}))?$/);
  if (dmyMatch) {
    const d = parseInt(dmyMatch[1], 10);
    const m = parseInt(dmyMatch[2], 10);
    const y = dmyMatch[3] ? parseInt(dmyMatch[3], 10) : year;
    const fullYear = y < 100 ? 2000 + y : y;
    return `${fullYear}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }

  // Try standard Date.parse
  const parsed = new Date(s);
  if (!isNaN(parsed.getTime())) {
    const y = parsed.getFullYear();
    const m = parsed.getMonth() + 1;
    const d = parsed.getDate();
    return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }

  return null;
}

/**
 * Parses cell value as percentage number:
 * - "85%" -> 85
 * - 0.85 -> 85
 * - 85 -> 85
 * - "85,5" -> 85.5
 * Returns null if non-numeric string (e.g. "cerrado", "N/A", "#REF!")
 */
export function parsePercentageValue(val: any): number | null {
  if (val === undefined || val === null) return null;

  if (typeof val === 'number') {
    if (isNaN(val)) return null;
    if (val > 0 && val <= 1.0) {
      return Number((val * 100).toFixed(2));
    }
    return Number(val.toFixed(2));
  }

  const str = String(val).trim();
  if (!str) return null;

  // Check if string contains illegal non-numeric letters (except %, commas, dots, spaces)
  const cleaned = str.replace('%', '').trim().replace(',', '.');

  // Verify pure numeric format
  if (!/^-?\d+(?:\.\d+)?$/.test(cleaned)) {
    return null;
  }

  const num = parseFloat(cleaned);
  if (isNaN(num)) return null;

  if (num > 0 && num <= 1.0 && str.indexOf('%') === -1) {
    // If entered as 0.75 without % sign, spreadsheet formatted as 75%
    return Number((num * 100).toFixed(2));
  }

  return Number(num.toFixed(2));
}

/**
 * Builds HistoricalRecord items for each date with exact SPRB, BITCO, and Global formulas
 */
export function buildHistoricalRecords(
  dailyYardPct: Record<string, Record<string, number>>,
  masterYards: YardItem[]
): HistoricalRecord[] {
  const dates = Object.keys(dailyYardPct)
    .filter((d) => dailyYardPct[d] && Object.keys(dailyYardPct[d]).length > 0)
    .sort();
  const records: HistoricalRecord[] = [];

  const sprbYardIds = new Set(masterYards.filter((y) => y.terminal === 'SPRB').map((y) => y.id));
  const bitcoYardIds = new Set(masterYards.filter((y) => y.terminal === 'BITCO').map((y) => y.id));

  const sprbCubiertaIds = new Set(
    masterYards.filter((y) => y.terminal === 'SPRB' && y.zone === 'CUBIERTA').map((y) => y.id)
  );
  const sprbDescubiertaIds = new Set(
    masterYards.filter((y) => y.terminal === 'SPRB' && y.zone === 'DESCUBIERTA').map((y) => y.id)
  );

  for (const date of dates) {
    const yardPcts = dailyYardPct[date];
    const yardOccupancies: Record<string, number> = {};

    let sprbCubiertaOcc = 0;
    let sprbDescubiertaOcc = 0;
    let bitcoCubiertaOcc = 0;
    let bitcoDescubiertaOcc = 0;

    for (const y of masterYards) {
      // Do not invent data: if yard is not in sheet for this date, its percentage is 0
      const pct = yardPcts[y.id] !== undefined ? yardPcts[y.id] : 0;
      const occupiedM2 = Math.round(y.areaTotalM2 * (pct / 100));
      yardOccupancies[y.id] = occupiedM2;

      if (sprbYardIds.has(y.id)) {
        if (sprbCubiertaIds.has(y.id)) {
          sprbCubiertaOcc += occupiedM2;
        } else if (sprbDescubiertaIds.has(y.id)) {
          sprbDescubiertaOcc += occupiedM2;
        }
      } else if (bitcoYardIds.has(y.id)) {
        if (y.zone === 'CUBIERTA') {
          bitcoCubiertaOcc += occupiedM2;
        } else {
          bitcoDescubiertaOcc += occupiedM2;
        }
      }
    }

    const sprbTotalOcc = sprbCubiertaOcc + sprbDescubiertaOcc;
    const bitcoTotalOcc = bitcoCubiertaOcc + bitcoDescubiertaOcc;
    const globalTotalOcc = sprbTotalOcc + bitcoTotalOcc;

    const sprbOccupancyPct = (sprbTotalOcc / CONSTANTS.SPRB.TOTAL) * 100;
    const bitcoOccupancyPct = (bitcoTotalOcc / CONSTANTS.BITCO.TOTAL) * 100;
    const globalOccupancyPct = (globalTotalOcc / CONSTANTS.GLOBAL.TOTAL) * 100;

    const sprbCubiertaPct = (sprbCubiertaOcc / CONSTANTS.SPRB.CUBIERTA) * 100;
    const sprbDescubiertaPct = (sprbDescubiertaOcc / CONSTANTS.SPRB.DESCUBIERTA) * 100;
    const bitcoCubiertaPct = (bitcoCubiertaOcc / CONSTANTS.BITCO.CUBIERTA) * 100;
    const bitcoDescubiertaPct = (bitcoDescubiertaOcc / CONSTANTS.BITCO.DESCUBIERTA) * 100;

    const parts = date.split('-');
    const label = `${parts[2]}/${parts[1]}`;

    records.push({
      date,
      label,
      globalOccupiedM2: globalTotalOcc,
      globalOccupancyPct,
      sprbOccupiedM2: sprbTotalOcc,
      sprbOccupancyPct,
      bitcoOccupiedM2: bitcoTotalOcc,
      bitcoOccupancyPct,
      sprbCubiertaPct,
      sprbDescubiertaPct,
      bitcoCubiertaPct,
      bitcoDescubiertaPct,
      yardOccupancies,
    });
  }

  return records;
}

/**
 * Parses an Excel (.xlsx / .xls) buffer into a DirectSyncResult
 */
export function parseExcelBuffer(
  buffer: ArrayBuffer,
  currentYards: YardItem[]
): DirectSyncResult {
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheetNames = workbook.SheetNames || [];

  if (sheetNames.length === 0) {
    throw new Error('El archivo Excel no contiene hojas de cálculo.');
  }

  // Filter 2026 month sheets
  const monthSheets = sheetNames.filter((name) => {
    const t = name.toLowerCase();
    return MONTH_NAMES_ES.some((m) => t.includes(m)) || /\b2026\b/.test(t) || /mes/i.test(t);
  });

  const targetSheets = monthSheets.length > 0 ? monthSheets : sheetNames;

  const combinedDailyYardPct: Record<string, Record<string, number>> = {};
  const allAlerts: SheetValidationAlert[] = [];
  const allUnrecognizedCodes = new Set<string>();
  let totalNonNumeric = 0;
  let totalCells = 0;
  const processedSheetNames: string[] = [];

  for (const sheetName of targetSheets) {
    const worksheet = workbook.Sheets[sheetName];
    if (!worksheet) continue;

    processedSheetNames.push(sheetName);

    // Convert sheet to 2D array of rows
    const rows = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1, defval: '' });
    totalCells += rows.reduce((acc, r) => acc + (r ? r.length : 0), 0);

    const parseResult = parseMonthSheetGrid(sheetName, rows, currentYards);

    allAlerts.push(...parseResult.alerts);
    parseResult.unrecognizedCodes.forEach((c) => allUnrecognizedCodes.add(c));
    totalNonNumeric += parseResult.nonNumericCount;

    for (const [dateStr, yardObj] of Object.entries(parseResult.dailyYardPct)) {
      if (!combinedDailyYardPct[dateStr]) {
        combinedDailyYardPct[dateStr] = {};
      }
      Object.assign(combinedDailyYardPct[dateStr], yardObj);
    }
  }

  const history = buildHistoricalRecords(combinedDailyYardPct, currentYards);
  const sortedDates = Object.keys(combinedDailyYardPct).sort();

  const updatedYards = currentYards.map((y) => {
    let latestPct = (y.currentOccupiedM2 / y.areaTotalM2) * 100;
    for (let i = sortedDates.length - 1; i >= 0; i--) {
      const d = sortedDates[i];
      if (combinedDailyYardPct[d] && combinedDailyYardPct[d][y.id] !== undefined) {
        latestPct = combinedDailyYardPct[d][y.id];
        break;
      }
    }

    const newOccupiedM2 = Math.min(y.areaTotalM2, Math.round(y.areaTotalM2 * (latestPct / 100)));
    return {
      ...y,
      currentOccupiedM2: newOccupiedM2,
      updatedAt: new Date().toISOString(),
    };
  });

  return {
    updatedYards,
    history,
    alerts: allAlerts,
    sheetsProcessed: processedSheetNames,
    datesFound: sortedDates,
    totalCellsProcessed: totalCells,
    unrecognizedCodes: Array.from(allUnrecognizedCodes),
    nonNumericCount: totalNonNumeric,
  };
}

/**
 * Downloads and parses an Office (.xlsx) file stored in Google Drive
 */
export async function syncFromDriveOfficeFile(
  fileId: string,
  accessToken: string,
  currentYards: YardItem[]
): Promise<DirectSyncResult> {
  const downloadUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
  const response = await fetch(downloadUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    const errText = await response.text();
    if (response.status === 401) {
      throw new Error('Sesión de Google expirada. Por favor vuelva a iniciar sesión.');
    }
    if (response.status === 403) {
      throw new Error('Permiso denegado en Google Drive. Verifique que la cuenta tenga acceso de lectura.');
    }
    if (response.status === 404) {
      throw new Error('Archivo no encontrado en Google Drive. Verifique la URL o ID del archivo.');
    }
    throw new Error(`Error ${response.status} al descargar archivo desde Google Drive: ${errText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return parseExcelBuffer(arrayBuffer, currentYards);
}

/**
 * Performs a live direct sync against Google Sheets REST API v4, with automatic
 * fallback and direct support for Office (.xlsx) files stored in Google Drive.
 */
export async function syncFromGoogleSheetsDirect(
  urlOrId: string,
  accessToken: string,
  currentYards: YardItem[]
): Promise<DirectSyncResult> {
  const spreadsheetId = extractSpreadsheetId(urlOrId);
  if (!spreadsheetId) {
    throw new Error('Ingrese un enlace o ID válido de Google Sheets.');
  }

  // Step 0: Check file metadata via Google Drive API to detect Office vs Native Sheets
  let isDriveOfficeFile = false;
  try {
    const driveMetaRes = await fetch(
      `https://www.googleapis.com/drive/v3/files/${spreadsheetId}?fields=id,name,mimeType`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );
    if (driveMetaRes.ok) {
      const driveMeta = await driveMetaRes.json();
      const mime = driveMeta.mimeType || '';
      const name = (driveMeta.name || '').toLowerCase();
      if (
        mime.includes('openxmlformats') ||
        mime.includes('ms-excel') ||
        name.endsWith('.xlsx') ||
        name.endsWith('.xls') ||
        (mime && mime !== 'application/vnd.google-apps.spreadsheet')
      ) {
        isDriveOfficeFile = true;
      }
    }
  } catch (e) {
    console.warn('Could not inspect Google Drive file metadata, trying standard Sheets API', e);
  }

  // If detected as an Office file (.xlsx) stored in Google Drive, download and parse directly!
  if (isDriveOfficeFile) {
    return syncFromDriveOfficeFile(spreadsheetId, accessToken, currentYards);
  }

  // Step 1: Read workbook metadata to list sheets for the year 2026
  const metaRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties(title,sheetId)`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!metaRes.ok) {
    const errText = await metaRes.text();

    // Check if error is due to an Office (.xlsx) file opened in Google Drive
    if (errText.includes('Office file') || errText.includes('FAILED_PRECONDITION')) {
      return syncFromDriveOfficeFile(spreadsheetId, accessToken, currentYards);
    }

    if (metaRes.status === 401) {
      throw new Error('Sesión de Google expirada. Por favor inicie sesión nuevamente.');
    }
    if (metaRes.status === 403) {
      throw new Error('Permiso denegado en Google Sheets. Verifique que la cuenta tenga acceso de lectura.');
    }
    if (metaRes.status === 404) {
      throw new Error('Hoja de cálculo no encontrada. Verifique la URL o ID del Google Sheet.');
    }
    throw new Error(`Error ${metaRes.status} al leer Google Sheets: ${errText}`);
  }

  const metaData = await metaRes.json();
  const sheets: Array<{ properties: { title: string } }> = metaData.sheets || [];

  if (sheets.length === 0) {
    throw new Error('El libro de cálculo no contiene hojas.');
  }

  // Filter 2026 month sheets
  const monthSheets = sheets.filter((s) => {
    const t = s.properties.title.toLowerCase();
    return MONTH_NAMES_ES.some((m) => t.includes(m)) || /\b2026\b/.test(t) || /mes/i.test(t);
  });

  const targetSheets = monthSheets.length > 0 ? monthSheets : sheets;

  // Step 2: Batch fetch values for target sheets
  const rangesParam = targetSheets.map((s) => `ranges=${encodeURIComponent(`'${s.properties.title}'!A1:ZZ60`)}`).join('&');
  const valuesUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchGet?${rangesParam}`;

  const valuesRes = await fetch(valuesUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!valuesRes.ok) {
    const errText = await valuesRes.text();
    if (errText.includes('Office file') || valuesRes.status === 400) {
      return syncFromDriveOfficeFile(spreadsheetId, accessToken, currentYards);
    }
    throw new Error(`Error al leer celdas de las hojas: ${valuesRes.status} - ${errText}`);
  }

  const valuesData = await valuesRes.json();
  const valueRanges: Array<{ range: string; values: any[][] }> = valuesData.valueRanges || [];

  const combinedDailyYardPct: Record<string, Record<string, number>> = {};
  const allAlerts: SheetValidationAlert[] = [];
  const allUnrecognizedCodes = new Set<string>();
  let totalNonNumeric = 0;
  let totalCells = 0;
  const processedSheetNames: string[] = [];

  for (let i = 0; i < valueRanges.length; i++) {
    const vr = valueRanges[i];
    const sheetTitle = targetSheets[i]?.properties?.title || `Hoja_${i + 1}`;
    processedSheetNames.push(sheetTitle);

    const rows = vr.values || [];
    totalCells += rows.reduce((acc, r) => acc + (r ? r.length : 0), 0);

    const parseResult = parseMonthSheetGrid(sheetTitle, rows, currentYards);

    // Merge alerts
    allAlerts.push(...parseResult.alerts);
    parseResult.unrecognizedCodes.forEach((c) => allUnrecognizedCodes.add(c));
    totalNonNumeric += parseResult.nonNumericCount;

    // Merge daily yard percentages
    for (const [dateStr, yardObj] of Object.entries(parseResult.dailyYardPct)) {
      if (!combinedDailyYardPct[dateStr]) {
        combinedDailyYardPct[dateStr] = {};
      }
      Object.assign(combinedDailyYardPct[dateStr], yardObj);
    }
  }

  // Step 3: Build history & update master yards
  const history = buildHistoricalRecords(combinedDailyYardPct, currentYards);
  const sortedDates = Object.keys(combinedDailyYardPct).sort();

  // Find latest recorded occupancy for each yard
  const updatedYards = currentYards.map((y) => {
    let latestPct = (y.currentOccupiedM2 / y.areaTotalM2) * 100;
    for (let i = sortedDates.length - 1; i >= 0; i--) {
      const d = sortedDates[i];
      if (combinedDailyYardPct[d] && combinedDailyYardPct[d][y.id] !== undefined) {
        latestPct = combinedDailyYardPct[d][y.id];
        break;
      }
    }

    const newOccupiedM2 = Math.min(y.areaTotalM2, Math.round(y.areaTotalM2 * (latestPct / 100)));
    return {
      ...y,
      currentOccupiedM2: newOccupiedM2,
      updatedAt: new Date().toISOString(),
    };
  });

  return {
    updatedYards,
    history,
    alerts: allAlerts,
    sheetsProcessed: processedSheetNames,
    datesFound: sortedDates,
    totalCellsProcessed: totalCells,
    unrecognizedCodes: Array.from(allUnrecognizedCodes),
    nonNumericCount: totalNonNumeric,
  };
}

/**
 * Generates an authentic simulation of the 2026 Google Sheet matrix
 * matching the user's exact specification:
 * - Hojas para los meses de 2026
 * - Columna A desde fila 2/3 contiene los códigos de los 23 patios del maestro
 * - Fila 2 desde Columna B contiene las fechas del mes
 * - Cualquier número interpretado como %
 * - Celdas vacías respetadas
 * - Incluye 2 alertas deliberadas para demostración de validación en vivo
 */
export function generateDemo2026SheetData(currentYards: YardItem[]): DirectSyncResult {
  const months = [
    { name: 'Enero 2026', monthNum: 1, days: 31 },
    { name: 'Febrero 2026', monthNum: 2, days: 28 },
    { name: 'Marzo 2026', monthNum: 3, days: 31 },
    { name: 'Abril 2026', monthNum: 4, days: 30 },
    { name: 'Mayo 2026', monthNum: 5, days: 31 },
    { name: 'Junio 2026', monthNum: 6, days: 30 },
    { name: 'Julio 2026', monthNum: 7, days: 31 },
    { name: 'Agosto 2026', monthNum: 8, days: 31 },
    { name: 'Septiembre 2026', monthNum: 9, days: 30 },
    { name: 'Octubre 2026', monthNum: 10, days: 31 },
    { name: 'Noviembre 2026', monthNum: 11, days: 30 },
    { name: 'Diciembre 2026', monthNum: 12, days: 31 },
  ];

  const combinedDailyYardPct: Record<string, Record<string, number>> = {};
  const allAlerts: SheetValidationAlert[] = [];
  const unrecognizedCodes: string[] = ['ZONA-TEMPORAL-X', 'PATIO-NO-EXISTE'];
  let nonNumericCount = 2;
  const processedSheets: string[] = [];

  // Deliberate test alerts to satisfy requirement demonstration
  allAlerts.push({
    id: 'demo-alert-code-mismatch-1',
    type: 'CODE_MISMATCH',
    severity: 'WARNING',
    sheetName: 'Marzo 2026',
    rowNumber: 26,
    code: 'ZONA-TEMPORAL-X',
    message: 'Código no reconocido: "ZONA-TEMPORAL-X" en hoja "Marzo 2026" (Fila 26). No coincide con el Maestro de Patios y Bodegas.',
    recommendation: 'Verifique la nomenclatura en la columna A o registre la nueva área en el Maestro de Patios.',
    timestamp: '10:14:00',
  });

  allAlerts.push({
    id: 'demo-alert-non-numeric-1',
    type: 'NON_NUMERIC_VALUE',
    severity: 'ALERT',
    sheetName: 'Abril 2026',
    rowNumber: 12,
    colName: 'E',
    code: 'B15',
    date: '2026-04-04',
    rawValue: 'MANTENIMIENTO_TECHOS',
    message: 'Valor no numérico detectado en hoja "Abril 2026", celda E12 (2026-04-04): "MANTENIMIENTO_TECHOS" para el patio "B15".',
    recommendation: 'Corrija el valor ingresado en Google Sheets para reflejar un porcentaje numérico válido (ej: 75% o 0.75). Se omitió del cálculo.',
    timestamp: '11:20:00',
  });

  // Populate daily values for each month
  for (const m of months) {
    processedSheets.push(m.name);
    for (let day = 1; day <= m.days; day += 2) {
      const dateStr = `2026-${String(m.monthNum).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      combinedDailyYardPct[dateStr] = {};

      for (const y of currentYards) {
        const base = y.terminal === 'BITCO' ? 76 : 71;
        const seed = (day * 7 + m.monthNum * 13 + y.id.charCodeAt(0) * 3) % 25;
        if (day === 15 && y.id === 'P4S') {
          continue; // empty cell
        }
        const pct = Math.min(96, Math.max(45, base + (seed - 12)));
        combinedDailyYardPct[dateStr][y.id] = pct;
      }
    }
  }

  const history = buildHistoricalRecords(combinedDailyYardPct, currentYards);
  const sortedDates = Object.keys(combinedDailyYardPct).sort();

  const updatedYards = currentYards.map((y) => {
    let latestPct = 75;
    for (let i = sortedDates.length - 1; i >= 0; i--) {
      const d = sortedDates[i];
      if (combinedDailyYardPct[d] && combinedDailyYardPct[d][y.id] !== undefined) {
        latestPct = combinedDailyYardPct[d][y.id];
        break;
      }
    }
    return {
      ...y,
      currentOccupiedM2: Math.min(y.areaTotalM2, Math.round(y.areaTotalM2 * (latestPct / 100))),
      updatedAt: new Date().toISOString(),
    };
  });

  return {
    updatedYards,
    history,
    alerts: allAlerts,
    sheetsProcessed: processedSheets,
    datesFound: sortedDates,
    totalCellsProcessed: processedSheets.length * 23 * 15,
    unrecognizedCodes,
    nonNumericCount,
  };
}
