import React from 'react';
import { Ship, FileSpreadsheet } from 'lucide-react';
import { User } from 'firebase/auth';
import { TerminalId } from '../types/occupancy';

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  activeTerminal: TerminalId;
  setActiveTerminal: (term: TerminalId) => void;
  criticalAlertsCount: number;
  totalAlertsCount: number;
  weightedGlobalPct: number;
  googleUser: User | null;
  onOpenGoogleSheets: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  activeTerminal,
  setActiveTerminal,
  criticalAlertsCount,
  totalAlertsCount,
  weightedGlobalPct,
  googleUser,
  onOpenGoogleSheets,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-slate-900 border-b border-slate-800 text-slate-100 shadow-md">
      <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12">
        <div className="flex items-center justify-between h-16 gap-8">
          {/* Zone 1: Brand Wordmark */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-9 h-9 rounded-lg bg-sky-600 flex items-center justify-center text-white shadow-sm">
              <Ship className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <span className="text-base font-bold tracking-tight text-white whitespace-nowrap">
                Master Ocupation
              </span>
              <span className="text-[11px] text-slate-400 tracking-wide font-mono whitespace-nowrap">
                SPRB & BITCO · 53,048 m²
              </span>
            </div>
          </div>

          {/* Zone 2: Navigation Links / Segmented Tabs */}
          <nav className="hidden lg:flex items-center gap-1 bg-slate-950/60 p-1 rounded-lg border border-slate-800 text-xs font-medium">
            <button
              onClick={() => setActiveTab('consolidado')}
              className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap ${
                activeTab === 'consolidado'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Gran Consolidado
            </button>
            <button
              onClick={() => {
                setActiveTerminal('SPRB');
                setActiveTab('terminal');
              }}
              className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap ${
                activeTab === 'terminal' && activeTerminal === 'SPRB'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Terminal SPRB
            </button>
            <button
              onClick={() => {
                setActiveTerminal('BITCO');
                setActiveTab('terminal');
              }}
              className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap ${
                activeTab === 'terminal' && activeTerminal === 'BITCO'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Terminal BITCO
            </button>
            <button
              onClick={() => setActiveTab('maestro')}
              className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap ${
                activeTab === 'maestro'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Maestro Patios & Bodegas
            </button>
            <button
              onClick={() => setActiveTab('alertas')}
              className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'alertas'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>Alertas</span>
              {totalAlertsCount > 0 && (
                <span
                  className={`px-1.5 py-0.2 rounded text-[10px] font-mono font-bold ${
                    criticalAlertsCount > 0 ? 'bg-rose-500 text-white' : 'bg-amber-500 text-slate-950'
                  }`}
                >
                  {totalAlertsCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('reportes')}
              className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap ${
                activeTab === 'reportes'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Reportes & Exportar
            </button>
          </nav>

          {/* Zone 3: Primary Action / Quick Global Metric */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider">Ocupación Global</span>
              <span className="text-sm font-bold font-mono text-sky-400 tabular-nums">
                {weightedGlobalPct.toFixed(1)}%
              </span>
            </div>

            <button
              onClick={onOpenGoogleSheets}
              className="px-3 py-1.5 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 hover:text-white border border-slate-700 rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap shadow-sm"
              title="Sincronizar y gestionar hojas en Google Sheets"
            >
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              <span>Google Sheets</span>
              {googleUser && (
                <span className="hidden xl:inline text-[10px] text-slate-400 font-mono truncate max-w-[100px]">
                  ({googleUser.email?.split('@')[0]})
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('reportes')}
              className="px-3.5 py-1.5 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-500 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap shadow-sm"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-white" />
              <span>Reportes</span>
            </button>
          </div>
        </div>

        {/* Mobile secondary tab bar */}
        <div className="flex lg:hidden overflow-x-auto py-2 gap-1 border-t border-slate-800 text-xs no-scrollbar">
          <button
            onClick={() => setActiveTab('consolidado')}
            className={`px-2.5 py-1 rounded whitespace-nowrap ${
              activeTab === 'consolidado' ? 'bg-sky-600 text-white' : 'text-slate-400'
            }`}
          >
            Consolidado
          </button>
          <button
            onClick={() => {
              setActiveTerminal('SPRB');
              setActiveTab('terminal');
            }}
            className={`px-2.5 py-1 rounded whitespace-nowrap ${
              activeTab === 'terminal' && activeTerminal === 'SPRB' ? 'bg-sky-600 text-white' : 'text-slate-400'
            }`}
          >
            SPRB
          </button>
          <button
            onClick={() => {
              setActiveTerminal('BITCO');
              setActiveTab('terminal');
            }}
            className={`px-2.5 py-1 rounded whitespace-nowrap ${
              activeTab === 'terminal' && activeTerminal === 'BITCO' ? 'bg-sky-600 text-white' : 'text-slate-400'
            }`}
          >
            BITCO
          </button>
          <button
            onClick={() => setActiveTab('maestro')}
            className={`px-2.5 py-1 rounded whitespace-nowrap ${
              activeTab === 'maestro' ? 'bg-sky-600 text-white' : 'text-slate-400'
            }`}
          >
            Maestro
          </button>
          <button
            onClick={() => setActiveTab('alertas')}
            className={`px-2.5 py-1 rounded whitespace-nowrap ${
              activeTab === 'alertas' ? 'bg-sky-600 text-white' : 'text-slate-400'
            }`}
          >
            Alertas ({totalAlertsCount})
          </button>
          <button
            onClick={() => setActiveTab('reportes')}
            className={`px-2.5 py-1 rounded whitespace-nowrap ${
              activeTab === 'reportes' ? 'bg-sky-600 text-white' : 'text-slate-400'
            }`}
          >
            Reportes
          </button>
        </div>
      </div>
    </header>
  );
};
