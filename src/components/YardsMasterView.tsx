import React, { useState } from 'react';
import {
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  Sliders,
  Sparkles,
  RefreshCw,
  Warehouse,
  Ship,
  Layers,
  ArrowUpDown,
  CheckCircle2,
} from 'lucide-react';
import { YardCalculated, TerminalId, ZoneType } from '../types/occupancy';

interface YardsMasterViewProps {
  yards: YardCalculated[];
  onSelectYard: (yard: YardCalculated) => void;
  onAddNewYard: () => void;
  onDeleteYard: (id: string) => void;
  onApplyScenario: (scenario: 'normal' | 'peak' | 'critical_bitco' | 'low' | 'reset') => void;
  onQuickUpdateOccupancy: (yardId: string, newOccupiedM2: number) => void;
}

export const YardsMasterView: React.FC<YardsMasterViewProps> = ({
  yards,
  onSelectYard,
  onAddNewYard,
  onDeleteYard,
  onApplyScenario,
  onQuickUpdateOccupancy,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [terminalFilter, setTerminalFilter] = useState<'ALL' | TerminalId>('ALL');
  const [zoneFilter, setZoneFilter] = useState<'ALL' | ZoneType>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [sortField, setSortField] = useState<'id' | 'areaTotalM2' | 'occupancyPct' | 'weightInGlobalPct'>('areaTotalM2');
  const [sortAsc, setSortAsc] = useState<boolean>(false);
  const [sliderYardId, setSliderYardId] = useState<string | null>(null);

  // Filter & search
  const filtered = yards.filter((y) => {
    const matchesSearch =
      y.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      y.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (y.notes && y.notes.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesTerm = terminalFilter === 'ALL' || y.terminal === terminalFilter;
    const matchesZone = zoneFilter === 'ALL' || y.zone === zoneFilter;
    const matchesStatus = statusFilter === 'ALL' || y.status === statusFilter;

    return matchesSearch && matchesTerm && matchesZone && matchesStatus;
  });

  // Sort
  const sorted = [...filtered].sort((a, b) => {
    let diff = 0;
    if (sortField === 'id') {
      diff = a.id.localeCompare(b.id);
    } else {
      diff = a[sortField] - b[sortField];
    }
    return sortAsc ? diff : -diff;
  });

  const toggleSort = (field: 'id' | 'areaTotalM2' | 'occupancyPct' | 'weightInGlobalPct') => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

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

  const totalArea = yards.reduce((sum, y) => sum + y.areaTotalM2, 0);
  const totalOccupied = yards.reduce((sum, y) => sum + y.currentOccupiedM2, 0);

  return (
    <div className="space-y-6">
      {/* Top Banner & Fast Actions */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-base font-bold text-white">Maestro de Patios y Bodegas</span>
              <span className="text-xs text-slate-400 font-mono">({yards.length} unidades registradas)</span>
            </div>
            <p className="text-xs text-slate-400">
              Catálogo maestro con distribución de áreas nominales, ponderación individual en terminal y contribución al índice consolidado
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={onAddNewYard}
              className="px-3.5 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-500 rounded-lg shadow-sm transition-colors flex items-center gap-1.5 whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              <span>Nuevo Patio / Bodega</span>
            </button>
          </div>
        </div>

        {/* Quick KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-slate-800 text-xs font-mono">
          <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
            <span className="text-[10px] text-slate-500 uppercase">Total Capacidad</span>
            <div className="text-white font-bold text-sm">{totalArea.toLocaleString('es-CO')} m²</div>
          </div>
          <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
            <span className="text-[10px] text-slate-500 uppercase">Capacidad Ocupada</span>
            <div className="text-sky-400 font-bold text-sm">{totalOccupied.toLocaleString('es-CO')} m²</div>
          </div>
          <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
            <span className="text-[10px] text-slate-500 uppercase">Capacidad Libre</span>
            <div className="text-emerald-400 font-bold text-sm">{(totalArea - totalOccupied).toLocaleString('es-CO')} m²</div>
          </div>
          <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
            <span className="text-[10px] text-slate-500 uppercase">Patios en Alerta / Crítico</span>
            <div className="text-amber-400 font-bold text-sm">
              {yards.filter((y) => y.occupancyPct >= 75).length} de {yards.length}
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Controls */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por código, nombre o uso..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 text-slate-200 pl-9 pr-3 py-1.5 rounded-lg text-xs focus:outline-none focus:border-sky-500"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Terminal */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
            <button
              onClick={() => setTerminalFilter('ALL')}
              className={`px-2.5 py-1 rounded transition-colors ${
                terminalFilter === 'ALL' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Todo IP
            </button>
            <button
              onClick={() => setTerminalFilter('SPRB')}
              className={`px-2.5 py-1 rounded transition-colors ${
                terminalFilter === 'SPRB' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              SPRB
            </button>
            <button
              onClick={() => setTerminalFilter('BITCO')}
              className={`px-2.5 py-1 rounded transition-colors ${
                terminalFilter === 'BITCO' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              BITCO
            </button>
          </div>

          {/* Zone */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
            <button
              onClick={() => setZoneFilter('ALL')}
              className={`px-2.5 py-1 rounded transition-colors ${
                zoneFilter === 'ALL' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Toda Zona
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

          {/* Status */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-2.5 py-1 rounded transition-colors ${
                statusFilter === 'ALL' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setStatusFilter('CRITICAL')}
              className={`px-2.5 py-1 rounded transition-colors ${
                statusFilter === 'CRITICAL' ? 'bg-rose-600 text-white' : 'text-rose-400 hover:text-rose-200'
              }`}
            >
              Crítico
            </button>
            <button
              onClick={() => setStatusFilter('WARNING')}
              className={`px-2.5 py-1 rounded transition-colors ${
                statusFilter === 'WARNING' ? 'bg-amber-600 text-white' : 'text-amber-400 hover:text-amber-200'
              }`}
            >
              Alerta
            </button>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800">
              <tr>
                <th
                  onClick={() => toggleSort('id')}
                  className="py-2.5 px-3 font-semibold cursor-pointer hover:text-white"
                >
                  <div className="flex items-center gap-1">
                    <span>Código</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-500" />
                  </div>
                </th>
                <th className="py-2.5 px-3 font-semibold font-sans">Nombre / Uso</th>
                <th className="py-2.5 px-3 font-semibold">IP</th>
                <th className="py-2.5 px-3 font-semibold">Zona</th>
                <th
                  onClick={() => toggleSort('areaTotalM2')}
                  className="py-2.5 px-3 font-semibold text-right cursor-pointer hover:text-white"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Área Total</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-500" />
                  </div>
                </th>
                <th className="py-2.5 px-3 font-semibold text-right">Ocupada</th>
                <th className="py-2.5 px-3 font-semibold text-right">Disponible</th>
                <th
                  onClick={() => toggleSort('occupancyPct')}
                  className="py-2.5 px-3 font-semibold text-right cursor-pointer hover:text-white"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>% Ocupación</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-500" />
                  </div>
                </th>
                <th className="py-2.5 px-3 font-semibold text-right">Part. IP</th>
                <th
                  onClick={() => toggleSort('weightInGlobalPct')}
                  className="py-2.5 px-3 font-semibold text-right cursor-pointer hover:text-white"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Part. Global</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-500" />
                  </div>
                </th>
                <th className="py-2.5 px-3 font-semibold text-right">Contrib. Global</th>
                <th className="py-2.5 px-3 font-semibold text-center font-sans">Nivel</th>
                <th className="py-2.5 px-3 font-semibold text-center font-sans">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {sorted.map((yard) => {
                const status = getStatusBadge(yard.status);
                const isSliderOpen = sliderYardId === yard.id;

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
                      <span className="font-semibold text-slate-300">{yard.terminal}</span>
                    </td>
                    <td
                      onClick={() => onSelectYard(yard)}
                      className="py-2.5 px-3"
                    >
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded font-sans font-medium ${
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
                      className="py-2.5 px-3 text-right text-slate-400"
                    >
                      {yard.weightInGlobalPct.toFixed(2)}%
                    </td>
                    <td
                      onClick={() => onSelectYard(yard)}
                      className="py-2.5 px-3 text-right text-sky-400 font-semibold"
                    >
                      {yard.weightedContributionToGlobalPct.toFixed(2)}%
                    </td>
                    <td
                      onClick={() => onSelectYard(yard)}
                      className="py-2.5 px-3 text-center"
                    >
                      <span className={`inline-block text-[10px] px-2 py-0.5 rounded border font-sans font-medium ${status.bg}`}>
                        {status.label}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => setSliderYardId(isSliderOpen ? null : yard.id)}
                          title="Ajustar carga del patio"
                          className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-sky-400 transition-colors"
                        >
                          <Sliders className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onSelectYard(yard)}
                          title="Editar detalles del maestro"
                          className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onDeleteYard(yard.id)}
                          title="Eliminar patio del maestro"
                          className="p-1 rounded bg-slate-800 hover:bg-rose-950/60 text-slate-400 hover:text-rose-400 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Quick Slider Box if open */}
        {sliderYardId && (
          <div className="mt-4 p-4 bg-slate-950 border border-sky-500/40 rounded-xl">
            {(() => {
              const y = yards.find((item) => item.id === sliderYardId);
              if (!y) return null;
              return (
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-sky-400 font-mono text-sm">{y.id}</span>
                    <span className="text-xs text-slate-300 font-medium">{y.name}</span>
                    <span className="text-xs text-slate-500 font-mono">
                      (Capacidad Nominal: {y.areaTotalM2} m²)
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
                    onClick={() => setSliderYardId(null)}
                    className="px-3 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-md transition-colors"
                  >
                    Listo
                  </button>
                </div>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
};
