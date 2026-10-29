import React, { useState } from 'react';
import {
  Ship,
  Warehouse,
  ArrowUpDown,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Info,
  Maximize2,
  Sliders,
} from 'lucide-react';
import { TerminalMetrics, YardCalculated, TerminalId, ZoneType } from '../types/occupancy';

interface TerminalViewProps {
  metrics: TerminalMetrics;
  onSelectTerminal: (term: TerminalId) => void;
  onSelectYard: (yard: YardCalculated) => void;
  onQuickUpdateOccupancy: (yardId: string, newOccupiedM2: number) => void;
}

export const TerminalView: React.FC<TerminalViewProps> = ({
  metrics,
  onSelectTerminal,
  onSelectYard,
  onQuickUpdateOccupancy,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [zoneFilter, setZoneFilter] = useState<'ALL' | ZoneType>('ALL');
  const [editingYardId, setEditingYardId] = useState<string | null>(null);

  const filteredYards = metrics.yards.filter((y) => {
    const matchesSearch =
      y.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      y.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (y.notes && y.notes.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesZone = zoneFilter === 'ALL' || y.zone === zoneFilter;
    return matchesSearch && matchesZone;
  });

  const getStatusBadge = (status: 'OPTIMAL' | 'WARNING' | 'ALERT' | 'CRITICAL') => {
    switch (status) {
      case 'CRITICAL':
        return { bg: 'bg-rose-500/15 text-rose-400 border-rose-500/30', label: 'Crítico (>92%)' };
      case 'ALERT':
        return { bg: 'bg-orange-500/15 text-orange-400 border-orange-500/30', label: 'Riesgo (85-92%)' };
      case 'WARNING':
        return { bg: 'bg-amber-500/15 text-amber-400 border-amber-500/30', label: 'Alerta (75-85%)' };
      default:
        return { bg: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30', label: 'Normal (<75%)' };
    }
  };

  return (
    <div className="space-y-6">
      {/* Terminal Switcher & Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-slate-900 border border-slate-800 rounded-xl p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-sky-600/20 border border-sky-500/30 flex items-center justify-center text-sky-400">
            {metrics.terminal === 'SPRB' ? <Ship className="w-5 h-5" /> : <Warehouse className="w-5 h-5" />}
          </div>
          <div>
            <h2 className="text-base font-bold text-white">{metrics.name}</h2>
            <div className="text-xs text-slate-400 flex items-center gap-2">
              <span>Terminal IP: <strong className="text-slate-200">{metrics.terminal}</strong></span>
              <span>·</span>
              <span>Participación en el puerto: <strong className="text-sky-400">{metrics.weightInGlobalPct.toFixed(2)}%</strong> (de 53,048 m²)</span>
            </div>
          </div>
        </div>

        {/* Terminal Toggle Buttons */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs font-semibold">
          <button
            onClick={() => onSelectTerminal('SPRB')}
            className={`px-3.5 py-1.5 rounded-md transition-colors ${
              metrics.terminal === 'SPRB'
                ? 'bg-sky-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            SPRB (24,948 m²)
          </button>
          <button
            onClick={() => onSelectTerminal('BITCO')}
            className={`px-3.5 py-1.5 rounded-md transition-colors ${
              metrics.terminal === 'BITCO'
                ? 'bg-sky-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            BITCO (28,100 m²)
          </button>
        </div>
      </div>

      {/* Terminal KPI Cards & Zone Weighting Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Terminal Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col justify-between shadow-sm">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <span className="font-semibold uppercase tracking-wider">Capacidad Total {metrics.terminal}</span>
              <span className="font-mono text-slate-400">{metrics.areaTotalM2.toLocaleString('es-CO')} m²</span>
            </div>
            <div className="flex items-baseline gap-2 mb-1">
              <span className="text-3xl font-bold font-mono text-white tabular-nums">
                {metrics.weightedOccupancyPct.toFixed(1)}%
              </span>
              <span className="text-xs text-slate-400">ocupación ponderada real</span>
            </div>
            <div className="w-full bg-slate-950 rounded-full h-2 mb-3 overflow-hidden border border-slate-800">
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
          </div>
          <div className="pt-2 border-t border-slate-800 text-xs font-mono grid grid-cols-2 gap-2 text-slate-400">
            <div>
              <div className="text-[10px] uppercase text-slate-500">Ocupada</div>
              <div className="text-slate-200 font-semibold">{metrics.occupiedM2.toLocaleString('es-CO')} m²</div>
            </div>
            <div className="text-right">
              <div className="text-[10px] uppercase text-slate-500">Disponible</div>
              <div className="text-emerald-400 font-semibold">{metrics.availableM2.toLocaleString('es-CO')} m²</div>
            </div>
          </div>
        </div>

        {/* Zona Cubierta in this terminal */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col justify-between shadow-sm">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <span className="font-semibold uppercase tracking-wider text-amber-400">Zona Cubierta (Bodegas)</span>
              <span className="font-mono text-slate-400">
                {metrics.cubierta.areaTotalM2.toLocaleString('es-CO')} m² ({metrics.cubierta.weightInTerminalPct.toFixed(1)}% de {metrics.terminal})
              </span>
            </div>
            <div className="flex items-baseline gap-2 mb-1">
              <span className="text-2xl font-bold font-mono text-white tabular-nums">
                {metrics.cubierta.weightedOccupancyPct.toFixed(1)}%
              </span>
              <span className="text-xs text-slate-400">ocupación de zona</span>
            </div>
            <div className="w-full bg-slate-950 rounded-full h-2 mb-3 overflow-hidden border border-slate-800">
              <div
                className="h-full bg-amber-500 transition-all duration-500"
                style={{ width: `${Math.min(100, metrics.cubierta.weightedOccupancyPct)}%` }}
              />
            </div>
          </div>
          <div className="pt-2 border-t border-slate-800 text-xs font-mono grid grid-cols-2 gap-2 text-slate-400">
            <div>
              <div className="text-[10px] uppercase text-slate-500">Ocupada</div>
              <div className="text-slate-200 font-semibold">{metrics.cubierta.occupiedM2.toLocaleString('es-CO')} m²</div>
            </div>
            <div className="text-right">
              <div className="text-[10px] uppercase text-slate-500">Disponible</div>
              <div className="text-emerald-400 font-semibold">{metrics.cubierta.availableM2.toLocaleString('es-CO')} m²</div>
            </div>
          </div>
        </div>

        {/* Zona Descubierta in this terminal */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col justify-between shadow-sm">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <span className="font-semibold uppercase tracking-wider text-teal-400">Zona Descubierta (Patios)</span>
              <span className="font-mono text-slate-400">
                {metrics.descubierta.areaTotalM2.toLocaleString('es-CO')} m² ({metrics.descubierta.weightInTerminalPct.toFixed(1)}% de {metrics.terminal})
              </span>
            </div>
            <div className="flex items-baseline gap-2 mb-1">
              <span className="text-2xl font-bold font-mono text-white tabular-nums">
                {metrics.descubierta.weightedOccupancyPct.toFixed(1)}%
              </span>
              <span className="text-xs text-slate-400">ocupación de zona</span>
            </div>
            <div className="w-full bg-slate-950 rounded-full h-2 mb-3 overflow-hidden border border-slate-800">
              <div
                className="h-full bg-teal-500 transition-all duration-500"
                style={{ width: `${Math.min(100, metrics.descubierta.weightedOccupancyPct)}%` }}
              />
            </div>
          </div>
          <div className="pt-2 border-t border-slate-800 text-xs font-mono grid grid-cols-2 gap-2 text-slate-400">
            <div>
              <div className="text-[10px] uppercase text-slate-500">Ocupada</div>
              <div className="text-slate-200 font-semibold">{metrics.descubierta.occupiedM2.toLocaleString('es-CO')} m²</div>
            </div>
            <div className="text-right">
              <div className="text-[10px] uppercase text-slate-500">Disponible</div>
              <div className="text-emerald-400 font-semibold">{metrics.descubierta.availableM2.toLocaleString('es-CO')} m²</div>
            </div>
          </div>
        </div>
      </div>

      {/* Yard Table & Filtering */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
          <div>
            <h3 className="text-sm font-semibold text-white">
              Patios y Bodegas en {metrics.terminal} ({filteredYards.length} unidades)
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Participación individual de área, contribución ponderada a {metrics.terminal} y al índice global portuario
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar patio o código..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-slate-950 border border-slate-800 text-slate-200 pl-8 pr-3 py-1.5 rounded-lg text-xs focus:outline-none focus:border-sky-500 w-44 sm:w-56"
              />
            </div>

            {/* Zone Filter */}
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
              <button
                onClick={() => setZoneFilter('ALL')}
                className={`px-2.5 py-1 rounded transition-colors ${
                  zoneFilter === 'ALL' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Todas
              </button>
              <button
                onClick={() => setZoneFilter('CUBIERTA')}
                className={`px-2.5 py-1 rounded transition-colors ${
                  zoneFilter === 'CUBIERTA' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Cubierta
              </button>
              <button
                onClick={() => setZoneFilter('DESCUBIERTA')}
                className={`px-2.5 py-1 rounded transition-colors ${
                  zoneFilter === 'DESCUBIERTA' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Descubierta
              </button>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800">
              <tr>
                <th className="py-2.5 px-3 font-semibold">Código</th>
                <th className="py-2.5 px-3 font-semibold font-sans">Nombre / Uso</th>
                <th className="py-2.5 px-3 font-semibold">Zona</th>
                <th className="py-2.5 px-3 font-semibold text-right">Área Total</th>
                <th className="py-2.5 px-3 font-semibold text-right">Ocupada</th>
                <th className="py-2.5 px-3 font-semibold text-right">Disponible</th>
                <th className="py-2.5 px-3 font-semibold text-right">% Ocupación</th>
                <th className="py-2.5 px-3 font-semibold text-right">Part. en {metrics.terminal}</th>
                <th className="py-2.5 px-3 font-semibold text-right">Contrib. Ponderada</th>
                <th className="py-2.5 px-3 font-semibold text-center font-sans">Estado</th>
                <th className="py-2.5 px-3 font-semibold text-center font-sans">Ajuste Rápido</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredYards.map((yard) => {
                const status = getStatusBadge(yard.status);
                const isEditing = editingYardId === yard.id;

                return (
                  <tr
                    key={yard.id}
                    className="hover:bg-slate-800/40 transition-colors cursor-pointer group"
                  >
                    <td
                      onClick={() => onSelectYard(yard)}
                      className="py-2.5 px-3 font-bold text-sky-400"
                    >
                      {yard.id}
                    </td>
                    <td
                      onClick={() => onSelectYard(yard)}
                      className="py-2.5 px-3 font-sans text-slate-200"
                    >
                      <div className="font-medium">{yard.name}</div>
                      {yard.notes && (
                        <div className="text-[11px] text-slate-500 truncate max-w-xs">{yard.notes}</div>
                      )}
                    </td>
                    <td
                      onClick={() => onSelectYard(yard)}
                      className="py-2.5 px-3"
                    >
                      <span
                        className={`text-[11px] px-2 py-0.5 rounded font-sans font-medium ${
                          yard.zone === 'CUBIERTA'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            : 'bg-teal-500/10 text-teal-400 border border-teal-500/20'
                        }`}
                      >
                        {yard.zone === 'CUBIERTA' ? 'Cubierta' : 'Descubierta'}
                      </span>
                    </td>
                    <td
                      onClick={() => onSelectYard(yard)}
                      className="py-2.5 px-3 text-right text-slate-300 font-semibold"
                    >
                      {yard.areaTotalM2.toLocaleString('es-CO')} m²
                    </td>
                    <td
                      onClick={() => onSelectYard(yard)}
                      className="py-2.5 px-3 text-right text-slate-200 font-semibold"
                    >
                      {yard.currentOccupiedM2.toLocaleString('es-CO')} m²
                    </td>
                    <td
                      onClick={() => onSelectYard(yard)}
                      className="py-2.5 px-3 text-right text-emerald-400 font-semibold"
                    >
                      {yard.availableM2.toLocaleString('es-CO')} m²
                    </td>
                    <td
                      onClick={() => onSelectYard(yard)}
                      className="py-2.5 px-3 text-right"
                    >
                      <span
                        className={`font-bold ${
                          yard.occupancyPct >= 92
                            ? 'text-rose-400'
                            : yard.occupancyPct >= 85
                            ? 'text-orange-400'
                            : yard.occupancyPct >= 75
                            ? 'text-amber-400'
                            : 'text-slate-200'
                        }`}
                      >
                        {yard.occupancyPct.toFixed(1)}%
                      </span>
                    </td>
                    <td
                      onClick={() => onSelectYard(yard)}
                      className="py-2.5 px-3 text-right text-slate-400"
                    >
                      {yard.weightInTerminalPct.toFixed(2)}%
                    </td>
                    <td
                      onClick={() => onSelectYard(yard)}
                      className="py-2.5 px-3 text-right text-sky-400 font-semibold"
                    >
                      {yard.weightedContributionToTerminalPct.toFixed(2)}%
                    </td>
                    <td
                      onClick={() => onSelectYard(yard)}
                      className="py-2.5 px-3 text-center"
                    >
                      <span className={`inline-block text-[10px] px-2 py-0.5 rounded border font-sans font-medium ${status.bg}`}>
                        {status.label}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <div className="flex items-center justify-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => setEditingYardId(isEditing ? null : yard.id)}
                          title="Ajustar carga del patio"
                          className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                        >
                          <Sliders className="w-3.5 h-3.5 text-sky-400" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Quick Slider Drawer if editing */}
        {editingYardId && (
          <div className="mt-4 p-4 bg-slate-950 border border-sky-500/40 rounded-xl">
            {(() => {
              const y = metrics.yards.find((item) => item.id === editingYardId);
              if (!y) return null;
              return (
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-sky-400 font-mono text-sm">{y.id}</span>
                    <span className="text-xs text-slate-300 font-medium">{y.name}</span>
                    <span className="text-xs text-slate-500 font-mono">
                      (Capacidad Total: {y.areaTotalM2} m²)
                    </span>
                  </div>

                  <div className="flex items-center gap-4 flex-1 max-w-md">
                    <input
                      type="range"
                      min={0}
                      max={y.areaTotalM2}
                      step={10}
                      value={y.currentOccupiedM2}
                      onChange={(e) => onQuickUpdateOccupancy(y.id, Number(e.target.value))}
                      className="w-full accent-sky-500 cursor-pointer"
                    />
                    <div className="text-right shrink-0 font-mono text-xs">
                      <span className="text-white font-bold">{y.currentOccupiedM2} m²</span>
                      <span className="text-slate-400 ml-1.5">({y.occupancyPct.toFixed(0)}%)</span>
                    </div>
                  </div>

                  <button
                    onClick={() => setEditingYardId(null)}
                    className="px-3 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-md transition-colors"
                  >
                    Cerrar
                  </button>
                </div>
              );
            })()}
          </div>
        )}

        <div className="mt-4 pt-3 border-t border-slate-800 text-xs text-slate-400 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-sky-400 shrink-0" />
            <span>
              <strong>Fórmula de Contribución Ponderada:</strong>{' '}
              <code className="text-slate-300 font-mono text-[11px]">
                Contribución = (m² Ocupados del Patio / m² Totales de {metrics.terminal}) × 100
              </code>
            </span>
          </div>
          <span className="text-slate-500 font-mono text-[11px]">
            Suma de contribuciones = {metrics.weightedOccupancyPct.toFixed(2)}%
          </span>
        </div>
      </div>
    </div>
  );
};
