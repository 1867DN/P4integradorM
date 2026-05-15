import { useRef } from "react";

interface FilterBarProps {
  nombre: string;
  esAlergeno: boolean | undefined;
  onNombreChange: (v: string) => void;
  onEsAlergenoChange: (v: boolean | undefined) => void;
  onReset: () => void;
  onExport: () => void;
  isExporting: boolean;
  canManage?: boolean;
  onImport?: (file: File) => void;
  isImporting?: boolean;
  onDescargarPlantilla?: () => void;
}

export default function FilterBar({
  nombre,
  esAlergeno,
  onNombreChange,
  onEsAlergenoChange,
  onReset,
  onExport,
  isExporting,
  canManage = false,
  onImport,
  isImporting = false,
  onDescargarPlantilla,
}: FilterBarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const hasActiveFilters = nombre !== "" || esAlergeno !== undefined;

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file && onImport) {
      onImport(file);
      e.target.value = "";
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3 mb-4">
      {/* Búsqueda por nombre */}
      <div className="relative w-56">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400 text-sm pointer-events-none">🔍</span>
        <input
          type="text"
          value={nombre}
          onChange={(e) => onNombreChange(e.target.value)}
          placeholder="Buscar por nombre..."
          className="w-full border border-surface-300 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 bg-white"
        />
      </div>

      {/* Filtro alérgeno */}
      <select
        value={esAlergeno === undefined ? "" : esAlergeno ? "true" : "false"}
        onChange={(e) => {
          if (e.target.value === "") onEsAlergenoChange(undefined);
          else onEsAlergenoChange(e.target.value === "true");
        }}
        className="border border-surface-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 bg-white"
      >
        <option value="">Todos</option>
        <option value="true">Solo alérgenos</option>
        <option value="false">Sin alérgenos</option>
      </select>

      {/* Badge filtros activos */}
      {hasActiveFilters && (
        <button
          onClick={onReset}
          className="flex items-center gap-1.5 text-xs font-semibold text-brand-600 bg-brand-50 border border-brand-200 px-3 py-2.5 rounded-xl hover:bg-brand-100 transition cursor-pointer"
        >
          ✕ Limpiar filtros
        </button>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Botones de admin */}
      {canManage && (
        <>
          {/* Descargar plantilla */}
          <button
            onClick={onDescargarPlantilla}
            className="flex items-center gap-2 bg-surface-100 hover:bg-surface-200 text-surface-700 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer border border-surface-300"
          >
            📋 Plantilla
          </button>

          {/* Importar Excel */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={handleFileChange}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isImporting}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer"
          >
            {isImporting ? "Importando..." : "⬆ Importar Excel"}
          </button>
        </>
      )}

      {/* Exportar Excel */}
      <button
        onClick={onExport}
        disabled={isExporting}
        className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer"
      >
        {isExporting ? "Exportando..." : "⬇ Exportar Excel"}
      </button>
    </div>
  );
}
