import React, { useState } from 'react';
import {
  ShieldAlert,
  AlertTriangle,
  Info,
  CheckCircle2,
  Clock,
  ArrowRight,
  Sliders,
  Sparkles,
  FileSpreadsheet,
  HelpCircle,
  ExternalLink,
} from 'lucide-react';
import { CapacityAlert, YardCalculated, SheetValidationAlert } from '../types/occupancy';

interface AlertsPanelProps {
  alerts: CapacityAlert[];
  validationAlerts?: SheetValidationAlert[];
  allYards: YardCalculated[];
  onSelectYard: (yard: YardCalculated) => void;
  onApplyScenario: (scenario: 'normal' | 'peak' | 'critical_bitco' | 'low' | 'reset') => void;
  onOpenGoogleSheets?: () => void;
}

export const AlertsPanel: React.FC<AlertsPanelProps> = ({
  alerts,
  validationAlerts = [],
  allYards,
  onSelectYard,
  onApplyScenario,
  onOpenGoogleSheets,
}) => {
  const [filterType, setFilterType] = useState<'all' | 'capacity' | 'sheets'>('all');

  const critical = alerts.filter((a) => a.severity === 'CRITICAL');
  const alertRisk = alerts.filter((a) => a.severity === 'ALERT');
  const warnings = alerts.filter((a) => a.severity === 'WARNING');

  const codeMismatches = validationAlerts.filter((a) => a.type === 'CODE_MISMATCH');
  const nonNumerics = validationAlerts.filter((a) => a.type === 'NON_NUMERIC_VALUE');

  const findYard = (yardId: string) => allYards.find((y) => y.id === yardId);

  const totalAlertsCount = alerts.length + validationAlerts.length;

  return (
    <div className="space-y-6">
      {/* Header and Summary */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-rose-400" />
              Centro Integral de Alertas y Validaciones en Tiempo Real
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Monitoreo continuo de saturación portuaria y validación de consistencia con Google Sheets
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onApplyScenario('normal')}
              className="px-3 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 transition-colors"
            >
              Simular Carga Nominal
            </button>
            <button
              onClick={() => onApplyScenario('critical_bitco')}
              className="px-3 py-1.5 text-xs font-semibold bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 rounded-lg border border-rose-500/40 transition-colors"
            >
              Simular Alerta Crítica
            </button>
          </div>
        </div>

        {/* Severity & Validation Metrics Strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-4 pt-4 border-t border-slate-800 text-xs font-mono">
          <div className="bg-rose-950/20 border border-rose-500/30 p-3 rounded-lg flex items-center justify-between">
            <div>
              <div className="text-[10px] text-rose-400 font-bold uppercase">Saturación Crítica (&gt;92%)</div>
              <div className="text-rose-200 text-sm sm:text-base font-bold">{critical.length} Patios</div>
            </div>
            <div className="text-xl sm:text-2xl font-bold text-rose-400">{critical.length}</div>
          </div>

          <div className="bg-orange-950/20 border border-orange-500/30 p-3 rounded-lg flex items-center justify-between">
            <div>
              <div className="text-[10px] text-orange-400 font-bold uppercase">Riesgo Inminente (85%-92%)</div>
              <div className="text-orange-200 text-sm sm:text-base font-bold">{alertRisk.length} Patios</div>
            </div>
            <div className="text-xl sm:text-2xl font-bold text-orange-400">{alertRisk.length}</div>
          </div>

          <div className="bg-amber-950/20 border border-amber-500/30 p-3 rounded-lg flex items-center justify-between">
            <div>
              <div className="text-[10px] text-amber-400 font-bold uppercase">Preventivo (75%-85%)</div>
              <div className="text-amber-200 text-sm sm:text-base font-bold">{warnings.length} Patios</div>
            </div>
            <div className="text-xl sm:text-2xl font-bold text-amber-400">{warnings.length}</div>
          </div>

          <div className="bg-emerald-950/20 border border-emerald-500/30 p-3 rounded-lg flex items-center justify-between">
            <div>
              <div className="text-[10px] text-emerald-400 font-bold uppercase">Validación Google Sheets</div>
              <div className="text-emerald-200 text-sm sm:text-base font-bold">
                {validationAlerts.length} Inconsistencias
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-bold text-emerald-400">{validationAlerts.length}</div>
          </div>
        </div>

        {/* Tab filters */}
        <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-800 text-xs">
          <span className="text-slate-400 font-medium">Filtrar alertas:</span>
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 font-mono">
            <button
              onClick={() => setFilterType('all')}
              className={`px-3 py-1 rounded transition-colors ${
                filterType === 'all' ? 'bg-sky-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Todas ({totalAlertsCount})
            </button>
            <button
              onClick={() => setFilterType('capacity')}
              className={`px-3 py-1 rounded transition-colors ${
                filterType === 'capacity' ? 'bg-sky-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Capacidad Portuaria ({alerts.length})
            </button>
            <button
              onClick={() => setFilterType('sheets')}
              className={`px-3 py-1 rounded transition-colors ${
                filterType === 'sheets' ? 'bg-emerald-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Google Sheets ({validationAlerts.length})
            </button>
          </div>
        </div>
      </div>

      {/* SECTION 1: Google Sheets Validation Alerts (If visible and active) */}
      {(filterType === 'all' || filterType === 'sheets') && validationAlerts.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-amber-400 flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>Inconsistencias Detectadas en Google Sheets ({validationAlerts.length})</span>
            </h3>
            {onOpenGoogleSheets && (
              <button
                onClick={onOpenGoogleSheets}
                className="text-xs text-slate-400 hover:text-emerald-400 font-mono flex items-center gap-1 transition-colors"
              >
                <span>Gestionar Conexión</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            )}
          </div>

          <div className="space-y-3">
            {validationAlerts.map((valAlert) => {
              const isMismatch = valAlert.type === 'CODE_MISMATCH';
              return (
                <div
                  key={valAlert.id}
                  className={`border rounded-xl p-4 transition-all shadow-sm ${
                    isMismatch
                      ? 'border-amber-500/50 bg-amber-950/15'
                      : 'border-rose-500/50 bg-rose-950/15'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`text-[10px] font-mono px-2 py-0.5 rounded border font-bold ${
                            isMismatch
                              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                              : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                          }`}
                        >
                          {isMismatch ? 'CÓDIGO NO COINCIDE CON MAESTRO' : 'VALOR NO NUMÉRICO EN %'}
                        </span>
                        <span className="font-bold text-white text-xs font-mono">
                          Hoja: "{valAlert.sheetName}"
                        </span>
                        {valAlert.rowNumber && (
                          <span className="text-xs font-mono text-slate-400">
                            Fila {valAlert.rowNumber}
                          </span>
                        )}
                        {valAlert.colName && (
                          <span className="text-xs font-mono text-slate-400">
                            Col {valAlert.colName}
                          </span>
                        )}
                        {valAlert.date && (
                          <span className="text-xs font-mono text-emerald-400">
                            Fecha: {valAlert.date}
                          </span>
                        )}
                        <span className="text-[11px] text-slate-500 flex items-center gap-1 font-mono">
                          <Clock className="w-3 h-3" />
                          {valAlert.timestamp}
                        </span>
                      </div>

                      <p className="text-xs text-slate-200 font-medium">
                        {valAlert.message}
                      </p>

                      <div className="text-xs text-slate-400 bg-slate-950/80 p-2.5 rounded-lg border border-slate-800/80 font-sans">
                        <strong className="text-amber-400 font-mono">Acción requerida:</strong>{' '}
                        {valAlert.recommendation}
                      </div>
                    </div>

                    {onOpenGoogleSheets && (
                      <div className="shrink-0 pt-2 sm:pt-0">
                        <button
                          onClick={onOpenGoogleSheets}
                          className="px-3 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-emerald-400 hover:text-emerald-300 rounded-lg border border-slate-700 transition-colors flex items-center gap-1.5 whitespace-nowrap"
                        >
                          <span>Ver en Hoja</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SECTION 2: Capacity Alerts Feed */}
      {(filterType === 'all' || filterType === 'capacity') && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-slate-400">
              Alertas de Ocupación y Capacidad Portuaria ({alerts.length})
            </h3>
          </div>

          {alerts.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center">
              <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
              <h3 className="text-sm font-semibold text-white">Todos los patios operan en condiciones óptimas</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                Ningún patio o bodega supera el umbral del 75% de ocupación. La capacidad libre en ambos terminales (SPRB y BITCO) garantiza fluidez en las operaciones de muelle.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {alerts.map((alert) => {
                const yard = findYard(alert.yardId);
                const isCritical = alert.severity === 'CRITICAL';
                const isAlert = alert.severity === 'ALERT';

                const cardBorder = isCritical
                  ? 'border-rose-500/50 bg-rose-950/10'
                  : isAlert
                  ? 'border-orange-500/50 bg-orange-950/10'
                  : 'border-amber-500/40 bg-amber-950/10';

                const badgeBg = isCritical
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                  : isAlert
                  ? 'bg-orange-500/20 text-orange-300 border-orange-500/40'
                  : 'bg-amber-500/20 text-amber-300 border-amber-500/40';

                return (
                  <div
                    key={alert.id}
                    className={`border rounded-xl p-4 transition-all ${cardBorder} shadow-sm`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                      <div className="space-y-1.5 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-[10px] font-mono px-2 py-0.5 rounded border font-bold ${badgeBg}`}>
                            {alert.severity === 'CRITICAL' ? 'CRÍTICO' : alert.severity === 'ALERT' ? 'RIESGO' : 'PREVENTIVO'}
                          </span>
                          <span className="font-bold text-white text-sm">{alert.yardName}</span>
                          <span className="text-xs font-mono text-slate-400">
                            ({alert.terminal} · {alert.zone})
                          </span>
                          <span className="text-[11px] text-slate-500 flex items-center gap-1 font-mono">
                            <Clock className="w-3 h-3" />
                            {alert.timestamp}
                          </span>
                        </div>

                        <p className="text-xs text-slate-200 font-medium">
                          {alert.message}
                        </p>

                        <div className="text-xs text-slate-400 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80 font-sans">
                          <strong className="text-sky-400 font-mono">Acción Operativa Recomendada:</strong> {alert.recommendation}
                        </div>
                      </div>

                      {/* Right: Metrics & Jump Button */}
                      <div className="flex sm:flex-col items-center sm:items-end justify-between gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800">
                        <div className="text-right font-mono">
                          <div className="text-lg font-bold text-white tabular-nums">
                            {alert.occupancyPct.toFixed(1)}%
                          </div>
                          <div className="text-[11px] text-slate-400">
                            Libre: <strong className="text-emerald-400">{alert.availableM2.toLocaleString('es-CO')} m²</strong>
                          </div>
                        </div>

                        {yard && (
                          <button
                            onClick={() => onSelectYard(yard)}
                            className="px-3 py-1 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-sky-400 hover:text-sky-300 rounded-lg border border-slate-700 transition-colors flex items-center gap-1"
                          >
                            Gestionar <ArrowRight className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
