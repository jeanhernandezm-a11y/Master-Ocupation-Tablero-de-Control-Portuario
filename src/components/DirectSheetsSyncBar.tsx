import React from 'react';
import {
  FileSpreadsheet,
  RefreshCw,
  ExternalLink,
  AlertTriangle,
  CheckCircle2,
  Settings2,
  Calendar,
  Layers,
} from 'lucide-react';
import { SheetValidationAlert, DirectSheetSyncConfig } from '../types/occupancy';

interface DirectSheetsSyncBarProps {
  config: DirectSheetSyncConfig;
  isSyncing: boolean;
  validationAlerts: SheetValidationAlert[];
  datesCount: number;
  onSyncNow: () => void;
  onOpenConfig: () => void;
  onNavigateToAlerts: () => void;
}

export const DirectSheetsSyncBar: React.FC<DirectSheetsSyncBarProps> = ({
  config,
  isSyncing,
  validationAlerts,
  datesCount,
  onSyncNow,
  onOpenConfig,
  onNavigateToAlerts,
}) => {
  const isConnected = !!config.spreadsheetId || config.totalRecordsSynced > 0;
  const mismatchCount = validationAlerts.filter((a) => a.type === 'CODE_MISMATCH').length;
  const nonNumericCount = validationAlerts.filter((a) => a.type === 'NON_NUMERIC_VALUE').length;
  const totalValidationIssues = validationAlerts.length;

  return (
    <div className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 sm:px-4 shadow-sm mb-4">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        {/* Left: Connection Status & Workbook Link */}
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
              isConnected
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
            }`}
          >
            <FileSpreadsheet className="w-5 h-5" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-white tracking-tight flex items-center gap-1.5">
                <span>Conexión Directa Google Sheets 2026</span>
                {isConnected && (
                  <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-mono font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1 animate-pulse" />
                    En Línea
                  </span>
                )}
              </span>

              {config.lastSyncedAt && (
                <span className="text-[11px] font-mono text-slate-400 hidden sm:inline">
                  · Última sync: {new Date(config.lastSyncedAt).toLocaleTimeString('es-CO')}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-400 font-mono truncate mt-0.5">
              {config.spreadsheetUrl ? (
                <a
                  href={config.spreadsheetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-emerald-400 truncate flex items-center gap-1 text-[11px] transition-colors"
                  title="Abrir hoja de cálculo vinculada"
                >
                  <span className="truncate">Hoja: {config.spreadsheetId.slice(0, 18)}...</span>
                  <ExternalLink className="w-3 h-3 shrink-0" />
                </a>
              ) : (
                <span className="text-[11px] text-amber-400/90">
                  Matriz 2026 cargada (Hojas Enero-Diciembre, Fila 2 Fechas, Col A Patios)
                </span>
              )}

              {datesCount > 0 && (
                <span className="text-[11px] text-slate-400 hidden md:inline">
                  · <strong className="text-slate-200">{datesCount} fechas</strong> procesadas
                </span>
              )}

              {config.detectedSheets.length > 0 && (
                <span className="text-[11px] text-sky-400 hidden lg:inline">
                  · ({config.detectedSheets.length} hojas mensuales)
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Center / Right: Validation Badges & Actions */}
        <div className="flex items-center justify-between lg:justify-end gap-2 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-800">
          {/* Validation alerts pill if any */}
          {totalValidationIssues > 0 && (
            <button
              onClick={onNavigateToAlerts}
              className="px-2.5 py-1.5 rounded-lg bg-amber-500/15 border border-amber-500/40 text-amber-300 hover:bg-amber-500/25 transition-colors flex items-center gap-1.5 text-xs font-mono"
              title="Ver alertas de validación de Google Sheets"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>
                {totalValidationIssues} {totalValidationIssues === 1 ? 'Alerta' : 'Alertas'}
                {mismatchCount > 0 && ` (${mismatchCount} cód)`}
                {nonNumericCount > 0 && ` (${nonNumericCount} no num)`}
              </span>
            </button>
          )}

          <div className="flex items-center gap-2">
            <button
              onClick={onSyncNow}
              disabled={isSyncing}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm disabled:opacity-50"
              title="Sincronizar ahora desde Google Sheets"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Sincronizando...' : 'Sincronizar'}</span>
            </button>

            <button
              onClick={onOpenConfig}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors"
              title="Configurar URL / Opciones de Google Sheets"
            >
              <Settings2 className="w-3.5 h-3.5 text-slate-400" />
              <span className="hidden sm:inline">Configuración</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
