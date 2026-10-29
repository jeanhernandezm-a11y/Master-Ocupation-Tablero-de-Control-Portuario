import React, { useState } from 'react';
import {
  Layers,
  Ship,
  Warehouse,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  ArrowRight,
  Info,
  Compass,
  MapPin,
  Split,
} from 'lucide-react';
import { ConsolidatedMetrics, HistoricalRecord, YardCalculated, TerminalId } from '../types/occupancy';

interface ConsolidatedDashboardProps {
  metrics: ConsolidatedMetrics;
  history: HistoricalRecord[];
  onSelectTerminal: (term: TerminalId) => void;
  onSelectYard: (yard: YardCalculated) => void;
  onNavigateToTab: (tab: string) => void;
}

export const ConsolidatedDashboard: React.FC<ConsolidatedDashboardProps> = ({
  metrics,
  history,
  onSelectTerminal,
  onSelectYard,
  onNavigateToTab,
}) => {
  const [trendMetric, setTrendMetric] = useState<'terminals' | 'sprb_zones' | 'bitco_zones' | 'all'>('terminals');
  const [hoveredPoint, setHoveredPoint] = useState<HistoricalRecord | null>(null);

  const getStatusBadge = (status: 'OPTIMAL' | 'WARNING' | 'ALERT' | 'CRITICAL') => {
    switch (status) {
      case 'CRITICAL':
        return {
          bg: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
          dot: 'bg-rose-500',
          label: 'Saturación Crítica',
        };
      case 'ALERT':
        return {
          bg: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
          dot: 'bg-orange-500',
          label: 'Capacidad en Riesgo',
        };
      case 'WARNING':
        return {
          bg: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
          dot: 'bg-amber-500',
          label: 'Alerta Preventiva',
        };
      default:
        return {
          bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
          dot: 'bg-emerald-500',
          label: 'Operación Normal',
        };
    }
  };

  const globalStatus = getStatusBadge(metrics.status);

  // SVG Chart Dimensions
  const chartHeight = 220;
  const chartWidth = 1100;
  const paddingX = 45;
  const paddingY = 25;

  const pointsCount = history.length;
  const getX = (index: number) => {
    if (pointsCount <= 1) return chartWidth / 2;
    return paddingX + (index / (pointsCount - 1)) * (chartWidth - paddingX * 2);
  };
  const getY = (val: number) => {
    const normalized = Math.max(0, Math.min(100, val));
    return chartHeight - paddingY - (normalized / 100) * (chartHeight - paddingY * 2);
  };

  const globalPath = history
    .map((h, i) => `${i === 0 ? 'M' : 'L'} ${getX(i).toFixed(1)} ${getY(h.globalOccupancyPct).toFixed(1)}`)
    .join(' ');

  const sprbPath = history
    .map((h, i) => `${i === 0 ? 'M' : 'L'} ${getX(i).toFixed(1)} ${getY(h.sprbOccupancyPct).toFixed(1)}`)
    .join(' ');

  const bitcoPath = history
    .map((h, i) => `${i === 0 ? 'M' : 'L'} ${getX(i).toFixed(1)} ${getY(h.bitcoOccupancyPct).toFixed(1)}`)
    .join(' ');

  const sprbCubPath = history
    .map((h, i) => `${i === 0 ? 'M' : 'L'} ${getX(i).toFixed(1)} ${getY(h.sprbCubiertaPct).toFixed(1)}`)
    .join(' ');

  const sprbDescPath = history
    .map((h, i) => `${i === 0 ? 'M' : 'L'} ${getX(i).toFixed(1)} ${getY(h.sprbDescubiertaPct).toFixed(1)}`)
    .join(' ');

  const bitcoCubPath = history
    .map((h, i) => `${i === 0 ? 'M' : 'L'} ${getX(i).toFixed(1)} ${getY(h.bitcoCubiertaPct).toFixed(1)}`)
    .join(' ');

  const bitcoDescPath = history
    .map((h, i) => `${i === 0 ? 'M' : 'L'} ${getX(i).toFixed(1)} ${getY(h.bitcoDescubiertaPct).toFixed(1)}`)
    .join(' ');

  // Separation of yards by Terminal IP and Zone
  const sprbCubiertaYards = metrics.allYards.filter((y) => y.terminal === 'SPRB' && y.zone === 'CUBIERTA');
  const sprbDescubiertaYards = metrics.allYards.filter((y) => y.terminal === 'SPRB' && y.zone === 'DESCUBIERTA');
  const bitcoYards = metrics.allYards.filter((y) => y.terminal === 'BITCO');

  const criticalYards = [...metrics.allYards]
    .filter((y) => y.occupancyPct >= 75)
    .sort((a, b) => b.occupancyPct - a.occupancyPct);

  return (
    <div className="space-y-6">
      {/* 0. Notice banner explaining IP segregation */}
      <div className="p-3.5 bg-sky-950/30 border border-sky-800/60 rounded-xl text-xs text-sky-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center gap-2.5">
          <MapPin className="w-4 h-4 text-sky-400 shrink-0" />
          <span>
            <strong>Ponderación Segregada por IP:</strong> Dado que SPRB y BITCO están separadas geográficamente, el análisis de zonas (cubierta y descubierta) y la ocupación de patios se ponderan de manera independiente en cada terminal antes de consolidar el puerto.
          </span>
        </div>
        <span className="font-mono text-[11px] text-sky-400 whitespace-nowrap bg-sky-900/50 px-2 py-0.5 rounded border border-sky-700/50">
          SPRB (24,948 m²) · BITCO (28,100 m²)
        </span>
      </div>

      {/* 1. Main Executive Row: Gran Consolidado + IP SPRB + IP BITCO */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Gran Consolidado Macro (4 cols) */}
        <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col justify-between shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-sky-500/5 rounded-full blur-2xl pointer-events-none" />
          <div>
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <span className="font-semibold uppercase tracking-wider text-slate-300">Gran Consolidado Portuario</span>
              <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium border ${globalStatus.bg}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${globalStatus.dot}`} />
                {globalStatus.label}
              </span>
            </div>

            <div className="flex items-baseline gap-2 mb-1">
              <span className="text-3xl font-bold font-mono text-white tabular-nums">
                {metrics.weightedOccupancyPct.toFixed(1)}%
              </span>
              <span className="text-xs text-slate-400">ocupación total consolidada</span>
            </div>

            <p className="text-[11px] text-slate-400 mb-3">
              Total de almacenamiento: <strong className="text-white font-mono">53,048 m²</strong> distribuido entre las dos terminales.
            </p>

            <div className="w-full bg-slate-950 rounded-full h-2.5 mb-4 overflow-hidden border border-slate-800">
              <div
                className={`h-full transition-all duration-500 ${
                  metrics.weightedOccupancyPct >= 92
                    ? 'bg-rose-500'
                    : metrics.weightedOccupancyPct >= 85
                    ? 'bg-orange-500'
                    : metrics.weightedOccupancyPct >= 75
                    ? 'bg-amber-400'
                    : 'bg-sky-500'
                }`}
                style={{ width: `${Math.min(100, metrics.weightedOccupancyPct)}%` }}
              />
            </div>

            {/* Split bar by terminal */}
            <div className="space-y-1.5 text-xs font-mono mb-2">
              <div className="flex justify-between text-[11px]">
                <span className="text-sky-400 font-semibold">IP SPRB (47.03% del puerto):</span>
                <span className="text-slate-200">{metrics.sprb.weightedOccupancyPct.toFixed(1)}% ocupado</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-indigo-400 font-semibold">IP BITCO (52.97% del puerto):</span>
                <span className="text-slate-200">{metrics.bitco.weightedOccupancyPct.toFixed(1)}% ocupado</span>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800 text-xs font-mono grid grid-cols-2 gap-2 text-slate-400">
            <div>
              <div className="text-[10px] uppercase text-slate-500">M² Ocupados</div>
              <div className="text-slate-200 font-semibold">{metrics.occupiedM2.toLocaleString('es-CO')} m²</div>
            </div>
            <div className="text-right">
              <div className="text-[10px] uppercase text-slate-500">M² Libres</div>
              <div className="text-emerald-400 font-semibold">{metrics.availableM2.toLocaleString('es-CO')} m²</div>
            </div>
          </div>
        </div>

        {/* IP SPRB Geographically Independent Card (4 cols) */}
        <div
          onClick={() => onSelectTerminal('SPRB')}
          className="lg:col-span-4 bg-slate-900 border border-slate-800 hover:border-sky-500/50 rounded-xl p-5 flex flex-col justify-between shadow-sm cursor-pointer transition-all group"
        >
          <div>
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <div className="flex items-center gap-1.5">
                <Ship className="w-4 h-4 text-sky-400" />
                <span className="font-bold text-sm text-white">Terminal SPRB</span>
              </div>
              <span className="text-[11px] font-mono text-sky-400 bg-sky-950/60 px-2 py-0.5 rounded border border-sky-800/40">
                24,948 m² · 47.0% Global
              </span>
            </div>

            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-2xl font-bold font-mono text-white tabular-nums">
                {metrics.sprb.weightedOccupancyPct.toFixed(1)}%
              </span>
              <span className="text-xs text-slate-400">ocupación ponderada en SPRB</span>
            </div>

            {/* Zonas internas de SPRB */}
            <div className="space-y-2.5 p-3 bg-slate-950/70 rounded-lg border border-slate-800/80 mb-3 text-xs">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Ponderación de Zonas en SPRB:
              </div>

              {/* Zona Cubierta SPRB */}
              <div>
                <div className="flex items-center justify-between text-[11px] mb-1">
                  <span className="text-amber-400 font-medium">Cubierta (5,824 m² · 23.34% SPRB)</span>
                  <span className="font-mono text-white font-bold">{metrics.sprb.cubierta.weightedOccupancyPct.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
                  <div className="h-full bg-amber-500" style={{ width: `${Math.min(100, metrics.sprb.cubierta.weightedOccupancyPct)}%` }} />
                </div>
                <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-0.5">
                  <span>Ocup: {metrics.sprb.cubierta.occupiedM2} m²</span>
                  <span className="text-emerald-400">Libre: {metrics.sprb.cubierta.availableM2} m²</span>
                </div>
              </div>

              {/* Zona Descubierta SPRB */}
              <div>
                <div className="flex items-center justify-between text-[11px] mb-1">
                  <span className="text-teal-400 font-medium">Descubierta (19,124 m² · 76.66% SPRB)</span>
                  <span className="font-mono text-white font-bold">{metrics.sprb.descubierta.weightedOccupancyPct.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
                  <div className="h-full bg-teal-500" style={{ width: `${Math.min(100, metrics.sprb.descubierta.weightedOccupancyPct)}%` }} />
                </div>
                <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-0.5">
                  <span>Ocup: {metrics.sprb.descubierta.occupiedM2.toLocaleString('es-CO')} m²</span>
                  <span className="text-emerald-400">Libre: {metrics.sprb.descubierta.availableM2.toLocaleString('es-CO')} m²</span>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800 text-xs font-mono flex items-center justify-between text-slate-400">
            <span>Libre SPRB: <strong className="text-emerald-400">{metrics.sprb.availableM2.toLocaleString('es-CO')} m²</strong></span>
            <span className="text-sky-400 group-hover:translate-x-0.5 transition-transform flex items-center text-[11px]">
              Inspeccionar SPRB <ArrowRight className="w-3 h-3 ml-0.5" />
            </span>
          </div>
        </div>

        {/* IP BITCO Geographically Independent Card (4 cols) */}
        <div
          onClick={() => onSelectTerminal('BITCO')}
          className="lg:col-span-4 bg-slate-900 border border-slate-800 hover:border-indigo-500/50 rounded-xl p-5 flex flex-col justify-between shadow-sm cursor-pointer transition-all group"
        >
          <div>
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <div className="flex items-center gap-1.5">
                <Warehouse className="w-4 h-4 text-indigo-400" />
                <span className="font-bold text-sm text-white">Terminal BITCO</span>
              </div>
              <span className="text-[11px] font-mono text-indigo-400 bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-800/40">
                28,100 m² · 53.0% Global
              </span>
            </div>

            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-2xl font-bold font-mono text-white tabular-nums">
                {metrics.bitco.weightedOccupancyPct.toFixed(1)}%
              </span>
              <span className="text-xs text-slate-400">ocupación ponderada en BITCO</span>
            </div>

            {/* Zonas internas de BITCO */}
            <div className="space-y-2.5 p-3 bg-slate-950/70 rounded-lg border border-slate-800/80 mb-3 text-xs">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Ponderación de Zonas en BITCO:
              </div>

              {/* Zona Cubierta BITCO */}
              <div>
                <div className="flex items-center justify-between text-[11px] mb-1">
                  <span className="text-amber-400 font-medium">BOD-B Cubierta (2,100 m² · 7.47% BITCO)</span>
                  <span className="font-mono text-white font-bold">{metrics.bitco.cubierta.weightedOccupancyPct.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
                  <div className="h-full bg-amber-500" style={{ width: `${Math.min(100, metrics.bitco.cubierta.weightedOccupancyPct)}%` }} />
                </div>
                <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-0.5">
                  <span>Ocup: {metrics.bitco.cubierta.occupiedM2} m²</span>
                  <span className="text-emerald-400">Libre: {metrics.bitco.cubierta.availableM2} m²</span>
                </div>
              </div>

              {/* Zona Descubierta BITCO */}
              <div>
                <div className="flex items-center justify-between text-[11px] mb-1">
                  <span className="text-teal-400 font-medium">PATCO Descubierta (26,000 m² · 92.53% BITCO)</span>
                  <span className="font-mono text-white font-bold">{metrics.bitco.descubierta.weightedOccupancyPct.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
                  <div className="h-full bg-teal-500" style={{ width: `${Math.min(100, metrics.bitco.descubierta.weightedOccupancyPct)}%` }} />
                </div>
                <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-0.5">
                  <span>Ocup: {metrics.bitco.descubierta.occupiedM2.toLocaleString('es-CO')} m²</span>
                  <span className="text-emerald-400">Libre: {metrics.bitco.descubierta.availableM2.toLocaleString('es-CO')} m²</span>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800 text-xs font-mono flex items-center justify-between text-slate-400">
            <span>Libre BITCO: <strong className="text-emerald-400">{metrics.bitco.availableM2.toLocaleString('es-CO')} m²</strong></span>
            <span className="text-sky-400 group-hover:translate-x-0.5 transition-transform flex items-center text-[11px]">
              Inspeccionar BITCO <ArrowRight className="w-3 h-3 ml-0.5" />
            </span>
          </div>
        </div>
      </div>

      {/* 2. Interactive Charts Section & Capacity Diagnostics */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Historical Trend Chart Segregated by IP */}
        <div className="lg:col-span-8 xl:col-span-8 2xl:col-span-9 bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-sky-400" />
                Comportamiento Temporal Ponderado
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Seguimiento de ocupación según la segmentación geográfica de terminales y zonas
              </p>
            </div>

            {/* Segmented series toggles */}
            <div className="flex flex-wrap items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
              <button
                onClick={() => setTrendMetric('terminals')}
                className={`px-2.5 py-1 rounded font-medium transition-colors ${
                  trendMetric === 'terminals' ? 'bg-sky-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                IP SPRB vs IP BITCO
              </button>
              <button
                onClick={() => setTrendMetric('sprb_zones')}
                className={`px-2.5 py-1 rounded font-medium transition-colors ${
                  trendMetric === 'sprb_zones' ? 'bg-sky-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Zonas SPRB
              </button>
              <button
                onClick={() => setTrendMetric('bitco_zones')}
                className={`px-2.5 py-1 rounded font-medium transition-colors ${
                  trendMetric === 'bitco_zones' ? 'bg-sky-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Zonas BITCO
              </button>
              <button
                onClick={() => setTrendMetric('all')}
                className={`px-2.5 py-1 rounded font-medium transition-colors ${
                  trendMetric === 'all' ? 'bg-sky-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Consolidado
              </button>
            </div>
          </div>

          {/* SVG Line Chart */}
          {pointsCount === 0 ? (
            <div className="h-56 flex flex-col items-center justify-center text-center p-6 bg-slate-950/40 rounded-lg border border-slate-800/80">
              <TrendingUp className="w-8 h-8 text-slate-600 mb-2" />
              <div className="text-sm font-semibold text-slate-300">
                Sin datos registrados en Google Sheets para este período
              </div>
              <p className="text-xs text-slate-500 mt-1 max-w-md">
                La gráfica refleja exclusivamente las fechas con registros reales encontrados en la base de datos de Google Sheets. Modifique el filtro de fechas en la barra superior o sincronice su hoja de cálculo.
              </p>
            </div>
          ) : (
            <div className="relative w-full overflow-hidden">
              <svg
                viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                className="w-full h-56 select-none font-mono text-[10px]"
              >
                {/* Grid Lines */}
                {[20, 40, 60, 80, 100].map((level) => {
                  const y = getY(level);
                  return (
                    <g key={level}>
                      <line
                        x1={paddingX}
                        y1={y}
                        x2={chartWidth - paddingX}
                        y2={y}
                        stroke="#1e293b"
                        strokeDasharray={level === 80 ? '4 4' : 'none'}
                        strokeWidth={level === 80 ? '1.5' : '1'}
                      />
                      <text x={paddingX - 8} y={y + 3} textAnchor="end" fill="#64748b">
                        {level}%
                      </text>
                    </g>
                  );
                })}

                {/* Warning benchmark threshold line at 85% */}
                <line
                  x1={paddingX}
                  y1={getY(85)}
                  x2={chartWidth - paddingX}
                  y2={getY(85)}
                  stroke="#f97316"
                  strokeDasharray="2 2"
                  strokeWidth="1"
                  opacity="0.6"
                />
                <text x={chartWidth - paddingX + 4} y={getY(85) + 3} fill="#f97316" textAnchor="start" className="text-[8px]">
                  Umbral 85%
                </text>

                {/* Series Lines (drawn if 2 or more points) */}
                {pointsCount > 1 && (
                  <>
                    {trendMetric === 'terminals' && (
                      <>
                        <path d={sprbPath} fill="none" stroke="#38bdf8" strokeWidth="2.5" />
                        <path d={bitcoPath} fill="none" stroke="#818cf8" strokeWidth="2.5" />
                      </>
                    )}

                    {trendMetric === 'sprb_zones' && (
                      <>
                        <path d={sprbCubPath} fill="none" stroke="#f59e0b" strokeWidth="2.5" />
                        <path d={sprbDescPath} fill="none" stroke="#14b8a6" strokeWidth="2.5" />
                      </>
                    )}

                    {trendMetric === 'bitco_zones' && (
                      <>
                        <path d={bitcoCubPath} fill="none" stroke="#f59e0b" strokeWidth="2.5" />
                        <path d={bitcoDescPath} fill="none" stroke="#14b8a6" strokeWidth="2.5" />
                      </>
                    )}

                    {trendMetric === 'all' && (
                      <>
                        <path d={globalPath} fill="none" stroke="#38bdf8" strokeWidth="2.5" />
                        <path d={sprbPath} fill="none" stroke="#0284c7" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.7" />
                        <path d={bitcoPath} fill="none" stroke="#818cf8" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.7" />
                      </>
                    )}
                  </>
                )}

                {/* Discrete Data Points for exact dates found in Google Sheets */}
                {history.map((record, index) => {
                  const x = getX(index);
                  return (
                    <g key={`points-${record.date}`}>
                      {trendMetric === 'terminals' && (
                        <>
                          <circle cx={x} cy={getY(record.sprbOccupancyPct)} r={pointsCount <= 12 ? 4 : 2.5} fill="#38bdf8" stroke="#0f172a" strokeWidth="1.5" />
                          <circle cx={x} cy={getY(record.bitcoOccupancyPct)} r={pointsCount <= 12 ? 4 : 2.5} fill="#818cf8" stroke="#0f172a" strokeWidth="1.5" />
                        </>
                      )}
                      {trendMetric === 'sprb_zones' && (
                        <>
                          <circle cx={x} cy={getY(record.sprbCubiertaPct)} r={pointsCount <= 12 ? 4 : 2.5} fill="#f59e0b" stroke="#0f172a" strokeWidth="1.5" />
                          <circle cx={x} cy={getY(record.sprbDescubiertaPct)} r={pointsCount <= 12 ? 4 : 2.5} fill="#14b8a6" stroke="#0f172a" strokeWidth="1.5" />
                        </>
                      )}
                      {trendMetric === 'bitco_zones' && (
                        <>
                          <circle cx={x} cy={getY(record.bitcoCubiertaPct)} r={pointsCount <= 12 ? 4 : 2.5} fill="#f59e0b" stroke="#0f172a" strokeWidth="1.5" />
                          <circle cx={x} cy={getY(record.bitcoDescubiertaPct)} r={pointsCount <= 12 ? 4 : 2.5} fill="#14b8a6" stroke="#0f172a" strokeWidth="1.5" />
                        </>
                      )}
                      {trendMetric === 'all' && (
                        <>
                          <circle cx={x} cy={getY(record.globalOccupancyPct)} r={pointsCount <= 12 ? 4 : 2.5} fill="#38bdf8" stroke="#0f172a" strokeWidth="1.5" />
                        </>
                      )}
                    </g>
                  );
                })}

                {/* Hover triggers */}
                {history.map((record, index) => {
                  const x = getX(index);
                  return (
                    <g
                      key={record.date}
                      className="cursor-pointer group"
                      onMouseEnter={() => setHoveredPoint(record)}
                      onMouseLeave={() => setHoveredPoint(null)}
                    >
                      <line x1={x} y1={paddingY} x2={x} y2={chartHeight - paddingY} stroke="transparent" strokeWidth="14" />
                      {(pointsCount <= 10 ||
                        index === 0 ||
                        index === Math.floor(pointsCount / 2) ||
                        index === pointsCount - 1) && (
                        <text x={x} y={chartHeight - 6} textAnchor="middle" fill="#64748b">
                          {record.label}
                        </text>
                      )}
                    </g>
                  );
                })}
              </svg>

              {/* Hover Tooltip */}
              {hoveredPoint && (
                <div className="absolute top-2 right-2 bg-slate-950/95 border border-slate-700 rounded-lg p-2.5 text-xs font-mono shadow-xl pointer-events-none z-10 backdrop-blur">
                  <div className="text-slate-400 font-semibold mb-1 border-b border-slate-800 pb-1">
                    Fecha: {hoveredPoint.date} ({hoveredPoint.label})
                  </div>
                  <div className="space-y-0.5">
                    <div className="text-sky-400">
                      IP SPRB: <strong>{hoveredPoint.sprbOccupancyPct.toFixed(1)}%</strong> ({hoveredPoint.sprbOccupiedM2.toLocaleString('es-CO')} m²)
                    </div>
                    <div className="text-indigo-400">
                      IP BITCO: <strong>{hoveredPoint.bitcoOccupancyPct.toFixed(1)}%</strong> ({hoveredPoint.bitcoOccupiedM2.toLocaleString('es-CO')} m²)
                    </div>
                    {trendMetric === 'sprb_zones' && (
                      <>
                        <div className="text-amber-400 text-[11px]">
                          Cubierta SPRB: {hoveredPoint.sprbCubiertaPct.toFixed(1)}%
                        </div>
                        <div className="text-teal-400 text-[11px]">
                          Descubierta SPRB: {hoveredPoint.sprbDescubiertaPct.toFixed(1)}%
                        </div>
                      </>
                    )}
                    {trendMetric === 'bitco_zones' && (
                      <>
                        <div className="text-amber-400 text-[11px]">
                          Cubierta BITCO (BOD-B): {hoveredPoint.bitcoCubiertaPct.toFixed(1)}%
                        </div>
                        <div className="text-teal-400 text-[11px]">
                          Descubierta BITCO (PATCO): {hoveredPoint.bitcoDescubiertaPct.toFixed(1)}%
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Legend */}
          <div className="flex flex-wrap items-center justify-between text-xs text-slate-400 pt-3 border-t border-slate-800/80 mt-2">
            <div className="flex items-center gap-4">
              {trendMetric === 'terminals' && (
                <>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-0.5 bg-sky-400" />
                    <span>IP SPRB (24,948 m²)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-0.5 bg-indigo-400" />
                    <span>IP BITCO (28,100 m²)</span>
                  </div>
                </>
              )}
              {trendMetric === 'sprb_zones' && (
                <>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-0.5 bg-amber-400" />
                    <span>Zona Cubierta SPRB (5,824 m² · 23.34%)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-0.5 bg-teal-400" />
                    <span>Zona Descubierta SPRB (19,124 m² · 76.66%)</span>
                  </div>
                </>
              )}
              {trendMetric === 'bitco_zones' && (
                <>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-0.5 bg-amber-400" />
                    <span>Zona Cubierta BITCO (2,100 m² · 7.47%)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-0.5 bg-teal-400" />
                    <span>Zona Descubierta BITCO (26,000 m² · 92.53%)</span>
                  </div>
                </>
              )}
              {trendMetric === 'all' && (
                <>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-0.5 bg-sky-400" />
                    <span>Consolidado Global (53,048 m²)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-0.5 bg-sky-600 border-b border-dashed" />
                    <span>SPRB</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-0.5 bg-indigo-400 border-b border-dashed" />
                    <span>BITCO</span>
                  </div>
                </>
              )}
            </div>
            <div className="text-slate-500 font-mono text-[11px]">
              Actualizado en tiempo real
            </div>
          </div>
        </div>

        {/* Right: Capacity Alert Monitor */}
        <div className="lg:col-span-4 xl:col-span-4 2xl:col-span-3 bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                Alertas por Terminal (IP)
              </h3>
              <button
                onClick={() => onNavigateToTab('alertas')}
                className="text-xs text-sky-400 hover:text-sky-300 font-medium"
              >
                Ver todas ({criticalYards.length})
              </button>
            </div>
            <p className="text-xs text-slate-400 mb-4">
              Patios y bodegas que sobrepasan el margen seguro (&gt;75%) según su ubicación física.
            </p>

            <div className="space-y-2.5 max-h-[260px] overflow-y-auto pr-1">
              {criticalYards.slice(0, 5).map((yard) => {
                return (
                  <div
                    key={yard.id}
                    onClick={() => onSelectYard(yard)}
                    className="p-2.5 bg-slate-950/70 border border-slate-800 hover:border-slate-700 rounded-lg cursor-pointer transition-colors"
                  >
                    <div className="flex items-center justify-between text-xs mb-1">
                      <div className="flex items-center gap-1.5 font-semibold text-slate-200">
                        <span className={`px-1 py-0.2 rounded text-[10px] font-mono font-bold ${
                          yard.terminal === 'SPRB' ? 'bg-sky-950 text-sky-400 border border-sky-800/60' : 'bg-indigo-950 text-indigo-400 border border-indigo-800/60'
                        }`}>
                          {yard.terminal}
                        </span>
                        <span>{yard.name}</span>
                        <span className="text-[10px] text-slate-500 font-mono">({yard.zone})</span>
                      </div>
                      <span className={`text-[11px] font-mono font-bold ${
                        yard.occupancyPct >= 92 ? 'text-rose-400' : yard.occupancyPct >= 85 ? 'text-orange-400' : 'text-amber-400'
                      }`}>
                        {yard.occupancyPct.toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full bg-slate-900 rounded-full h-1.5 mb-1.5 overflow-hidden">
                      <div
                        className={`h-full ${
                          yard.occupancyPct >= 92 ? 'bg-rose-500' : yard.occupancyPct >= 85 ? 'bg-orange-500' : 'bg-amber-400'
                        }`}
                        style={{ width: `${Math.min(100, yard.occupancyPct)}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                      <span>Capacidad: {yard.areaTotalM2.toLocaleString('es-CO')} m²</span>
                      <span>Libre: <strong className="text-emerald-400">{yard.availableM2.toLocaleString('es-CO')} m²</strong></span>
                    </div>
                  </div>
                );
              })}

              {criticalYards.length === 0 && (
                <div className="p-4 text-center text-xs text-slate-500 bg-slate-950 rounded-lg">
                  <CheckCircle2 className="w-6 h-6 text-emerald-400 mx-auto mb-1" />
                  Operación balanceada: ninguno de los patios de SPRB ni BITCO supera el 75%.
                </div>
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800 text-xs text-slate-400 flex items-center justify-between">
            <span className="font-mono text-[11px]">Consolidado: {metrics.weightedOccupancyPct.toFixed(2)}%</span>
            <button
              onClick={() => onNavigateToTab('maestro')}
              className="text-sky-400 hover:text-sky-300 font-medium flex items-center gap-1"
            >
              Maestro completo <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* 3. Spatial Heatmap / Yard Grid Separated Geographically by IP */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-6">
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-1">
            <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
              <Compass className="w-4 h-4 text-sky-400" />
              Matriz Espacial de Almacenamiento por Instalación Portuaria (IP)
            </h3>

            {/* Legend */}
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 font-mono">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />
                <span>&lt;75% Óptimo</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-amber-400" />
                <span>75-85% Alerta</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-orange-500" />
                <span>85-92% Riesgo</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-rose-500" />
                <span>&gt;92% Crítico</span>
              </div>
            </div>
          </div>
          <p className="text-xs text-slate-400">
            Patios y bodegas ordenados por su terminal física (IP) y zona de almacenamiento
          </p>
        </div>

        {/* SECTION 1: SECTOR GEOGRÁFICO SPRB */}
        <div className="p-4 bg-slate-950/80 border border-sky-900/40 rounded-xl">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Ship className="w-4 h-4 text-sky-400" />
              <span className="font-bold text-sm text-sky-300">Terminal SPRB (24,948 m² · 21 Unidades)</span>
            </div>
            <div className="text-xs font-mono text-slate-400 flex items-center gap-3">
              <span>Cubierta: <strong className="text-amber-400">{metrics.sprb.cubierta.areaTotalM2} m² (23.34%)</strong></span>
              <span>·</span>
              <span>Descubierta: <strong className="text-teal-400">{metrics.sprb.descubierta.areaTotalM2.toLocaleString('es-CO')} m² (76.66%)</strong></span>
              <span>·</span>
              <span>Ocup. Ponderada SPRB: <strong className="text-white">{metrics.sprb.weightedOccupancyPct.toFixed(1)}%</strong></span>
            </div>
          </div>

          {/* Subsector: Bodegas Cubiertas SPRB */}
          <div className="mb-4">
            <div className="text-xs font-semibold text-amber-400 mb-2 flex items-center gap-1.5">
              <span>Bodegas Techadas SPRB (Zona Cubierta · 5,824 m²)</span>
              <span className="text-[11px] text-slate-400 font-mono">
                · Ocupación Real: {metrics.sprb.cubierta.weightedOccupancyPct.toFixed(1)}%
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              {sprbCubiertaYards.map((yard) => renderYardCard(yard, onSelectYard, true))}
            </div>
          </div>

          {/* Subsector: Patios Descubiertos SPRB */}
          <div>
            <div className="text-xs font-semibold text-teal-400 mb-2 flex items-center gap-1.5">
              <span>Patios Descubiertos SPRB (Zona Descubierta · 19,124 m²)</span>
              <span className="text-[11px] text-slate-400 font-mono">
                · Ocupación Real: {metrics.sprb.descubierta.weightedOccupancyPct.toFixed(1)}%
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-6 2xl:grid-cols-9 gap-3">
              {sprbDescubiertaYards.map((yard) => renderYardCard(yard, onSelectYard))}
            </div>
          </div>
        </div>

        {/* SECTION 2: SECTOR GEOGRÁFICO BITCO */}
        <div className="p-4 bg-slate-950/80 border border-indigo-900/40 rounded-xl">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Warehouse className="w-4 h-4 text-indigo-400" />
              <span className="font-bold text-sm text-indigo-300">Terminal BITCO (28,100 m² · 2 Unidades)</span>
            </div>
            <div className="text-xs font-mono text-slate-400 flex items-center gap-3">
              <span>Cubierta BOD-B: <strong className="text-amber-400">2,100 m² (7.47%)</strong></span>
              <span>·</span>
              <span>Descubierta PATCO: <strong className="text-teal-400">26,000 m² (92.53%)</strong></span>
              <span>·</span>
              <span>Ocup. Ponderada BITCO: <strong className="text-white">{metrics.bitco.weightedOccupancyPct.toFixed(1)}%</strong></span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {bitcoYards.map((yard) => renderYardCard(yard, onSelectYard, true))}
          </div>
        </div>
      </div>
    </div>
  );
};

function renderYardCard(yard: YardCalculated, onSelectYard: (yard: YardCalculated) => void, isExpanded = false) {
  const occ = yard.occupancyPct;
  const isCritical = occ >= 92;
  const isAlert = occ >= 85 && occ < 92;
  const isWarning = occ >= 75 && occ < 85;

  const borderColor = isCritical
    ? 'border-rose-500/70 bg-rose-950/20'
    : isAlert
    ? 'border-orange-500/70 bg-orange-950/20'
    : isWarning
    ? 'border-amber-500/50 bg-amber-950/15'
    : 'border-slate-800 bg-slate-900/80 hover:border-slate-700';

  const barColor = isCritical
    ? 'bg-rose-500'
    : isAlert
    ? 'bg-orange-500'
    : isWarning
    ? 'bg-amber-400'
    : 'bg-emerald-500';

  return (
    <div
      key={yard.id}
      onClick={() => onSelectYard(yard)}
      className={`p-3 rounded-lg border ${borderColor} cursor-pointer transition-all hover:scale-[1.01] flex flex-col justify-between`}
    >
      <div>
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="font-bold text-slate-200">{yard.id}</span>
          <span className="text-[10px] text-slate-400 font-mono uppercase">{yard.zone === 'CUBIERTA' ? 'Techada' : 'Abierta'}</span>
        </div>
        <div className="text-[11px] text-slate-400 truncate mb-1.5" title={yard.name}>
          {yard.name}
        </div>
        <div className="text-lg font-bold font-mono text-white mb-1 tabular-nums">
          {occ.toFixed(0)}%
        </div>
        <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden mb-2">
          <div className={`h-full ${barColor}`} style={{ width: `${Math.min(100, occ)}%` }} />
        </div>
      </div>

      <div className="text-[10px] font-mono text-slate-400 border-t border-slate-800/80 pt-1.5 flex justify-between">
        <span>{yard.areaTotalM2.toLocaleString('es-CO')} m²</span>
        <span className="text-emerald-400 font-semibold">{yard.availableM2.toLocaleString('es-CO')} libre</span>
      </div>
      {isExpanded && (
        <div className="mt-1 text-[10px] text-slate-400 font-mono flex justify-between border-t border-slate-800/40 pt-1">
          <span>Part. en {yard.terminal}: <strong>{yard.weightInTerminalPct.toFixed(2)}%</strong></span>
          <span>Contrib: <strong>{yard.weightedContributionToTerminalPct.toFixed(2)}%</strong></span>
        </div>
      )}
    </div>
  );
}
