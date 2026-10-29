/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { User } from 'firebase/auth';
import { Header } from './components/Header';
import { DateFilterBar, DateFilterPreset } from './components/DateFilterBar';
import { DirectSheetsSyncBar } from './components/DirectSheetsSyncBar';
import { ConsolidatedDashboard } from './components/ConsolidatedDashboard';
import { TerminalView } from './components/TerminalView';
import { YardsMasterView } from './components/YardsMasterView';
import { AlertsPanel } from './components/AlertsPanel';
import { ReportsView } from './components/ReportsView';
import { YardEditModal } from './components/YardEditModal';
import { GoogleSheetsModal } from './components/GoogleSheetsModal';
import { initAuth } from './services/googleAuth';
import {
  syncFromGoogleSheetsDirect,
  generateDemo2026SheetData,
  extractSpreadsheetId,
} from './services/googleSheetsSync';
import { INITIAL_YARDS } from './data/initialYards';
import {
  YardItem,
  TerminalId,
  YardCalculated,
  DirectSheetSyncConfig,
  SheetValidationAlert,
  HistoricalRecord,
} from './types/occupancy';
import { computeMetrics, generateAlerts } from './utils/calculations';

export default function App() {
  // Load yards from localStorage or use INITIAL_YARDS
  const [yards, setYards] = useState<YardItem[]>(() => {
    try {
      const saved = localStorage.getItem('master_ocupacion_yards_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Could not read from localStorage, using initial data', e);
    }
    return INITIAL_YARDS;
  });

  // Save to localStorage on change
  useEffect(() => {
    try {
      localStorage.setItem('master_ocupacion_yards_v1', JSON.stringify(yards));
    } catch (e) {
      console.warn('Could not save to localStorage', e);
    }
  }, [yards]);

  // Active view states
  const [activeTab, setActiveTab] = useState<string>('consolidado');
  const [activeTerminal, setActiveTerminal] = useState<TerminalId>('SPRB');

  // Date filter state
  const [datePreset, setDatePreset] = useState<DateFilterPreset>('today');
  const [startDate, setStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });

  // Modal inspection & editing states
  const [selectedYard, setSelectedYard] = useState<YardItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isNewModal, setIsNewModal] = useState<boolean>(false);

  // Google Sheets Integration & Auth state
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [googleAccessToken, setGoogleAccessToken] = useState<string | null>(null);
  const [isGoogleSheetsModalOpen, setIsGoogleSheetsModalOpen] = useState<boolean>(false);

  // Direct Sheet Sync 2026 Configuration & Validation Alerts
  const [syncConfig, setSyncConfig] = useState<DirectSheetSyncConfig>(() => {
    try {
      const saved = localStorage.getItem('master_ocupacion_sheets_cfg_v2');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.spreadsheetId === '1_MASTER_OCUPACION_2026_DEMO') {
          return {
            spreadsheetUrl: '',
            spreadsheetId: '',
            autoSync: false,
            syncIntervalMinutes: 5,
            detectedSheets: [],
            totalRecordsSynced: 0,
          };
        }
        return parsed;
      }
    } catch (e) {}
    return {
      spreadsheetUrl: '',
      spreadsheetId: '',
      autoSync: false,
      syncIntervalMinutes: 5,
      detectedSheets: [],
      totalRecordsSynced: 0,
    };
  });

  const [validationAlerts, setValidationAlerts] = useState<SheetValidationAlert[]>(() => {
    try {
      const saved = localStorage.getItem('master_ocupacion_validation_alerts_v1');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [];
  });

  const [syncedHistory, setSyncedHistory] = useState<HistoricalRecord[] | null>(() => {
    try {
      const saved = localStorage.getItem('master_ocupacion_synced_history_v1');
      const savedCfg = localStorage.getItem('master_ocupacion_sheets_cfg_v2');
      if (savedCfg && savedCfg.includes('1_MASTER_OCUPACION_2026_DEMO')) {
        localStorage.removeItem('master_ocupacion_synced_history_v1');
        return null;
      }
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return null;
  });

  const [isSyncingDirect, setIsSyncingDirect] = useState<boolean>(false);

  // Persist sync config & alerts
  useEffect(() => {
    try {
      localStorage.setItem('master_ocupacion_sheets_cfg_v2', JSON.stringify(syncConfig));
    } catch (e) {}
  }, [syncConfig]);

  useEffect(() => {
    try {
      localStorage.setItem('master_ocupacion_validation_alerts_v1', JSON.stringify(validationAlerts));
    } catch (e) {}
  }, [validationAlerts]);

  useEffect(() => {
    if (syncedHistory) {
      try {
        localStorage.setItem('master_ocupacion_synced_history_v1', JSON.stringify(syncedHistory));
      } catch (e) {}
    }
  }, [syncedHistory]);

  // Initialize Firebase Auth listener for Google account
  useEffect(() => {
    const unsubscribe = initAuth(
      (user, token) => {
        setCurrentUser(user);
        setGoogleAccessToken(token);
      },
      () => {
        setCurrentUser(null);
        setGoogleAccessToken(null);
      }
    );
    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, []);

  // Compute metrics with mathematical weighting
  const metrics = useMemo(() => computeMetrics(yards), [yards]);

  // Real-time capacity alerts
  const capacityAlerts = useMemo(() => generateAlerts(metrics.allYards), [metrics.allYards]);

  // Total count of critical alerts
  const criticalCapacityCount = capacityAlerts.filter((a) => a.severity === 'CRITICAL').length;
  const criticalValidationCount = validationAlerts.filter((a) => a.severity === 'CRITICAL').length;
  const totalCriticalCount = criticalCapacityCount + criticalValidationCount;
  const totalAllAlertsCount = capacityAlerts.length + validationAlerts.length;

  // History timeline: STRICTLY data found in Google Sheets database (never invent or mock dates)
  const history = useMemo(() => {
    if (!syncedHistory || syncedHistory.length === 0) {
      return [];
    }

    if (datePreset === 'custom') {
      return syncedHistory.filter((r) => r.date >= startDate && r.date <= endDate);
    }
    if (datePreset === 'today') {
      const todayStr = new Date().toISOString().split('T')[0];
      const todayRecord = syncedHistory.filter((r) => r.date === todayStr);
      if (todayRecord.length > 0) return todayRecord;
      // If today is not in the sheet, return the latest date recorded in the sheet
      return syncedHistory.slice(-1);
    }
    if (datePreset === '7d') {
      return syncedHistory.slice(-7);
    }
    if (datePreset === '14d') {
      return syncedHistory.slice(-14);
    }
    if (datePreset === '30d') {
      return syncedHistory.slice(-30);
    }
    return syncedHistory;
  }, [syncedHistory, datePreset, startDate, endDate]);

  // Label for current filter period
  const dateFilterLabel = useMemo(() => {
    if (datePreset === 'today') return `Hoy (${new Date().toLocaleDateString('es-CO')})`;
    if (datePreset === '7d') return 'Últimos 7 días';
    if (datePreset === '14d') return 'Últimos 14 días';
    if (datePreset === '30d') return 'Últimos 30 días';
    return `${startDate} al ${endDate}`;
  }, [datePreset, startDate, endDate]);

  // Handlers for Google Sheets Direct Sync
  const handleExecuteDirectSync = useCallback(
    async (urlOrId: string) => {
      if (!googleAccessToken) {
        throw new Error('Debe iniciar sesión con su cuenta de Google para sincronizar con la hoja.');
      }
      setIsSyncingDirect(true);
      try {
        const result = await syncFromGoogleSheetsDirect(urlOrId, googleAccessToken, yards);
        setYards(result.updatedYards);
        setSyncedHistory(result.history);
        setValidationAlerts(result.alerts);

        const cleanId = extractSpreadsheetId(urlOrId);
        setSyncConfig((prev) => ({
          ...prev,
          spreadsheetUrl: urlOrId.startsWith('http') ? urlOrId : `https://docs.google.com/spreadsheets/d/${cleanId}/edit`,
          spreadsheetId: cleanId,
          lastSyncedAt: new Date().toISOString(),
          detectedSheets: result.sheetsProcessed,
          totalRecordsSynced: result.datesFound.length,
        }));
      } finally {
        setIsSyncingDirect(false);
      }
    },
    [googleAccessToken, yards]
  );

  const handleLoadDemo2026 = useCallback(() => {
    setIsSyncingDirect(true);
    setTimeout(() => {
      const demoResult = generateDemo2026SheetData(yards);
      setYards(demoResult.updatedYards);
      setSyncedHistory(demoResult.history);
      setValidationAlerts(demoResult.alerts);
      setSyncConfig((prev) => ({
        ...prev,
        spreadsheetUrl: 'https://docs.google.com/spreadsheets/d/1_MASTER_OCUPACION_2026_DEMO/edit',
        spreadsheetId: '1_MASTER_OCUPACION_2026_DEMO',
        lastSyncedAt: new Date().toISOString(),
        detectedSheets: demoResult.sheetsProcessed,
        totalRecordsSynced: demoResult.datesFound.length,
      }));
      setIsSyncingDirect(false);
    }, 400);
  }, [yards]);

  const handleSyncNow = useCallback(() => {
    if (syncConfig.spreadsheetUrl) {
      if (!googleAccessToken) {
        setIsGoogleSheetsModalOpen(true);
        return;
      }
      handleExecuteDirectSync(syncConfig.spreadsheetUrl).catch((err) => {
        console.error(err);
        setIsGoogleSheetsModalOpen(true);
      });
    } else {
      setIsGoogleSheetsModalOpen(true);
    }
  }, [syncConfig.spreadsheetUrl, googleAccessToken, handleExecuteDirectSync]);

  // Handlers for yard selection and editing
  const handleSelectYard = (yard: YardCalculated) => {
    setSelectedYard(yard);
    setIsNewModal(false);
    setIsModalOpen(true);
  };

  const handleAddNewYard = () => {
    setSelectedYard(null);
    setIsNewModal(true);
    setIsModalOpen(true);
  };

  const handleSaveYard = (savedYard: YardItem) => {
    setYards((prev) => {
      const existsIndex = prev.findIndex((y) => y.id === savedYard.id);
      if (existsIndex >= 0) {
        const next = [...prev];
        next[existsIndex] = savedYard;
        return next;
      }
      return [...prev, savedYard];
    });
  };

  const handleDeleteYard = (id: string) => {
    setYards((prev) => prev.filter((y) => y.id !== id));
  };

  const handleQuickUpdateOccupancy = (yardId: string, newOccupiedM2: number) => {
    setYards((prev) =>
      prev.map((y) => (y.id === yardId ? { ...y, currentOccupiedM2: Math.min(y.areaTotalM2, Math.max(0, newOccupiedM2)) } : y))
    );
  };

  // Scenario Simulator
  const handleApplyScenario = (scenario: 'normal' | 'peak' | 'critical_bitco' | 'low' | 'reset') => {
    if (scenario === 'reset') {
      setYards(INITIAL_YARDS);
      return;
    }

    setYards((prev) =>
      prev.map((y) => {
        let pct = 0.68;
        if (scenario === 'peak') {
          pct = 0.88 + ((y.id.charCodeAt(0) % 7) * 0.015);
        } else if (scenario === 'critical_bitco') {
          if (y.terminal === 'BITCO') {
            pct = 0.94;
          } else {
            pct = 0.72;
          }
        } else if (scenario === 'low') {
          pct = 0.38 + ((y.id.charCodeAt(0) % 5) * 0.02);
        } else if (scenario === 'normal') {
          pct = 0.65 + ((y.id.charCodeAt(0) % 6) * 0.025);
        }

        const newOcc = Math.round(y.areaTotalM2 * Math.min(0.98, pct));
        return {
          ...y,
          currentOccupiedM2: newOcc,
        };
      })
    );
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-sky-500 selection:text-white">
      {/* Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        activeTerminal={activeTerminal}
        setActiveTerminal={setActiveTerminal}
        criticalAlertsCount={totalCriticalCount}
        totalAlertsCount={totalAllAlertsCount}
        weightedGlobalPct={metrics.weightedOccupancyPct}
        googleUser={currentUser}
        onOpenGoogleSheets={() => setIsGoogleSheetsModalOpen(true)}
      />

      {/* Main Container (Full screen width) */}
      <main className="flex-1 w-full px-4 sm:px-6 lg:px-8 xl:px-12 py-5">
        {/* Direct Google Sheets Sync status bar */}
        <DirectSheetsSyncBar
          config={syncConfig}
          isSyncing={isSyncingDirect}
          validationAlerts={validationAlerts}
          datesCount={syncedHistory ? syncedHistory.length : 0}
          onSyncNow={handleSyncNow}
          onOpenConfig={() => setIsGoogleSheetsModalOpen(true)}
          onNavigateToAlerts={() => setActiveTab('alertas')}
        />

        {/* Date Filter & Fast Toolbar (Only visible on Dashboard, Terminals, and Master) */}
        {activeTab !== 'reportes' && (
          <DateFilterBar
            preset={datePreset}
            setPreset={setDatePreset}
            startDate={startDate}
            setStartDate={setStartDate}
            endDate={endDate}
            setEndDate={setEndDate}
            onApplyScenario={handleApplyScenario}
          />
        )}

        {/* View Switcher */}
        {activeTab === 'consolidado' && (
          <ConsolidatedDashboard
            metrics={metrics}
            history={history}
            onSelectTerminal={(term) => {
              setActiveTerminal(term);
              setActiveTab('terminal');
            }}
            onSelectYard={handleSelectYard}
            onNavigateToTab={setActiveTab}
          />
        )}

        {activeTab === 'terminal' && (
          <TerminalView
            metrics={activeTerminal === 'SPRB' ? metrics.sprb : metrics.bitco}
            onSelectTerminal={setActiveTerminal}
            onSelectYard={handleSelectYard}
            onQuickUpdateOccupancy={handleQuickUpdateOccupancy}
          />
        )}

        {activeTab === 'maestro' && (
          <YardsMasterView
            yards={metrics.allYards}
            onSelectYard={handleSelectYard}
            onAddNewYard={handleAddNewYard}
            onDeleteYard={handleDeleteYard}
            onApplyScenario={handleApplyScenario}
            onQuickUpdateOccupancy={handleQuickUpdateOccupancy}
          />
        )}

        {activeTab === 'alertas' && (
          <AlertsPanel
            alerts={capacityAlerts}
            validationAlerts={validationAlerts}
            allYards={metrics.allYards}
            onSelectYard={handleSelectYard}
            onApplyScenario={handleApplyScenario}
            onOpenGoogleSheets={() => setIsGoogleSheetsModalOpen(true)}
          />
        )}

        {activeTab === 'reportes' && (
          <ReportsView
            metrics={metrics}
            dateFilterLabel={dateFilterLabel}
            onOpenGoogleSheets={() => setIsGoogleSheetsModalOpen(true)}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-4 text-center text-xs text-slate-500 font-mono no-print">
        <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Master Ocupation · Sistema de Control Portuario SPRB & BITCO</span>
          <span>Capacidad Total: 53,048 m² · Ponderación Geográfica por IP & Google Sheets 2026</span>
        </div>
      </footer>

      {/* Yard Inspection & Edit Modal */}
      <YardEditModal
        yard={selectedYard}
        isOpen={isModalOpen}
        isNew={isNewModal}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveYard}
        onDelete={handleDeleteYard}
      />

      {/* Google Sheets Modal (Direct Sync 2026, Export, Import) */}
      <GoogleSheetsModal
        isOpen={isGoogleSheetsModalOpen}
        onClose={() => setIsGoogleSheetsModalOpen(false)}
        metrics={metrics}
        currentUser={currentUser}
        accessToken={googleAccessToken}
        onAuthSuccess={(user, token) => {
          setCurrentUser(user);
          setGoogleAccessToken(token);
        }}
        onAuthLogout={() => {
          setCurrentUser(null);
          setGoogleAccessToken(null);
        }}
        onImportYards={(importedYards) => {
          setYards(importedYards);
        }}
        syncConfig={syncConfig}
        onSaveSyncConfig={setSyncConfig}
        validationAlerts={validationAlerts}
        onExecuteDirectSync={handleExecuteDirectSync}
        onLoadDemo2026={handleLoadDemo2026}
        isSyncingDirect={isSyncingDirect}
      />
    </div>
  );
}
