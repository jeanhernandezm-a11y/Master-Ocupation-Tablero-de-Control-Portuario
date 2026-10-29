import { ConsolidatedMetrics, YardItem, TerminalId, ZoneType } from '../types/occupancy';

export interface DriveSpreadsheetFile {
  id: string;
  name: string;
  modifiedTime: string;
}

export async function listDriveSpreadsheets(accessToken: string): Promise<DriveSpreadsheetFile[]> {
  const query = encodeURIComponent("mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false");
  const url = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,modifiedTime)&pageSize=25&orderBy=modifiedTime desc`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Error al listar archivos de Google Drive: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return data.files || [];
}

export async function createAndExportToGoogleSheets(
  metrics: ConsolidatedMetrics,
  customTitle: string,
  accessToken: string
): Promise<{ spreadsheetId: string; spreadsheetUrl: string }> {
  const title = customTitle || `Master Ocupacion - ${new Date().toISOString().slice(0, 10)}`;

  // Step 1: Create Spreadsheet with the 4 tabs
  const createPayload = {
    properties: {
      title,
    },
    sheets: [
      { properties: { title: 'Gran Consolidado' } },
      { properties: { title: 'Terminal SPRB' } },
      { properties: { title: 'Terminal BITCO' } },
      { properties: { title: 'Maestro Patios y Bodegas' } },
    ],
  };

  const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(createPayload),
  });

  if (!createRes.ok) {
    const err = await createRes.text();
    throw new Error(`Error al crear Google Spreadsheet: ${createRes.status} - ${err}`);
  }

  const createdData = await createRes.json();
  const spreadsheetId = createdData.spreadsheetId;

  // Step 2: Prepare data for each sheet
  // 1. Gran Consolidado
  const consolidadoRows = [
    ['SISTEMA MASTER OCUPACIÓN - REPORTE OFICIAL EN GOOGLE SHEETS'],
    ['Instalaciones Portuarias:', 'SPRB (Sociedad Portuaria Regional de Barranquilla) & BITCO'],
    ['Principio Operativo:', 'Ponderación independiente por IP debido a separación geográfica'],
    ['Fecha de Generación:', new Date().toLocaleString('es-CO')],
    [],
    ['CONSOLIDADO GENERAL', 'VALOR', 'UNIDAD', '% PARTICIPACIÓN'],
    ['Área Total de Almacenamiento', metrics.totalAreaM2, 'm²', '100.00%'],
    ['Capacidad Ocupada Total', metrics.occupiedM2, 'm²', `${metrics.weightedOccupancyPct.toFixed(2)}%`],
    ['Capacidad Disponible Total', metrics.availableM2, 'm²', `${(100 - metrics.weightedOccupancyPct).toFixed(2)}%`],
    ['Ocupación Ponderada Global', `${metrics.weightedOccupancyPct.toFixed(2)}%`, '-', '-'],
    ['Estado General', metrics.status, '-', '-'],
    [],
    ['BALANCE POR TERMINAL (IP)', 'ÁREA TOTAL (m²)', 'OCUPADA (m²)', 'DISPONIBLE (m²)', 'OCUPACIÓN PONDERADA', 'PARTICIPACIÓN GLOBAL'],
    [
      metrics.sprb.terminal,
      metrics.sprb.areaTotalM2,
      metrics.sprb.occupiedM2,
      metrics.sprb.availableM2,
      `${metrics.sprb.weightedOccupancyPct.toFixed(2)}%`,
      `${metrics.sprb.weightInGlobalPct.toFixed(2)}%`,
    ],
    [
      metrics.bitco.terminal,
      metrics.bitco.areaTotalM2,
      metrics.bitco.occupiedM2,
      metrics.bitco.availableM2,
      `${metrics.bitco.weightedOccupancyPct.toFixed(2)}%`,
      `${metrics.bitco.weightInGlobalPct.toFixed(2)}%`,
    ],
    [],
    ['DESGLOSE DE ZONAS SEGREGADAS POR IP', 'TERMINAL (IP)', 'ÁREA TOTAL (m²)', 'PARTICIPACIÓN EN IP', 'OCUPADA (m²)', 'DISPONIBLE (m²)', 'OCUPACIÓN REAL DE ZONA'],
    [
      'Zona Cubierta SPRB (Bodegas)',
      'SPRB',
      metrics.sprb.cubierta.areaTotalM2,
      `${metrics.sprb.cubierta.weightInTerminalPct.toFixed(2)}%`,
      metrics.sprb.cubierta.occupiedM2,
      metrics.sprb.cubierta.availableM2,
      `${metrics.sprb.cubierta.weightedOccupancyPct.toFixed(2)}%`,
    ],
    [
      'Zona Descubierta SPRB (Patios)',
      'SPRB',
      metrics.sprb.descubierta.areaTotalM2,
      `${metrics.sprb.descubierta.weightInTerminalPct.toFixed(2)}%`,
      metrics.sprb.descubierta.occupiedM2,
      metrics.sprb.descubierta.availableM2,
      `${metrics.sprb.descubierta.weightedOccupancyPct.toFixed(2)}%`,
    ],
    [
      'Zona Cubierta BITCO (BOD-B)',
      'BITCO',
      metrics.bitco.cubierta.areaTotalM2,
      `${metrics.bitco.cubierta.weightInTerminalPct.toFixed(2)}%`,
      metrics.bitco.cubierta.occupiedM2,
      metrics.bitco.cubierta.availableM2,
      `${metrics.bitco.cubierta.weightedOccupancyPct.toFixed(2)}%`,
    ],
    [
      'Zona Descubierta BITCO (PATCO)',
      'BITCO',
      metrics.bitco.descubierta.areaTotalM2,
      `${metrics.bitco.descubierta.weightInTerminalPct.toFixed(2)}%`,
      metrics.bitco.descubierta.occupiedM2,
      metrics.bitco.descubierta.availableM2,
      `${metrics.bitco.descubierta.weightedOccupancyPct.toFixed(2)}%`,
    ],
  ];

  // 2. Terminal SPRB
  const sprbRows = [
    ['TERMINAL SPRB - SOCIEDAD PORTUARIA REGIONAL DE BARRANQUILLA'],
    ['Área Total SPRB:', metrics.sprb.areaTotalM2, 'm² (47.03% del puerto global)'],
    ['Ocupación Ponderada en SPRB:', `${metrics.sprb.weightedOccupancyPct.toFixed(2)}%`],
    ['Zona Cubierta SPRB (Bodegas):', `${metrics.sprb.cubierta.areaTotalM2} m² (${metrics.sprb.cubierta.weightInTerminalPct.toFixed(2)}% de SPRB)`],
    ['Zona Descubierta SPRB (Patios):', `${metrics.sprb.descubierta.areaTotalM2} m² (${metrics.sprb.descubierta.weightInTerminalPct.toFixed(2)}% de SPRB)`],
    [],
    [
      'CÓDIGO',
      'NOMBRE',
      'ZONA',
      'ÁREA TOTAL (m²)',
      'OCUPADA (m²)',
      'DISPONIBLE (m²)',
      '% OCUPACIÓN',
      'PART. EN SPRB (%)',
      'CONTRIB. PONDERADA SPRB (%)',
      'ESTADO',
    ],
    ...metrics.sprb.yards.map((y) => [
      y.id,
      y.name,
      y.zone,
      y.areaTotalM2,
      y.currentOccupiedM2,
      y.availableM2,
      `${y.occupancyPct.toFixed(2)}%`,
      `${y.weightInTerminalPct.toFixed(2)}%`,
      `${y.weightedContributionToTerminalPct.toFixed(2)}%`,
      y.status,
    ]),
  ];

  // 3. Terminal BITCO
  const bitcoRows = [
    ['TERMINAL BITCO - BARRANQUILLA INTERNATIONAL TERMINAL COMPANY'],
    ['Área Total BITCO:', metrics.bitco.areaTotalM2, 'm² (52.97% del puerto global)'],
    ['Ocupación Ponderada en BITCO:', `${metrics.bitco.weightedOccupancyPct.toFixed(2)}%`],
    ['Zona Cubierta BITCO (BOD-B):', `${metrics.bitco.cubierta.areaTotalM2} m² (${metrics.bitco.cubierta.weightInTerminalPct.toFixed(2)}% de BITCO)`],
    ['Zona Descubierta BITCO (PATCO):', `${metrics.bitco.descubierta.areaTotalM2} m² (${metrics.bitco.descubierta.weightInTerminalPct.toFixed(2)}% de BITCO)`],
    [],
    [
      'CÓDIGO',
      'NOMBRE',
      'ZONA',
      'ÁREA TOTAL (m²)',
      'OCUPADA (m²)',
      'DISPONIBLE (m²)',
      '% OCUPACIÓN',
      'PART. EN BITCO (%)',
      'CONTRIB. PONDERADA BITCO (%)',
      'ESTADO',
    ],
    ...metrics.bitco.yards.map((y) => [
      y.id,
      y.name,
      y.zone,
      y.areaTotalM2,
      y.currentOccupiedM2,
      y.availableM2,
      `${y.occupancyPct.toFixed(2)}%`,
      `${y.weightInTerminalPct.toFixed(2)}%`,
      `${y.weightedContributionToTerminalPct.toFixed(2)}%`,
      y.status,
    ]),
  ];

  // 4. Maestro Patios y Bodegas
  const masterHeaders = [
    'ID / Código',
    'Nombre',
    'Terminal (IP)',
    'Zona',
    'Área Total (m²)',
    'Área Ocupada (m²)',
    'Área Disponible (m²)',
    '% Ocupación Individual',
    'Part. en Terminal (%)',
    'Part. en Consolidado (%)',
    'Contribución Ponderada Global (%)',
    'Nivel de Alerta',
    'Notas Operativas',
  ];

  const masterRows = metrics.allYards.map((y) => [
    y.id,
    y.name,
    y.terminal,
    y.zone,
    y.areaTotalM2,
    y.currentOccupiedM2,
    y.availableM2,
    Number(y.occupancyPct.toFixed(2)),
    Number(y.weightInTerminalPct.toFixed(2)),
    Number(y.weightInGlobalPct.toFixed(2)),
    Number(y.weightedContributionToGlobalPct.toFixed(2)),
    y.status,
    y.notes || '',
  ]);

  const batchUpdatePayload = {
    valueInputOption: 'USER_ENTERED',
    data: [
      { range: "'Gran Consolidado'!A1", values: consolidadoRows },
      { range: "'Terminal SPRB'!A1", values: sprbRows },
      { range: "'Terminal BITCO'!A1", values: bitcoRows },
      { range: "'Maestro Patios y Bodegas'!A1", values: [masterHeaders, ...masterRows] },
    ],
  };

  const populateRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(batchUpdatePayload),
    }
  );

  if (!populateRes.ok) {
    const err = await populateRes.text();
    throw new Error(`Error al insertar valores en Google Sheets: ${populateRes.status} - ${err}`);
  }

  const spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
  return { spreadsheetId, spreadsheetUrl };
}

export async function readSpreadsheetYards(
  spreadsheetId: string,
  accessToken: string
): Promise<YardItem[]> {
  // Step 1: Read metadata to find the appropriate sheet name
  const metaRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties.title`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!metaRes.ok) {
    const err = await metaRes.text();
    throw new Error(`Error al leer metadata del libro de Google Sheets: ${metaRes.status} - ${err}`);
  }

  const metaData = await metaRes.json();
  const sheets: Array<{ properties: { title: string } }> = metaData.sheets || [];

  if (sheets.length === 0) {
    throw new Error('El libro de cálculo seleccionado no contiene hojas.');
  }

  // Look for 'Maestro Patios y Bodegas' or fallback to first sheet
  const targetSheet =
    sheets.find((s) => s.properties.title.toLowerCase().includes('maestro'))?.properties.title ||
    sheets[0].properties.title;

  // Step 2: Fetch rows
  const valuesRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'${encodeURIComponent(targetSheet)}'!A1:Z100`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!valuesRes.ok) {
    const err = await valuesRes.text();
    throw new Error(`Error al leer celdas de '${targetSheet}': ${valuesRes.status} - ${err}`);
  }

  const valuesData = await valuesRes.json();
  const rows: any[][] = valuesData.values || [];

  if (rows.length < 2) {
    throw new Error(`La hoja '${targetSheet}' no tiene suficientes filas de datos.`);
  }

  // Find header index
  const headers = rows[0].map((h: any) => String(h).trim().toLowerCase());
  const idIdx = headers.findIndex((h) => h.includes('id') || h.includes('código') || h.includes('codigo'));
  const nameIdx = headers.findIndex((h) => h.includes('nombre'));
  const termIdx = headers.findIndex((h) => h.includes('terminal') || h.includes('ip'));
  const zoneIdx = headers.findIndex((h) => h.includes('zona'));
  const totalAreaIdx = headers.findIndex((h) => h.includes('total') || h.includes('nominal'));
  const occupiedAreaIdx = headers.findIndex((h) => h.includes('ocupada') || h.includes('ocupado'));

  if (idIdx === -1 || totalAreaIdx === -1) {
    throw new Error(
      `No se encontraron las columnas necesarias ('Código/ID' y 'Área Total') en la hoja '${targetSheet}'.`
    );
  }

  const importedYards: YardItem[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || !row[idIdx]) continue;

    const id = String(row[idIdx]).trim().toUpperCase();
    const name = nameIdx !== -1 && row[nameIdx] ? String(row[nameIdx]).trim() : `Patio ${id}`;
    const rawTerm = termIdx !== -1 && row[termIdx] ? String(row[termIdx]).trim().toUpperCase() : 'SPRB';
    const terminal: TerminalId = rawTerm.includes('BITCO') ? 'BITCO' : 'SPRB';

    const rawZone = zoneIdx !== -1 && row[zoneIdx] ? String(row[zoneIdx]).trim().toUpperCase() : 'DESCUBIERTA';
    const zone: ZoneType = rawZone.includes('CUBIERT') || rawZone.includes('TECHAD') ? 'CUBIERTA' : 'DESCUBIERTA';

    const areaTotalM2 = Number(String(row[totalAreaIdx]).replace(/[^0-9.]/g, '')) || 500;
    const currentOccupiedM2 =
      occupiedAreaIdx !== -1 && row[occupiedAreaIdx]
        ? Math.min(areaTotalM2, Number(String(row[occupiedAreaIdx]).replace(/[^0-9.]/g, '')) || 0)
        : Math.round(areaTotalM2 * 0.7);

    importedYards.push({
      id,
      name,
      terminal,
      zone,
      areaTotalM2,
      currentOccupiedM2,
      warningThreshold: 75,
      criticalThreshold: 92,
    });
  }

  if (importedYards.length === 0) {
    throw new Error('No se pudieron extraer registros válidos de patios.');
  }

  return importedYards;
}
