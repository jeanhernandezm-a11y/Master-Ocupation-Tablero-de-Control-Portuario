import React from 'react';
import { Calendar, SlidersHorizontal, RefreshCw, Sparkles } from 'lucide-react';

export type DateFilterPreset = 'today' | '7d' | '14d' | '30d' | 'custom';

interface DateFilterBarProps {
  preset: DateFilterPreset;
  setPreset: (preset: DateFilterPreset) => void;
  startDate: string;
  setStartDate: (d: string) => void;
  endDate: string;
  setEndDate: (d: string) => void;
  onApplyScenario: (scenario: 'normal' | 'peak' | 'critical_bitco' | 'low' | 'reset') => void;
}

export const DateFilterBar: React.FC<DateFilterBarProps> = ({
  preset,
  setPreset,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  onApplyScenario,
}) => {
  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 mb-6 shadow-sm">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        {/* Date Filter Presets */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 mr-1">
            <Calendar className="w-3.5 h-3.5 text-sky-400" />
            <span>Período:</span>
          </div>

          <div className="flex items-center gap-1 p-0.5 bg-slate-950 rounded-lg border border-slate-800 text-xs">
            <button
              onClick={() => setPreset('today')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                preset === 'today' ? 'bg-sky-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Hoy
            </button>
            <button
              onClick={() => setPreset('7d')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                preset === '7d' ? 'bg-sky-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              7 Días
            </button>
            <button
              onClick={() => setPreset('14d')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                preset === '14d' ? 'bg-sky-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              14 Días
            </button>
            <button
              onClick={() => setPreset('30d')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                preset === '30d' ? 'bg-sky-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              30 Días
            </button>
            <button
              onClick={() => setPreset('custom')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                preset === 'custom' ? 'bg-sky-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Personalizado
            </button>
          </div>

          {/* Custom Date Pickers */}
          {preset === 'custom' && (
            <div className="flex items-center gap-2 mt-2 sm:mt-0 text-xs font-mono">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-slate-950 border border-slate-700 text-slate-200 px-2.5 py-1.5 rounded-lg focus:outline-none focus:border-sky-500"
              />
              <span className="text-slate-500">hasta</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-slate-950 border border-slate-700 text-slate-200 px-2.5 py-1.5 rounded-lg focus:outline-none focus:border-sky-500"
              />
            </div>
          )}
        </div>

        {/* Quick Scenario & Simulation Bar */}
        <div className="flex flex-wrap items-center gap-2 border-t lg:border-t-0 pt-3 lg:pt-0 border-slate-800">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 mr-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Simular Carga:</span>
          </div>

          <div className="flex items-center gap-1 bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-xs">
            <button
              onClick={() => onApplyScenario('normal')}
              title="Cargar escenario nominal portuario (68% promedio)"
              className="px-2.5 py-1 text-slate-300 hover:text-white hover:bg-slate-800 rounded transition-colors"
            >
              Nominal
            </button>
            <button
              onClick={() => onApplyScenario('peak')}
              title="Simular pico de temporada alta de contenedores y granel (88%)"
              className="px-2.5 py-1 text-amber-300 hover:text-amber-200 hover:bg-slate-800 rounded transition-colors"
            >
              Pico Alta
            </button>
            <button
              onClick={() => onApplyScenario('critical_bitco')}
              title="Simular saturación crítica en terminal BITCO (95%)"
              className="px-2.5 py-1 text-rose-300 hover:text-rose-200 hover:bg-slate-800 rounded transition-colors"
            >
              Saturación BITCO
            </button>
            <button
              onClick={() => onApplyScenario('low')}
              title="Simular baja ocupación post-zarpe de buques (40%)"
              className="px-2.5 py-1 text-emerald-300 hover:text-emerald-200 hover:bg-slate-800 rounded transition-colors"
            >
              Baja
            </button>
            <button
              onClick={() => onApplyScenario('reset')}
              title="Restaurar a datos de fábrica exactos"
              className="p-1 text-slate-400 hover:text-sky-400 hover:bg-slate-800 rounded transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
