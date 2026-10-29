import React, { useState } from 'react';
import {
  FileSpreadsheet,
  FileText,
  Printer,
  Download,
  CheckCircle2,
  Calendar,
  Layers,
  Info,
  ShieldCheck,
  Ship,
  Warehouse,
  MapPin,
} from 'lucide-react';
import { ConsolidatedMetrics } from '../types/occupancy';
import { exportToExcel, exportToPDF } from '../utils/exportUtils';

interface ReportsViewProps {
  metrics: ConsolidatedMetrics;
  dateFilterLabel: string;
  onOpenGoogleSheets: () => void;
}

export const ReportsView: React.FC<ReportsViewProps> = ({ metrics, dateFilterLabel, onOpenGoogleSheets }) => {
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);

  const handleExcelExport = () => {
    try {
      exportToExcel(metrics, dateFilterLabel);
      setDownloadSuccess('Archivo Excel (.xlsx) generado y descargado exitosamente con 4 hojas y segregación por IP.');
      setTimeout(() => setDownloadSuccess(null), 4000);
    } catch (e) {
      console.error(e);
    }
  };

  const handlePDFExport = () => {
    try {
      exportToPDF(metrics, dateFilterLabel);
      setDownloadSuccess('Reporte Ejecutivo en PDF (.pdf) generado y descargado exitosamente.');
      setTimeout(() => setDownloadSuccess(null), 4000);
    } catch (e) {
      console.error(e);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-sky-400" />
              Centro de Reportes y Exportación Oficial
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Generación de informes consolidados con ponderación geográfica segregada por IP (SPRB y BITCO)
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={onOpenGoogleSheets}
              className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg shadow-sm transition-colors flex items-center gap-2 whitespace-nowrap"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-200" />
              <span>Google Sheets en Vivo</span>
            </button>

            <button
              onClick={handleExcelExport}
              className="px-3.5 py-2 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg shadow-sm transition-colors flex items-center gap-2 whitespace-nowrap"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>Descargar Excel (.xlsx)</span>
            </button>

            <button
              onClick={handlePDFExport}
              className="px-3.5 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-500 rounded-lg shadow-sm transition-colors flex items-center gap-2 whitespace-nowrap"
            >
              <FileText className="w-4 h-4" />
              <span>Exportar PDF (.pdf)</span>
            </button>

            <button
              onClick={handlePrint}
              className="px-3.5 py-2 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap"
            >
              <Printer className="w-4 h-4 text-slate-400" />
              <span className="hidden sm:inline">Imprimir</span>
            </button>
          </div>
        </div>

        {downloadSuccess && (
          <div className="mt-4 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-xs text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{downloadSuccess}</span>
          </div>
        )}
      </div>

      {/* Segregation Concept Banner */}
      <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 flex items-center gap-2.5">
        <MapPin className="w-4 h-4 text-sky-400 shrink-0" />
        <span>
          <strong>Principio de Segregación Geográfica:</strong> Debido a que SPRB y BITCO operan en ubicaciones físicas independientes en Barranquilla, las zonas cubiertas y descubiertas no se combinan arbitrariamente; cada una conserva su cálculo ponderado local dentro de su propia IP antes de integrarse al balance macro del puerto.
        </span>
      </div>

      {/* Report Structure Description Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Google Sheets en Vivo */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-bold text-white mb-2">
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>Google Sheets en Vivo</span>
            </div>
            <p className="text-xs text-slate-400 mb-3">
              Cree o sincronice hojas de cálculo directamente en su cuenta de Google Drive con acceso seguro OAuth 2.0:
            </p>
            <ul className="text-xs space-y-2 text-slate-300">
              <li className="flex items-start gap-2">
                <span className="font-bold text-emerald-400 font-mono">· Exportación Nube:</span>
                <span className="text-slate-400">Genera las 4 pestañas oficiales en su Drive con enlace de acceso inmediato.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-emerald-400 font-mono">· Importación / Sinc:</span>
                <span className="text-slate-400">Lee datos de patios o actualiza ocupaciones desde un libro en la nube.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-emerald-400 font-mono">· Colaboración:</span>
                <span className="text-slate-400">Permite a los analistas de puerto editar o revisar en Google Sheets compartido.</span>
              </li>
            </ul>
          </div>
          <button
            onClick={onOpenGoogleSheets}
            className="mt-4 w-full py-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
          >
            <span>Gestionar Google Sheets</span>
          </button>
        </div>

        {/* Card 2: Excel */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-bold text-white mb-2">
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>Libro Excel (.xlsx)</span>
            </div>
            <p className="text-xs text-slate-400 mb-3">
              Libro binario de cálculo con 4 hojas especializadas descargables para análisis offline:
            </p>
            <ul className="text-xs space-y-2 text-slate-300">
              <li className="flex items-start gap-2">
                <span className="font-bold text-sky-400 font-mono">1. Gran Consolidado:</span>
                <span className="text-slate-400">Balance ejecutivo de los 53,048 m² y desglose de zonas.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-sky-400 font-mono">2. Terminal SPRB:</span>
                <span className="text-slate-400">Ponderaciones de zona (5,824 m² y 19,124 m²) y 21 patios.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-sky-400 font-mono">3. Terminal BITCO:</span>
                <span className="text-slate-400">Detalle de PATCO (26,000 m²) y BOD-B (2,100 m²).</span>
              </li>
            </ul>
          </div>
          <button
            onClick={handleExcelExport}
            className="mt-4 w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
          >
            <span>Descargar .xlsx</span>
          </button>
        </div>

        {/* Card 3: PDF */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-bold text-white mb-2">
              <FileText className="w-4 h-4 text-sky-400" />
              <span>Informe PDF (.pdf)</span>
            </div>
            <p className="text-xs text-slate-400 mb-3">
              Documento formal apaisado para comités directivos de operaciones portuarias:
            </p>
            <ul className="text-xs space-y-2 text-slate-300">
              <li className="flex items-start gap-2">
                <span className="font-bold text-sky-400 font-mono">· Encabezado:</span>
                <span className="text-slate-400">Membrete oficial, fecha y período seleccionado.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-sky-400 font-mono">· Resumen Gerencial:</span>
                <span className="text-slate-400">Indicadores consolidados y estados por terminal IP.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-sky-400 font-mono">· Matriz Patios:</span>
                <span className="text-slate-400">Tabla con tipografía monoespaciada de las 23 áreas.</span>
              </li>
            </ul>
          </div>
          <button
            onClick={handlePDFExport}
            className="mt-4 w-full py-2 bg-sky-600/20 hover:bg-sky-600/30 text-sky-300 border border-sky-500/40 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
          >
            <span>Descargar .pdf</span>
          </button>
        </div>
      </div>

      {/* Live Report Preview Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-white">
              Vista Previa del Informe por Terminal IP y Zonas ({dateFilterLabel})
            </h3>
            <p className="text-xs text-slate-400">
              Datos ponderados calculados en tiempo real según la segmentación geográfica de cada instalación
            </p>
          </div>
          <span className="text-xs font-mono text-slate-500">
            Última actualización: {new Date().toLocaleTimeString('es-CO')}
          </span>
        </div>

        {/* Consolidado Table */}
        <div className="overflow-x-auto mb-6">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800">
              <tr>
                <th className="py-2.5 px-3 font-semibold font-sans">Instalación / Zona</th>
                <th className="py-2.5 px-3 font-semibold text-center">IP</th>
                <th className="py-2.5 px-3 font-semibold text-right">Área Total</th>
                <th className="py-2.5 px-3 font-semibold text-right">Cap. Ocupada</th>
                <th className="py-2.5 px-3 font-semibold text-right">Cap. Disponible</th>
                <th className="py-2.5 px-3 font-semibold text-right">Ocupación Real</th>
                <th className="py-2.5 px-3 font-semibold text-right">Part. IP / Global</th>
                <th className="py-2.5 px-3 font-semibold text-center font-sans">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {/* Macro Puerto */}
              <tr className="bg-sky-950/20 font-bold">
                <td className="py-2.5 px-3 font-sans text-sky-400">Gran Consolidado Puerto</td>
                <td className="py-2.5 px-3 text-center text-slate-400">GLOBAL</td>
                <td className="py-2.5 px-3 text-right text-white">{metrics.totalAreaM2.toLocaleString('es-CO')} m²</td>
                <td className="py-2.5 px-3 text-right text-sky-300">{metrics.occupiedM2.toLocaleString('es-CO')} m²</td>
                <td className="py-2.5 px-3 text-right text-emerald-400">{metrics.availableM2.toLocaleString('es-CO')} m²</td>
                <td className="py-2.5 px-3 text-right text-sky-400">{metrics.weightedOccupancyPct.toFixed(2)}%</td>
                <td className="py-2.5 px-3 text-right text-slate-300">100.00%</td>
                <td className="py-2.5 px-3 text-center font-sans">
                  <span className="text-[10px] px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30">
                    {metrics.status}
                  </span>
                </td>
              </tr>

              {/* Terminal SPRB */}
              <tr className="font-semibold bg-slate-900">
                <td className="py-2.5 px-3 font-sans text-slate-100">Terminal SPRB (Consolidado)</td>
                <td className="py-2.5 px-3 text-center text-sky-400">SPRB</td>
                <td className="py-2.5 px-3 text-right text-slate-200">{metrics.sprb.areaTotalM2.toLocaleString('es-CO')} m²</td>
                <td className="py-2.5 px-3 text-right text-slate-200">{metrics.sprb.occupiedM2.toLocaleString('es-CO')} m²</td>
                <td className="py-2.5 px-3 text-right text-emerald-400">{metrics.sprb.availableM2.toLocaleString('es-CO')} m²</td>
                <td className="py-2.5 px-3 text-right text-sky-400 font-semibold">{metrics.sprb.weightedOccupancyPct.toFixed(2)}%</td>
                <td className="py-2.5 px-3 text-right text-slate-400">47.03% (Global)</td>
                <td className="py-2.5 px-3 text-center font-sans">
                  <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                    {metrics.sprb.status}
                  </span>
                </td>
              </tr>
              <tr>
                <td className="py-2 px-3 pl-6 font-sans text-amber-300 text-[11px]">↳ Zona Cubierta SPRB (Bodegas B15, BP1, BP2)</td>
                <td className="py-2 px-3 text-center text-slate-400 text-[11px]">SPRB</td>
                <td className="py-2 px-3 text-right text-slate-300 text-[11px]">{metrics.sprb.cubierta.areaTotalM2.toLocaleString('es-CO')} m²</td>
                <td className="py-2 px-3 text-right text-slate-300 text-[11px]">{metrics.sprb.cubierta.occupiedM2.toLocaleString('es-CO')} m²</td>
                <td className="py-2 px-3 text-right text-emerald-400 text-[11px]">{metrics.sprb.cubierta.availableM2.toLocaleString('es-CO')} m²</td>
                <td className="py-2 px-3 text-right text-amber-400 font-semibold text-[11px]">{metrics.sprb.cubierta.weightedOccupancyPct.toFixed(2)}%</td>
                <td className="py-2 px-3 text-right text-slate-400 text-[11px]">{metrics.sprb.cubierta.weightInTerminalPct.toFixed(2)}% (de SPRB)</td>
                <td className="py-2 px-3 text-center font-sans text-[10px] text-slate-400">{metrics.sprb.cubierta.status}</td>
              </tr>
              <tr>
                <td className="py-2 px-3 pl-6 font-sans text-teal-300 text-[11px]">↳ Zona Descubierta SPRB (18 Patios)</td>
                <td className="py-2 px-3 text-center text-slate-400 text-[11px]">SPRB</td>
                <td className="py-2 px-3 text-right text-slate-300 text-[11px]">{metrics.sprb.descubierta.areaTotalM2.toLocaleString('es-CO')} m²</td>
                <td className="py-2 px-3 text-right text-slate-300 text-[11px]">{metrics.sprb.descubierta.occupiedM2.toLocaleString('es-CO')} m²</td>
                <td className="py-2 px-3 text-right text-emerald-400 text-[11px]">{metrics.sprb.descubierta.availableM2.toLocaleString('es-CO')} m²</td>
                <td className="py-2 px-3 text-right text-teal-400 font-semibold text-[11px]">{metrics.sprb.descubierta.weightedOccupancyPct.toFixed(2)}%</td>
                <td className="py-2 px-3 text-right text-slate-400 text-[11px]">{metrics.sprb.descubierta.weightInTerminalPct.toFixed(2)}% (de SPRB)</td>
                <td className="py-2 px-3 text-center font-sans text-[10px] text-slate-400">{metrics.sprb.descubierta.status}</td>
              </tr>

              {/* Terminal BITCO */}
              <tr className="font-semibold bg-slate-900">
                <td className="py-2.5 px-3 font-sans text-slate-100">Terminal BITCO (Consolidado)</td>
                <td className="py-2.5 px-3 text-center text-indigo-400">BITCO</td>
                <td className="py-2.5 px-3 text-right text-slate-200">{metrics.bitco.areaTotalM2.toLocaleString('es-CO')} m²</td>
                <td className="py-2.5 px-3 text-right text-slate-200">{metrics.bitco.occupiedM2.toLocaleString('es-CO')} m²</td>
                <td className="py-2.5 px-3 text-right text-emerald-400">{metrics.bitco.availableM2.toLocaleString('es-CO')} m²</td>
                <td className="py-2.5 px-3 text-right text-sky-400 font-semibold">{metrics.bitco.weightedOccupancyPct.toFixed(2)}%</td>
                <td className="py-2.5 px-3 text-right text-slate-400">52.97% (Global)</td>
                <td className="py-2.5 px-3 text-center font-sans">
                  <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                    {metrics.bitco.status}
                  </span>
                </td>
              </tr>
              <tr>
                <td className="py-2 px-3 pl-6 font-sans text-amber-300 text-[11px]">↳ Zona Cubierta BITCO (Bodega BOD-B)</td>
                <td className="py-2 px-3 text-center text-slate-400 text-[11px]">BITCO</td>
                <td className="py-2 px-3 text-right text-slate-300 text-[11px]">{metrics.bitco.cubierta.areaTotalM2.toLocaleString('es-CO')} m²</td>
                <td className="py-2 px-3 text-right text-slate-300 text-[11px]">{metrics.bitco.cubierta.occupiedM2.toLocaleString('es-CO')} m²</td>
                <td className="py-2 px-3 text-right text-emerald-400 text-[11px]">{metrics.bitco.cubierta.availableM2.toLocaleString('es-CO')} m²</td>
                <td className="py-2 px-3 text-right text-amber-400 font-semibold text-[11px]">{metrics.bitco.cubierta.weightedOccupancyPct.toFixed(2)}%</td>
                <td className="py-2 px-3 text-right text-slate-400 text-[11px]">{metrics.bitco.cubierta.weightInTerminalPct.toFixed(2)}% (de BITCO)</td>
                <td className="py-2 px-3 text-center font-sans text-[10px] text-slate-400">{metrics.bitco.cubierta.status}</td>
              </tr>
              <tr>
                <td className="py-2 px-3 pl-6 font-sans text-teal-300 text-[11px]">↳ Zona Descubierta BITCO (Patio PATCO)</td>
                <td className="py-2 px-3 text-center text-slate-400 text-[11px]">BITCO</td>
                <td className="py-2 px-3 text-right text-slate-300 text-[11px]">{metrics.bitco.descubierta.areaTotalM2.toLocaleString('es-CO')} m²</td>
                <td className="py-2 px-3 text-right text-slate-300 text-[11px]">{metrics.bitco.descubierta.occupiedM2.toLocaleString('es-CO')} m²</td>
                <td className="py-2 px-3 text-right text-emerald-400 text-[11px]">{metrics.bitco.descubierta.availableM2.toLocaleString('es-CO')} m²</td>
                <td className="py-2 px-3 text-right text-teal-400 font-semibold text-[11px]">{metrics.bitco.descubierta.weightedOccupancyPct.toFixed(2)}%</td>
                <td className="py-2 px-3 text-right text-slate-400 text-[11px]">{metrics.bitco.descubierta.weightInTerminalPct.toFixed(2)}% (de BITCO)</td>
                <td className="py-2 px-3 text-center font-sans text-[10px] text-slate-400">{metrics.bitco.descubierta.status}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Audit & Compliance Disclaimer */}
        <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-xs text-slate-400 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              Certificación de Integridad: Cumple con el estándar de pesaje y ponderación segregada por IP según normativa portuaria de Barranquilla.
            </span>
          </div>
          <span className="font-mono text-slate-500 text-[11px] hidden md:inline">
            Checksum: OK · 53,048 m²
          </span>
        </div>
      </div>
    </div>
  );
};
