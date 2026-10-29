import React, { useState, useEffect } from 'react';
import { X, Save, Trash2, Sliders, Warehouse, Ship, AlertCircle } from 'lucide-react';
import { YardItem, TerminalId, ZoneType } from '../types/occupancy';

interface YardEditModalProps {
  yard: YardItem | null;
  isOpen: boolean;
  isNew?: boolean;
  onClose: () => void;
  onSave: (savedYard: YardItem) => void;
  onDelete?: (id: string) => void;
}

export const YardEditModal: React.FC<YardEditModalProps> = ({
  yard,
  isOpen,
  isNew = false,
  onClose,
  onSave,
  onDelete,
}) => {
  const [id, setId] = useState('');
  const [name, setName] = useState('');
  const [terminal, setTerminal] = useState<TerminalId>('SPRB');
  const [zone, setZone] = useState<ZoneType>('DESCUBIERTA');
  const [areaTotalM2, setAreaTotalM2] = useState<number>(1000);
  const [currentOccupiedM2, setCurrentOccupiedM2] = useState<number>(700);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (yard) {
      setId(yard.id);
      setName(yard.name);
      setTerminal(yard.terminal);
      setZone(yard.zone);
      setAreaTotalM2(yard.areaTotalM2);
      setCurrentOccupiedM2(yard.currentOccupiedM2);
      setNotes(yard.notes || '');
      setError(null);
    } else if (isNew) {
      setId('');
      setName('');
      setTerminal('SPRB');
      setZone('DESCUBIERTA');
      setAreaTotalM2(1000);
      setCurrentOccupiedM2(650);
      setNotes('');
      setError(null);
    }
  }, [yard, isNew, isOpen]);

  if (!isOpen) return null;

  const occupancyPct = areaTotalM2 > 0 ? (currentOccupiedM2 / areaTotalM2) * 100 : 0;
  const availableM2 = Math.max(0, areaTotalM2 - currentOccupiedM2);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!id.trim()) {
      setError('El código del patio o bodega es obligatorio.');
      return;
    }
    if (!name.trim()) {
      setError('El nombre o descripción es obligatorio.');
      return;
    }
    if (areaTotalM2 <= 0) {
      setError('El área total debe ser mayor a 0 m².');
      return;
    }
    if (currentOccupiedM2 < 0) {
      setError('La ocupación no puede ser negativa.');
      return;
    }
    if (currentOccupiedM2 > areaTotalM2) {
      setError('La ocupación no puede superar el área total del patio.');
      return;
    }

    onSave({
      id: id.trim().toUpperCase(),
      name: name.trim(),
      terminal,
      zone,
      areaTotalM2,
      currentOccupiedM2,
      notes: notes.trim(),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-lg w-full p-6 shadow-2xl relative overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-sky-600/20 text-sky-400 flex items-center justify-center">
              {terminal === 'SPRB' ? <Ship className="w-4 h-4" /> : <Warehouse className="w-4 h-4" />}
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                {isNew ? 'Registrar Nuevo Patio o Bodega' : `Editar ${yard?.name || id}`}
              </h3>
              <p className="text-xs text-slate-400 font-mono">
                {isNew ? 'Maestro de infraestructura' : `Código: ${id} · IP: ${terminal}`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg text-xs text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Código / ID <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                value={id}
                onChange={(e) => setId(e.target.value)}
                disabled={!isNew}
                placeholder="Ej. P18, BOD-C"
                className="w-full bg-slate-950 border border-slate-800 text-slate-200 px-3 py-2 rounded-lg text-xs font-mono uppercase focus:outline-none focus:border-sky-500 disabled:opacity-60"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Terminal (IP) <span className="text-rose-400">*</span>
              </label>
              <select
                value={terminal}
                onChange={(e) => setTerminal(e.target.value as TerminalId)}
                className="w-full bg-slate-950 border border-slate-800 text-slate-200 px-3 py-2 rounded-lg text-xs focus:outline-none focus:border-sky-500"
              >
                <option value="SPRB">SPRB (Barranquilla)</option>
                <option value="BITCO">BITCO</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Nombre / Denominación <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej. Patio de Contenedores Norte"
                className="w-full bg-slate-950 border border-slate-800 text-slate-200 px-3 py-2 rounded-lg text-xs focus:outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Zona de Almacenamiento <span className="text-rose-400">*</span>
              </label>
              <select
                value={zone}
                onChange={(e) => setZone(e.target.value as ZoneType)}
                className="w-full bg-slate-950 border border-slate-800 text-slate-200 px-3 py-2 rounded-lg text-xs focus:outline-none focus:border-sky-500"
              >
                <option value="DESCUBIERTA">Descubierta (Patios al aire libre)</option>
                <option value="CUBIERTA">Cubierta (Bodegas techadas)</option>
              </select>
            </div>
          </div>

          {/* Area & Load Configuration */}
          <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Área Total Nominal (m²) <span className="text-rose-400">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={areaTotalM2}
                  onChange={(e) => setAreaTotalM2(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-700 text-white px-3 py-2 rounded-lg text-xs font-mono focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Área Actualmente Ocupada (m²)
                </label>
                <input
                  type="number"
                  min="0"
                  max={areaTotalM2}
                  step="1"
                  value={currentOccupiedM2}
                  onChange={(e) => setCurrentOccupiedM2(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-700 text-white px-3 py-2 rounded-lg text-xs font-mono focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>

            {/* Slider */}
            <div>
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1 font-mono">
                <span>Porcentaje de Ocupación:</span>
                <span className="font-bold text-white text-sm">
                  {occupancyPct.toFixed(1)}% ({currentOccupiedM2} m² de {areaTotalM2} m²)
                </span>
              </div>
              <input
                type="range"
                min="0"
                max={areaTotalM2 || 100}
                step="5"
                value={currentOccupiedM2}
                onChange={(e) => setCurrentOccupiedM2(Number(e.target.value))}
                className="w-full accent-sky-500 cursor-pointer"
              />
              <div className="flex justify-between text-[11px] text-slate-500 font-mono mt-1">
                <span>0 m²</span>
                <span className="text-emerald-400">Libre: {availableM2} m²</span>
                <span>{areaTotalM2} m²</span>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Notas Operativas / Tipo de Carga
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej. Carga refrigerada, acero estructural, café..."
              className="w-full bg-slate-950 border border-slate-800 text-slate-200 px-3 py-2 rounded-lg text-xs focus:outline-none focus:border-sky-500"
            />
          </div>

          {/* Modal Actions */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
            <div>
              {!isNew && onDelete && yard && (
                <button
                  type="button"
                  onClick={() => {
                    if (confirm(`¿Eliminar ${yard.name} del maestro de patios?`)) {
                      onDelete(yard.id);
                      onClose();
                    }
                  }}
                  className="px-3 py-2 text-xs font-medium text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 rounded-lg transition-colors flex items-center gap-1.5"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Eliminar</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-500 rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
              >
                <Save className="w-4 h-4" />
                <span>Guardar Cambios</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
