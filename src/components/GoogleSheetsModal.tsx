import React, { useState, useEffect } from 'react';
import {
  X,
  FileSpreadsheet,
  Download,
  Upload,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  RefreshCw,
  LogOut,
  FolderOpen,
  ArrowRight,
  ShieldCheck,
  Zap,
  Calendar,
  Layers,
  HelpCircle,
  Sparkles,
} from 'lucide-react';
import { User } from 'firebase/auth';
import { googleSignIn, logout } from '../services/googleAuth';
import {
  createAndExportToGoogleSheets,
  listDriveSpreadsheets,
  readSpreadsheetYards,
  DriveSpreadsheetFile,
} from '../services/googleSheets';
import {
  ConsolidatedMetrics,
  YardItem,
  DirectSheetSyncConfig,
  SheetValidationAlert,
} from '../types/occupancy';
import { extractSpreadsheetId, parseExcelBuffer } from '../services/googleSheetsSync';

interface GoogleSheetsModalProps {
  isOpen: boolean;
  onClose: () => void;
  metrics: ConsolidatedMetrics;
  currentUser: User | null;
  accessToken: string | null;
  onAuthSuccess: (user: User, token: string) => void;
  onAuthLogout: () => void;
  onImportYards: (yards: YardItem[]) => void;
  // Direct Sync props
  syncConfig: DirectSheetSyncConfig;
  onSaveSyncConfig: (cfg: DirectSheetSyncConfig) => void;
  validationAlerts: SheetValidationAlert[];
  onExecuteDirectSync: (urlOrId: string) => Promise<void>;
  onLoadDemo2026: () => void;
  isSyncingDirect: boolean;
}

