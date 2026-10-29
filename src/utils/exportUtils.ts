import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ConsolidatedMetrics, YardCalculated } from '../types/occupancy';

export function exportToExcel(metrics: ConsolidatedMetrics, dateFilterLabel: string) {
  const wb = XLSX.utils.book_new();

  // 1. Resumen Ejecutivo con Segregación por IP
  const resumenData = [
    ['SISTEMA MASTER OCUPACIÓN - REPORTE EJECUTIVO OFICIAL'],
    ['Terminales:', 'SPRB (Sociedad Portuaria Regional de Barranquilla) & BITCO'],
    ['Principio Operativo:', 'Ponderación independiente por IP debido a separación geográfica'],
    ['Filtro de Período:', dateFilterLabel],
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
    ['DESGLOSE DE ZONAS SEGREGADAS POR IP (SEPARACIÓN GEOGRÁFICA)', 'TERMINAL (IP)', 'ÁREA TOTAL (m²)', 'PARTICIPACIÓN EN IP', 'OCUPADA (m²)', 'DISPONIBLE (m²)', 'OCUPACIÓN REAL DE ZONA'],
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

  const wsResumen = XLSX.utils.aoa_to_sheet(resumenData);
  XLSX.utils.book_append_sheet(wb, wsResumen, 'Gran Consolidado');

  // 2. Terminal SPRB Detalle
  const sprbData = [
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
  const wsSPRB = XLSX.utils.aoa_to_sheet(sprbData);
  XLSX.utils.book_append_sheet(wb, wsSPRB, 'Terminal SPRB');

  // 3. Terminal BITCO Detalle
  const bitcoData = [
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
  const wsBITCO = XLSX.utils.aoa_to_sheet(bitcoData);
  XLSX.utils.book_append_sheet(wb, wsBITCO, 'Terminal BITCO');

  // 4. Matriz Completa de Patios y Bodegas
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

  const wsMaster = XLSX.utils.aoa_to_sheet([masterHeaders, ...masterRows]);
  XLSX.utils.book_append_sheet(wb, wsMaster, 'Maestro Patios y Bodegas');

  const fileName = `Master_Ocupacion_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

export function exportToPDF(metrics: ConsolidatedMetrics, dateFilterLabel: string) {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const primaryColor = [15, 23, 42]; // Slate-900

  // Header banner
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(0, 0, 297, 24, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('MASTER OCUPACIÓN - SISTEMA DE CONTROL PORTUARIO POR IP', 14, 11);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.text(
    `Ponderación Segregada por IP (SPRB y BITCO separados geográficamente) | Período: ${dateFilterLabel} | Emisión: ${new Date().toLocaleString('es-CO')}`,
    14,
    18
  );

  // Executive KPI summary box
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(10.5);
  doc.setFont('helvetica', 'bold');
  doc.text('1. Balance Consolidado y Desglose por Terminal (IP)', 14, 31);

  const kpiData = [
    [
      'Gran Consolidado Puerto',
      'Global',
      `${metrics.totalAreaM2.toLocaleString('es-CO')} m²`,
      '100.00%',
      `${metrics.occupiedM2.toLocaleString('es-CO')} m²`,
      `${metrics.availableM2.toLocaleString('es-CO')} m²`,
      `${metrics.weightedOccupancyPct.toFixed(2)}%`,
      metrics.status,
    ],
    [
      'Terminal SPRB (Consolidado)',
      'SPRB',
      `${metrics.sprb.areaTotalM2.toLocaleString('es-CO')} m²`,
      '47.03%',
      `${metrics.sprb.occupiedM2.toLocaleString('es-CO')} m²`,
      `${metrics.sprb.availableM2.toLocaleString('es-CO')} m²`,
      `${metrics.sprb.weightedOccupancyPct.toFixed(2)}%`,
      metrics.sprb.status,
    ],
    [
      '  - Zona Cubierta SPRB (Bodegas)',
      'SPRB',
      `${metrics.sprb.cubierta.areaTotalM2.toLocaleString('es-CO')} m²`,
      `${metrics.sprb.cubierta.weightInTerminalPct.toFixed(2)}% (SPRB)`,
      `${metrics.sprb.cubierta.occupiedM2.toLocaleString('es-CO')} m²`,
      `${metrics.sprb.cubierta.availableM2.toLocaleString('es-CO')} m²`,
      `${metrics.sprb.cubierta.weightedOccupancyPct.toFixed(2)}%`,
      metrics.sprb.cubierta.status,
    ],
    [
      '  - Zona Descubierta SPRB (Patios)',
      'SPRB',
      `${metrics.sprb.descubierta.areaTotalM2.toLocaleString('es-CO')} m²`,
      `${metrics.sprb.descubierta.weightInTerminalPct.toFixed(2)}% (SPRB)`,
      `${metrics.sprb.descubierta.occupiedM2.toLocaleString('es-CO')} m²`,
      `${metrics.sprb.descubierta.availableM2.toLocaleString('es-CO')} m²`,
      `${metrics.sprb.descubierta.weightedOccupancyPct.toFixed(2)}%`,
      metrics.sprb.descubierta.status,
    ],
    [
      'Terminal BITCO (Consolidado)',
      'BITCO',
      `${metrics.bitco.areaTotalM2.toLocaleString('es-CO')} m²`,
      '52.97%',
      `${metrics.bitco.occupiedM2.toLocaleString('es-CO')} m²`,
      `${metrics.bitco.availableM2.toLocaleString('es-CO')} m²`,
      `${metrics.bitco.weightedOccupancyPct.toFixed(2)}%`,
      metrics.bitco.status,
    ],
    [
      '  - Zona Cubierta BITCO (BOD-B)',
      'BITCO',
      `${metrics.bitco.cubierta.areaTotalM2.toLocaleString('es-CO')} m²`,
      `${metrics.bitco.cubierta.weightInTerminalPct.toFixed(2)}% (BITCO)`,
      `${metrics.bitco.cubierta.occupiedM2.toLocaleString('es-CO')} m²`,
      `${metrics.bitco.cubierta.availableM2.toLocaleString('es-CO')} m²`,
      `${metrics.bitco.cubierta.weightedOccupancyPct.toFixed(2)}%`,
      metrics.bitco.cubierta.status,
    ],
    [
      '  - Zona Descubierta BITCO (PATCO)',
      'BITCO',
      `${metrics.bitco.descubierta.areaTotalM2.toLocaleString('es-CO')} m²`,
      `${metrics.bitco.descubierta.weightInTerminalPct.toFixed(2)}% (BITCO)`,
      `${metrics.bitco.descubierta.occupiedM2.toLocaleString('es-CO')} m²`,
      `${metrics.bitco.descubierta.availableM2.toLocaleString('es-CO')} m²`,
      `${metrics.bitco.descubierta.weightedOccupancyPct.toFixed(2)}%`,
      metrics.bitco.descubierta.status,
    ],
  ];

  autoTable(doc, {
    startY: 35,
    head: [['Instalación / Zona', 'IP', 'Área Total', 'Participación', 'Ocupada', 'Disponible', 'Ocupación Real', 'Estado']],
    body: kpiData,
    theme: 'grid',
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: 255,
      fontSize: 7.5,
      fontStyle: 'bold',
    },
    styles: {
      fontSize: 7.5,
      cellPadding: 1.8,
    },
    columnStyles: {
      0: { fontStyle: 'bold' },
      6: { fontStyle: 'bold' },
    },
  });

  // Table of all 23 yards
  const finalY = (doc as any).lastAutoTable?.finalY || 85;

  doc.setFontSize(10.5);
  doc.setFont('helvetica', 'bold');
  doc.text('2. Maestro de Patios y Bodegas por IP - Ponderación Individual', 14, finalY + 8);

  const yardsTableData = metrics.allYards.map((y) => [
    y.id,
    y.name,
    y.terminal,
    y.zone,
    `${y.areaTotalM2.toLocaleString('es-CO')} m²`,
    `${y.currentOccupiedM2.toLocaleString('es-CO')} m²`,
    `${y.availableM2.toLocaleString('es-CO')} m²`,
    `${y.occupancyPct.toFixed(1)}%`,
    `${y.weightInTerminalPct.toFixed(2)}%`,
    `${y.weightedContributionToTerminalPct.toFixed(2)}%`,
    `${y.weightedContributionToGlobalPct.toFixed(2)}%`,
    y.status,
  ]);

  autoTable(doc, {
    startY: finalY + 11,
    head: [
      [
        'ID',
        'Nombre',
        'IP',
        'Zona',
        'Área Total',
        'Ocupada',
        'Disponible',
        '% Ocup.',
        'Part. IP',
        'Contrib. IP',
        'Contrib. Glob.',
        'Estado',
      ],
    ],
    body: yardsTableData,
    theme: 'striped',
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: 255,
      fontSize: 7,
      fontStyle: 'bold',
    },
    styles: {
      fontSize: 6.8,
      cellPadding: 1.5,
    },
    columnStyles: {
      0: { fontStyle: 'bold' },
      7: { fontStyle: 'bold' },
    },
  });

  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Master Ocupation - Ponderación Geográfica por IP (SPRB: 24,948 m² | BITCO: 28,100 m²) - Página ${i} de ${pageCount}`,
      14,
      202
    );
  }

  const fileName = `Master_Ocupacion_Informe_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(fileName);
}