export const GoogleSheetsModal: React.FC<GoogleSheetsModalProps> = ({
  isOpen,
  onClose,
  metrics,
  currentUser,
  accessToken,
  onAuthSuccess,
  onAuthLogout,
  onImportYards,
  syncConfig,
  onSaveSyncConfig,
  validationAlerts,
  onExecuteDirectSync,
  onLoadDemo2026,
  isSyncingDirect,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'direct' | 'export' | 'import'>('direct');
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Direct sync input
  const [directUrlInput, setDirectUrlInput] = useState(syncConfig.spreadsheetUrl || '');

  // Export state
  const [sheetTitle, setSheetTitle] = useState(() => `Master_Ocupacion_${new Date().toISOString().slice(0, 10)}`);
  const [isExporting, setIsExporting] = useState(false);
  const [createdUrl, setCreatedUrl] = useState<string | null>(null);

  // Import state
  const [spreadsheetIdInput, setSpreadsheetIdInput] = useState('');
  const [driveFiles, setDriveFiles] = useState<DriveSpreadsheetFile[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [previewYards, setPreviewYards] = useState<YardItem[] | null>(null);

  // Confirmation dialogs
  const [showConfirmExport, setShowConfirmExport] = useState(false);
  const [showConfirmImport, setShowConfirmImport] = useState(false);

  useEffect(() => {
    if (syncConfig.spreadsheetUrl) {
      setDirectUrlInput(syncConfig.spreadsheetUrl);
    }
  }, [syncConfig.spreadsheetUrl]);

  useEffect(() => {
    if (isOpen && currentUser && accessToken && activeSubTab === 'import') {
      fetchDriveFiles();
    }
  }, [isOpen, currentUser, accessToken, activeSubTab]);

  if (!isOpen) return null;

  const handleLogin = async () => {
    setIsSigningIn(true);
    setStatusMessage(null);
    try {
      const res = await googleSignIn();
      if (res) {
        onAuthSuccess(res.user, res.accessToken);
        setStatusMessage({ type: 'success', text: `Conectado como ${res.user.email}` });
      }
    } catch (err: any) {
      console.error(err);
      setStatusMessage({ type: 'error', text: err.message || 'Error al iniciar sesión con Google.' });
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    onAuthLogout();
    setCreatedUrl(null);
    setDriveFiles([]);
    setPreviewYards(null);
    setStatusMessage({ type: 'info', text: 'Sesión de Google cerrada.' });
  };

  const handleSaveAndSync = async () => {
    const trimmed = directUrlInput.trim();
    if (!trimmed) {
      setStatusMessage({ type: 'error', text: 'Por favor ingrese la URL o ID del Google Sheet.' });
      return;
    }

    const id = extractSpreadsheetId(trimmed);
    const updatedCfg: DirectSheetSyncConfig = {
      ...syncConfig,
      spreadsheetUrl: trimmed.startsWith('http') ? trimmed : `https://docs.google.com/spreadsheets/d/${id}/edit`,
      spreadsheetId: id,
    };
    onSaveSyncConfig(updatedCfg);

    if (!currentUser || !accessToken) {
      setStatusMessage({
        type: 'info',
        text: 'URL guardada. Inicie sesión con Google para sincronizar en vivo con la hoja privada o use datos de prueba.',
      });
      return;
    }

    try {
      await onExecuteDirectSync(trimmed);
      setStatusMessage({
        type: 'success',
        text: '¡Sincronización directa exitosa! Se actualizaron los porcentajes de ocupación por IP y fecha.',
      });
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Error al sincronizar con Google Sheets.' });
    }
  };

  const handleLocalFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const buffer = await file.arrayBuffer();
      const result = parseExcelBuffer(buffer, metrics.allYards);
      onImportYards(result.updatedYards);
      setStatusMessage({
        type: 'success',
        text: `¡Archivo "${file.name}" cargado exitosamente! Se procesaron ${result.datesFound.length} fechas en ${result.sheetsProcessed.length} hojas mensuales.`,
      });
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Error al procesar archivo Excel local.' });
    }
  };

  const fetchDriveFiles = async () => {
    if (!accessToken) return;
    setIsLoadingFiles(true);
    try {
      const files = await listDriveSpreadsheets(accessToken);
      setDriveFiles(files);
    } catch (err: any) {
      console.error(err);
      setStatusMessage({ type: 'error', text: 'No se pudieron listar los archivos de Google Drive.' });
    } finally {
      setIsLoadingFiles(false);
    }
  };

  const executeExport = async () => {
    if (!accessToken) return;
    setIsExporting(true);
    setStatusMessage(null);
    setShowConfirmExport(false);

    try {
      const res = await createAndExportToGoogleSheets(metrics, sheetTitle, accessToken);
      setCreatedUrl(res.spreadsheetUrl);
      setStatusMessage({
        type: 'success',
        text: `¡Hoja de cálculo creada exitosamente en Google Drive!`,
      });
    } catch (err: any) {
      console.error(err);
      setStatusMessage({ type: 'error', text: err.message || 'Error al exportar a Google Sheets.' });
    } finally {
      setIsExporting(false);
    }
  };

  const handleLoadPreview = async (idOrUrl: string) => {
    if (!accessToken) return;
    setStatusMessage(null);
    setPreviewYards(null);

    const id = extractSpreadsheetId(idOrUrl);
    if (!id) {
      setStatusMessage({ type: 'error', text: 'Por favor ingrese un ID o enlace válido de Google Sheets.' });
      return;
    }

    setIsImporting(true);
    try {
      const yards = await readSpreadsheetYards(id, accessToken);
      setPreviewYards(yards);
      setSpreadsheetIdInput(id);
      setStatusMessage({
        type: 'info',
        text: `Se identificaron ${yards.length} patios y bodegas listos para sincronizar.`,
      });
    } catch (err: any) {
      console.error(err);
      setStatusMessage({ type: 'error', text: err.message || 'Error al leer la hoja de cálculo.' });
    } finally {
      setIsImporting(false);
    }
  };

  const executeImport = () => {
    if (!previewYards || previewYards.length === 0) return;
    onImportYards(previewYards);
    setShowConfirmImport(false);
    setStatusMessage({
      type: 'success',
      text: `Se actualizaron exitosamente ${previewYards.length} patios y bodegas desde Google Sheets.`,
    });
    setPreviewYards(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-3xl w-full p-6 shadow-2xl relative overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                Conexión & Sincronización Google Sheets
              </h3>
              <p className="text-xs text-slate-400 font-mono">
                Google Workspace · Matriz Mensual 2026 con Ponderación de Patios e IP
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Auth status bar */}
        <div className="py-2.5 px-4 bg-slate-950 border-b border-slate-800 shrink-0 flex items-center justify-between text-xs">
          {currentUser ? (
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                {currentUser.photoURL ? (
                  <img
                    src={currentUser.photoURL}
                    alt={currentUser.displayName || ''}
                    className="w-6 h-6 rounded-full"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <span className="w-6 h-6 rounded-full bg-emerald-600 flex items-center justify-center text-white font-bold text-[10px]">
                    {currentUser.email?.charAt(0).toUpperCase()}
                  </span>
                )}
                <span className="text-slate-300">
                  Conectado como <strong className="text-white">{currentUser.email}</strong>
                </span>
              </div>
              <button
                onClick={handleLogout}
                className="text-slate-400 hover:text-rose-400 font-medium flex items-center gap-1 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Desconectar</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between w-full">
              <span className="text-slate-400">Inicia sesión con Google para sincronización directa automática</span>
              <button
                onClick={handleLogin}
                disabled={isSigningIn}
                className="px-3 py-1 bg-white hover:bg-slate-100 text-slate-900 font-semibold rounded-lg shadow transition-colors flex items-center gap-2 text-xs"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 48 48">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                </svg>
                <span>{isSigningIn ? 'Conectando...' : 'Acceder con Google'}</span>
              </button>
            </div>
          )}
        </div>

        {/* Subtabs: Direct Sync 2026 vs Export vs Import */}
        <div className="flex border-b border-slate-800 bg-slate-900/50 text-xs shrink-0">
          <button
            onClick={() => setActiveSubTab('direct')}
            className={`flex-1 py-3 font-semibold transition-colors flex items-center justify-center gap-2 border-b-2 ${
              activeSubTab === 'direct'
                ? 'border-emerald-500 text-white bg-slate-800/40'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Zap className="w-4 h-4 text-emerald-400" />
            <span>Conexión Directa Matriz 2026</span>
          </button>
          <button
            onClick={() => setActiveSubTab('export')}
            className={`flex-1 py-3 font-semibold transition-colors flex items-center justify-center gap-2 border-b-2 ${
              activeSubTab === 'export'
                ? 'border-emerald-500 text-white bg-slate-800/40'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Download className="w-4 h-4 text-sky-400" />
            <span>Exportar Libro a Drive</span>
          </button>
          <button
            onClick={() => setActiveSubTab('import')}
            className={`flex-1 py-3 font-semibold transition-colors flex items-center justify-center gap-2 border-b-2 ${
              activeSubTab === 'import'
                ? 'border-emerald-500 text-white bg-slate-800/40'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Upload className="w-4 h-4 text-indigo-400" />
            <span>Importar Maestro Patios</span>
          </button>
        </div>

        {/* Content body */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {statusMessage && (
            <div
              className={`p-3 rounded-lg text-xs flex items-center gap-2 ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300'
                  : statusMessage.type === 'error'
                  ? 'bg-rose-500/15 border border-rose-500/30 text-rose-300'
                  : 'bg-sky-500/15 border border-sky-500/30 text-sky-300'
              }`}
            >
              {statusMessage.type === 'success' && <CheckCircle2 className="w-4 h-4 shrink-0" />}
              {statusMessage.type === 'error' && <AlertCircle className="w-4 h-4 shrink-0" />}
              {statusMessage.type === 'info' && <ShieldCheck className="w-4 h-4 shrink-0" />}
              <span>{statusMessage.text}</span>
            </div>
          )}

          {/* TAB 1: CONEXIÓN DIRECTA 2026 */}
          {activeSubTab === 'direct' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Enlace o ID de la base de datos de Google Sheets (Matriz 2026)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={directUrlInput}
                    onChange={(e) => setDirectUrlInput(e.target.value)}
                    placeholder="https://docs.google.com/spreadsheets/d/1.../edit#gid=0"
                    className="flex-1 bg-slate-950 border border-slate-800 text-slate-200 px-3 py-2 rounded-lg text-xs font-mono focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    onClick={handleSaveAndSync}
                    disabled={isSyncingDirect || !directUrlInput.trim()}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors shadow disabled:opacity-50 shrink-0"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSyncingDirect ? 'animate-spin' : ''}`} />
                    <span>{isSyncingDirect ? 'Sincronizando...' : 'Conectar & Sincronizar'}</span>
                  </button>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px] text-slate-400 mt-2 pt-2 border-t border-slate-800/80">
                  <span>Compatible con Google Sheets y archivos Excel (.xlsx) en Google Drive.</span>
                  <label className="text-sky-400 hover:text-sky-300 cursor-pointer font-medium flex items-center gap-1 transition-colors self-start sm:self-auto">
                    <Upload className="w-3.5 h-3.5" />
                    <span>O subir archivo .xlsx local</span>
                    <input
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={handleLocalFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {/* Data Structure Card */}
              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 text-xs space-y-2">
                <div className="font-semibold text-slate-200 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-emerald-400" />
                  <span>Reglas de Lectura y Validación de la Matriz 2026:</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] pt-1 text-slate-300">
                  <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                    <strong className="text-emerald-400 block mb-0.5">· Hojas Mensuales 2026:</strong>
                    Pestañas para cada mes (Enero, Febrero, ... Diciembre).
                  </div>
                  <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                    <strong className="text-sky-400 block mb-0.5">· Columna A (desde Fila 2/3):</strong>
                    Códigos de Patios/Bodegas coincidentes con el Maestro (4Y5, B15, PATCO, etc.).
                  </div>
                  <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                    <strong className="text-amber-400 block mb-0.5">· Fila 2 desde Columna B:</strong>
                    Fechas de cada mes donde se registró la ocupación.
                  </div>
                  <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                    <strong className="text-teal-400 block mb-0.5">· Valores en % y Celdas Vacías:</strong>
                    Cualquier número es interpretado como %; celdas sin datos se tratan como vacías.
                  </div>
                </div>
              </div>

              {/* Demo matrix load button */}
              <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-semibold text-white flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>Cargar Matriz de Demostración 2026 (12 Meses)</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Genera la estructura de 12 meses, fechas diarias y prueba las alertas de código y valores no numéricos.
                  </p>
                </div>
                <button
                  onClick={() => {
                    onLoadDemo2026();
                    setStatusMessage({
                      type: 'success',
                      text: 'Matriz 2026 cargada: 12 meses procesados, fechas diarias alimentadas y alertas de validación activadas.',
                    });
                  }}
                  className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 rounded-lg text-xs font-semibold transition-colors shrink-0"
                >
                  Cargar Demo 2026
                </button>
              </div>

              {/* Validation Alerts Section */}
              {validationAlerts.length > 0 && (
                <div className="p-3 bg-amber-950/20 border border-amber-500/40 rounded-xl space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold text-amber-200">
                    <span className="flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-amber-400" />
                      <span>Alertas de Validación Activas ({validationAlerts.length})</span>
                    </span>
                    <span className="text-[11px] font-mono text-amber-400">Notificadas en Tablero</span>
                  </div>

                  <div className="max-h-40 overflow-y-auto space-y-1.5">
                    {validationAlerts.map((a) => (
                      <div
                        key={a.id}
                        className="p-2 bg-slate-900 rounded-lg text-[11px] border border-slate-800 text-slate-300"
                      >
                        <div className="flex items-center gap-2 font-mono">
                          <span
                            className={`px-1 rounded text-[9px] font-bold ${
                              a.type === 'CODE_MISMATCH'
                                ? 'bg-amber-500/20 text-amber-300'
                                : 'bg-rose-500/20 text-rose-300'
                            }`}
                          >
                            {a.type === 'CODE_MISMATCH' ? 'CÓDIGO NO COINCIDE' : 'VALOR NO NUMÉRICO'}
                          </span>
                          <span className="text-slate-400">
                            Hoja: <strong>{a.sheetName}</strong>
                          </span>
                          {a.rowNumber && <span>Fila {a.rowNumber}</span>}
                          {a.colName && <span>Col {a.colName}</span>}
                        </div>
                        <p className="mt-1 text-slate-200">{a.message}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: EXPORT */}
          {activeSubTab === 'export' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Título del nuevo libro en Google Drive
                </label>
                <input
                  type="text"
                  value={sheetTitle}
                  onChange={(e) => setSheetTitle(e.target.value)}
                  placeholder="Nombre de la hoja de cálculo"
                  className="w-full bg-slate-950 border border-slate-800 text-slate-200 px-3 py-2 rounded-lg text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 text-xs text-slate-400 space-y-2">
                <div className="font-semibold text-slate-200 flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                  <span>El libro se creará con 4 hojas oficiales estructuradas:</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                  <div className="bg-slate-900 p-2 rounded border border-slate-800">
                    <strong className="text-sky-400">1. Gran Consolidado:</strong> Balance total 53,048 m² y resumen ejecutivo.
                  </div>
                  <div className="bg-slate-900 p-2 rounded border border-slate-800">
                    <strong className="text-sky-400">2. Terminal SPRB:</strong> 24,948 m², zonas y sus 21 patios/bodegas.
                  </div>
                  <div className="bg-slate-900 p-2 rounded border border-slate-800">
                    <strong className="text-indigo-400">3. Terminal BITCO:</strong> 28,100 m², PATCO y BOD-B.
                  </div>
                  <div className="bg-slate-900 p-2 rounded border border-slate-800">
                    <strong className="text-emerald-400">4. Maestro Patios:</strong> Matriz de 23 unidades con fórmulas ponderadas.
                  </div>
                </div>
              </div>

              {createdUrl && (
                <div className="p-4 bg-emerald-950/20 border border-emerald-500/40 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs text-emerald-300">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                    <span>Hoja disponible en tu Google Drive</span>
                  </div>
                  <a
                    href={createdUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    <span>Abrir en Google Sheets</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}

              {/* Confirmation state */}
              {showConfirmExport ? (
                <div className="p-4 bg-amber-950/20 border border-amber-500/40 rounded-xl space-y-3">
                  <div className="text-xs text-amber-200">
                    <strong>Confirmación requerida:</strong> Se creará un nuevo archivo de Google Sheets llamado{' '}
                    <code className="text-white bg-slate-900 px-1 py-0.5 rounded">{sheetTitle}</code> en tu unidad de Google Drive con los datos y ponderaciones actuales.
                  </div>
                  <div className="flex items-center gap-2 justify-end">
                    <button
                      onClick={() => setShowConfirmExport(false)}
                      className="px-3 py-1.5 text-xs text-slate-300 hover:text-white bg-slate-800 rounded-lg"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={executeExport}
                      disabled={isExporting}
                      className="px-4 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg flex items-center gap-1.5 shadow"
                    >
                      {isExporting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                      <span>{isExporting ? 'Creando hoja...' : 'Sí, crear en Google Drive'}</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="pt-2">
                  <button
                    onClick={() => {
                      if (!currentUser || !accessToken) {
                        handleLogin();
                      } else {
                        setShowConfirmExport(true);
                      }
                    }}
                    disabled={isExporting}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl text-xs flex items-center justify-center gap-2 shadow transition-colors"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    <span>
                      {!currentUser ? 'Conectar con Google para Exportar' : 'Crear Hoja de Cálculo en Google Sheets'}
                    </span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: IMPORT */}
          {activeSubTab === 'import' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Enlace o ID de la hoja de Google Sheets
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={spreadsheetIdInput}
                    onChange={(e) => setSpreadsheetIdInput(e.target.value)}
                    placeholder="https://docs.google.com/spreadsheets/d/..."
                    className="flex-1 bg-slate-950 border border-slate-800 text-slate-200 px-3 py-2 rounded-lg text-xs font-mono focus:outline-none focus:border-sky-500"
                  />
                  <button
                    onClick={() => handleLoadPreview(spreadsheetIdInput)}
                    disabled={isImporting || !spreadsheetIdInput.trim()}
                    className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors disabled:opacity-50"
                  >
                    {isImporting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <FolderOpen className="w-3.5 h-3.5" />}
                    <span>Examinar</span>
                  </button>
                </div>
              </div>

              {/* Drive files picker */}
              {currentUser && (
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                      <FolderOpen className="w-3.5 h-3.5 text-sky-400" />
                      <span>Libros recientes en tu Google Drive</span>
                    </span>
                    <button
                      onClick={fetchDriveFiles}
                      className="text-slate-400 hover:text-sky-400 flex items-center gap-1 text-[11px]"
                    >
                      <RefreshCw className={`w-3 h-3 ${isLoadingFiles ? 'animate-spin' : ''}`} />
                      <span>Actualizar</span>
                    </button>
                  </div>

                  {isLoadingFiles ? (
                    <div className="py-4 text-center text-slate-500 text-xs">Cargando archivos de Drive...</div>
                  ) : driveFiles.length === 0 ? (
                    <div className="py-3 text-center text-slate-500 text-xs">
                      No se encontraron hojas de cálculo en la unidad.
                    </div>
                  ) : (
                    <div className="max-h-36 overflow-y-auto space-y-1">
                      {driveFiles.map((file) => (
                        <div
                          key={file.id}
                          onClick={() => handleLoadPreview(file.id)}
                          className="p-2 bg-slate-900 hover:bg-slate-800 rounded-lg cursor-pointer flex items-center justify-between transition-colors"
                        >
                          <div className="flex items-center gap-2 truncate">
                            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            <span className="text-slate-200 truncate">{file.name}</span>
                          </div>
                          <span className="text-[10px] text-sky-400 font-mono shrink-0">Seleccionar</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Preview table if loaded */}
              {previewYards && (
                <div className="p-3 bg-slate-950 rounded-xl border border-sky-500/40 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-white">
                      Vista previa de patios ({previewYards.length} registros)
                    </span>
                    <span className="text-[11px] font-mono text-emerald-400">Datos validados</span>
                  </div>

                  <div className="max-h-44 overflow-y-auto">
                    <table className="w-full text-left text-xs font-mono">
                      <thead className="text-slate-400 border-b border-slate-800">
                        <tr>
                          <th className="py-1">Código</th>
                          <th className="py-1">Nombre</th>
                          <th className="py-1">IP</th>
                          <th className="py-1">Zona</th>
                          <th className="py-1 text-right">Área Total</th>
                          <th className="py-1 text-right">Ocupada</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {previewYards.slice(0, 8).map((y) => (
                          <tr key={y.id}>
                            <td className="py-1 font-bold text-sky-400">{y.id}</td>
                            <td className="py-1 text-slate-300 truncate max-w-[120px]">{y.name}</td>
                            <td className="py-1 text-slate-400">{y.terminal}</td>
                            <td className="py-1 text-slate-400 text-[10px]">{y.zone}</td>
                            <td className="py-1 text-right text-slate-200">{y.areaTotalM2} m²</td>
                            <td className="py-1 text-right text-sky-300">{y.currentOccupiedM2} m²</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {showConfirmImport ? (
                    <div className="p-3 bg-amber-950/20 border border-amber-500/40 rounded-lg space-y-2">
                      <p className="text-xs text-amber-200">
                        ¿Confirma actualizar el maestro de la aplicación con los {previewYards.length} patios leídos de Google Sheets?
                      </p>
                      <div className="flex items-center gap-2 justify-end">
                        <button
                          onClick={() => setShowConfirmImport(false)}
                          className="px-3 py-1 text-xs text-slate-300 bg-slate-800 rounded-lg"
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={executeImport}
                          className="px-3 py-1 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-500 rounded-lg"
                        >
                          Confirmar e Importar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowConfirmImport(true)}
                      className="w-full py-2 bg-sky-600 hover:bg-sky-500 text-white font-semibold rounded-lg text-xs flex items-center justify-center gap-2 transition-colors shadow"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Aplicar Datos a Master Ocupation</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 shrink-0 flex items-center justify-between text-xs text-slate-500">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Acceso seguro a Google Workspace bajo el estándar OAuth 2.0</span>
          </span>
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-medium transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
