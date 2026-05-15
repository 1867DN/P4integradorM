import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { ingredienteApi } from "../entities/ingrediente/api";
import type { Ingrediente, IngredienteCreate, IngredienteFilters, ImportarResult } from "../entities/ingrediente/model";
import FilterBar from "../features/ingredientes-filter/ui/FilterBar";
import IngredienteModal from "../features/ingredientes-crud/ui/IngredienteModal";
import IngredientesTable from "../widgets/ingredientes-table/ui/IngredientesTable";
import Modal from "../components/Modal";
import { useAuthStore } from "../shared/store/authStore";

type Tab = "activos" | "inactivos";

const PAGE_SIZE = 5;

export default function IngredientesPage() {
  const queryClient = useQueryClient();
  const canManage = useAuthStore((s) => s.hasRole(["ADMIN", "STOCK"]));

  // Estado en URL: ?tab=activos&page=2&nombre=harina&es_alergeno=true
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = (searchParams.get("tab") as Tab) ?? "activos";
  const pageParam = parseInt(searchParams.get("page") ?? "1", 10);
  const nombreParam = searchParams.get("nombre") ?? "";
  const esAlergenoRaw = searchParams.get("es_alergeno");
  const esAlergeno: boolean | undefined =
    esAlergenoRaw === "true" ? true : esAlergenoRaw === "false" ? false : undefined;

  // Valor del input de búsqueda (local, solo para el controlled input)
  const [nombreInput, setNombreInput] = useState(nombreParam);

  // Filtros derivados de la URL
  const filters: IngredienteFilters = {
    page: pageParam,
    size: PAGE_SIZE,
    nombre: nombreParam || undefined,
    es_alergeno: esAlergeno,
  };

  // Modal CRUD
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Ingrediente | null>(null);
  const [modalError, setModalError] = useState("");

  // Export / Import
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportarResult | null>(null);

  // ── Queries ────────────────────────────────────────────────────────────────
  const { data, isLoading, isError } = useQuery({
    queryKey: ["ingredientes", filters],
    queryFn: () => ingredienteApi.getAll(filters),
    enabled: tab === "activos",
  });

  const { data: inactivosData, isLoading: isLoadingInactivos, isError: isErrorInactivos } = useQuery({
    queryKey: ["ingredientes", "inactivos", pageParam],
    queryFn: () => ingredienteApi.getInactivos(pageParam, PAGE_SIZE),
    enabled: tab === "inactivos",
  });

  // ── Mutations ──────────────────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: (payload: IngredienteCreate) => ingredienteApi.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ingredientes"] });
      closeModal();
    },
    onError: (err: Error) => setModalError(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: IngredienteCreate }) =>
      ingredienteApi.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ingredientes"] });
      closeModal();
    },
    onError: (err: Error) => setModalError(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => ingredienteApi.softDelete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["ingredientes"] }),
  });

  const reactivarMutation = useMutation({
    mutationFn: (id: number) => ingredienteApi.reactivar(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["ingredientes"] }),
  });

  // ── Helpers de URL ─────────────────────────────────────────────────────────
  function setPage(p: number) {
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev);
      params.set("page", String(p));
      return params;
    });
  }

  function switchTab(t: Tab) {
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev);
      params.set("tab", t);
      params.set("page", "1");
      return params;
    });
  }

  // ── Handlers ───────────────────────────────────────────────────────────────
  function openCreate() {
    setEditing(null);
    setModalError("");
    setModalOpen(true);
  }

  function openEdit(ing: Ingrediente) {
    setEditing(ing);
    setModalError("");
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditing(null);
    setModalError("");
  }

  function handleSubmit(payload: IngredienteCreate) {
    setModalError("");
    if (editing) {
      updateMutation.mutate({ id: editing.id, payload });
    } else {
      createMutation.mutate(payload);
    }
  }

  function handleDelete(ing: Ingrediente) {
    if (window.confirm(`¿Eliminar "${ing.nombre}"? Pasará a inactivos.`)) {
      deleteMutation.mutate(ing.id);
    }
  }

  function handleReactivar(ing: Ingrediente) {
    if (window.confirm(`¿Reactivar "${ing.nombre}"?`)) {
      reactivarMutation.mutate(ing.id);
    }
  }

  function handleNombreChange(v: string) {
    setNombreInput(v);
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev);
      params.set("page", "1");
      if (v) params.set("nombre", v);
      else params.delete("nombre");
      return params;
    });
  }

  function handleEsAlergenoChange(v: boolean | undefined) {
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev);
      params.set("page", "1");
      if (v === undefined) params.delete("es_alergeno");
      else params.set("es_alergeno", String(v));
      return params;
    });
  }

  function handleResetFilters() {
    setNombreInput("");
    setSearchParams({ tab: "activos", page: "1" });
  }

  async function handleExport() {
    setIsExporting(true);
    try {
      await ingredienteApi.exportToExcel();
    } finally {
      setIsExporting(false);
    }
  }

  async function handleImport(file: File) {
    setIsImporting(true);
    try {
      const result = await ingredienteApi.importarExcel(file);
      setImportResult(result);
      queryClient.invalidateQueries({ queryKey: ["ingredientes"] });
    } catch (err) {
      setImportResult({ creados: 0, omitidos: 0, errores: [{ fila: 0, nombre: "", motivo: err instanceof Error ? err.message : "Error inesperado" }] });
    } finally {
      setIsImporting(false);
    }
  }

  async function handleDescargarPlantilla() {
    await ingredienteApi.descargarPlantilla();
  }

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-success-50 flex items-center justify-center text-xl">
            🧂
          </div>
          <div>
            <h1 className="text-2xl font-bold text-surface-800">Ingredientes</h1>
            <p className="text-sm text-surface-400 mt-0.5">
              {tab === "activos"
                ? data
                  ? `${data.total} ingrediente${data.total !== 1 ? "s" : ""} activos`
                  : "Cargando..."
                : inactivosData
                ? `${inactivosData.total} ingrediente${inactivosData.total !== 1 ? "s" : ""} inactivos`
                : "Cargando..."}
            </p>
          </div>
        </div>
        {tab === "activos" && (
          <button
            onClick={openCreate}
            className="bg-success-500 hover:bg-success-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm cursor-pointer flex items-center gap-2"
          >
            <span className="text-lg leading-none">+</span>
            Nuevo Ingrediente
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 bg-surface-100 p-1 rounded-xl w-fit">
        <button
          onClick={() => switchTab("activos")}
          className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
            tab === "activos"
              ? "bg-white text-success-700 shadow-sm"
              : "text-surface-500 hover:text-surface-700"
          }`}
        >
          ✓ Activos
        </button>
        <button
          onClick={() => switchTab("inactivos")}
          className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
            tab === "inactivos"
              ? "bg-white text-danger-600 shadow-sm"
              : "text-surface-500 hover:text-surface-700"
          }`}
        >
          🗑 Inactivos
          {inactivosData && inactivosData.total > 0 && (
            <span className="ml-1.5 bg-danger-100 text-danger-600 text-xs px-1.5 py-0.5 rounded-full font-bold">
              {inactivosData.total}
            </span>
          )}
        </button>
      </div>

      {/* ── Tab: Activos ── */}
      {tab === "activos" && (
        <>
          <FilterBar
            nombre={nombreInput}
            esAlergeno={filters.es_alergeno}
            onNombreChange={handleNombreChange}
            onEsAlergenoChange={handleEsAlergenoChange}
            onReset={handleResetFilters}
            onExport={handleExport}
            isExporting={isExporting}
            canManage={canManage}
            onImport={handleImport}
            isImporting={isImporting}
            onDescargarPlantilla={handleDescargarPlantilla}
          />

          {isLoading && (
            <div className="bg-white rounded-xl border border-surface-200 p-16 text-center">
              <div className="w-10 h-10 border-3 border-success-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-surface-400 text-sm">Cargando ingredientes...</p>
            </div>
          )}
          {isError && (
            <div className="bg-danger-50 border border-danger-100 rounded-xl p-6 text-center text-danger-600">
              Error al cargar los ingredientes
            </div>
          )}

          {data && (
            <IngredientesTable
              data={data}
              onEdit={openEdit}
              onDelete={handleDelete}
              onPageChange={setPage}
              isDeleting={deleteMutation.isPending}
            />
          )}
        </>
      )}

      {/* ── Tab: Inactivos ── */}
      {tab === "inactivos" && (
        <>
          {isLoadingInactivos && (
            <div className="bg-white rounded-xl border border-surface-200 p-16 text-center">
              <div className="w-10 h-10 border-3 border-danger-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-surface-400 text-sm">Cargando ingredientes inactivos...</p>
            </div>
          )}
          {isErrorInactivos && (
            <div className="bg-danger-50 border border-danger-100 rounded-xl p-6 text-center text-danger-600">
              Error al cargar los ingredientes inactivos
            </div>
          )}

          {inactivosData && (
            <div className="bg-white rounded-xl border border-surface-200 overflow-hidden shadow-sm">
              <table className="w-full">
                <thead>
                  <tr className="bg-surface-50 border-b border-surface-200">
                    <th className="text-left px-6 py-3.5 text-xs font-bold text-surface-500 uppercase tracking-wider">ID</th>
                    <th className="text-left px-6 py-3.5 text-xs font-bold text-surface-500 uppercase tracking-wider">Nombre</th>
                    <th className="text-left px-6 py-3.5 text-xs font-bold text-surface-500 uppercase tracking-wider">Descripción</th>
                    <th className="text-left px-6 py-3.5 text-xs font-bold text-surface-500 uppercase tracking-wider">Unidad</th>
                    <th className="text-center px-6 py-3.5 text-xs font-bold text-surface-500 uppercase tracking-wider">Alérgeno</th>
                    <th className="text-center px-6 py-3.5 text-xs font-bold text-surface-500 uppercase tracking-wider">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {inactivosData.items.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center py-16 text-surface-400">
                        <p className="text-3xl mb-2">✨</p>
                        <p className="font-medium">No hay ingredientes inactivos</p>
                      </td>
                    </tr>
                  )}
                  {inactivosData.items.map((ing, i) => (
                    <tr
                      key={ing.id}
                      className={`border-b border-surface-100 last:border-0 bg-gray-50 opacity-80 ${i % 2 === 0 ? "" : "bg-gray-100/50"}`}
                    >
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-surface-100 text-xs font-bold text-surface-400">
                          {ing.id}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-semibold text-sm text-surface-400 line-through">
                          {ing.nombre}
                        </span>
                      </td>
                      <td className="px-6 py-4 max-w-[180px]">
                        <span className="text-xs text-surface-400 truncate block">
                          {ing.descripcion || <em className="text-surface-300">—</em>}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1.5 bg-surface-100 text-surface-500 px-3 py-1 rounded-lg text-xs font-bold">
                          📏 {ing.unidad_medida}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {ing.es_alergeno ? (
                          <span className="inline-flex items-center gap-1 bg-orange-50 text-orange-500 border border-orange-200 px-2.5 py-1 rounded-full text-xs font-bold opacity-75">
                            ⚠️ Alérgeno
                          </span>
                        ) : (
                          <span className="text-surface-300 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => handleReactivar(ing)}
                          disabled={reactivarMutation.isPending}
                          className="p-2 rounded-lg bg-success-50 text-success-700 hover:bg-success-100 disabled:opacity-50 transition-all text-xs font-semibold cursor-pointer"
                        >
                          ♻️ Reactivar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Paginación inactivos */}
              <div className="px-6 py-3 bg-surface-50 border-t border-surface-200 flex items-center justify-between">
                <span className="text-xs text-surface-400">
                  {inactivosData.total} resultado{inactivosData.total !== 1 && "s"} — página {inactivosData.page} de {inactivosData.pages || 1}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPage(pageParam - 1)}
                    disabled={pageParam <= 1}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-surface-200 hover:bg-surface-100 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
                  >
                    ← Anterior
                  </button>
                  {Array.from({ length: Math.min(inactivosData.pages, 5) }, (_, idx) => {
                    const p = idx + 1;
                    return (
                      <button
                        key={p}
                        onClick={() => setPage(p)}
                        className={`w-8 h-8 text-xs font-semibold rounded-lg transition cursor-pointer ${
                          p === pageParam
                            ? "bg-danger-500 text-white shadow-sm"
                            : "border border-surface-200 hover:bg-surface-100 text-surface-600"
                        }`}
                      >
                        {p}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => setPage(pageParam + 1)}
                    disabled={pageParam >= (inactivosData.pages || 1)}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-surface-200 hover:bg-surface-100 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
                  >
                    Siguiente →
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Modal resultado importación */}
      <Modal
        open={importResult !== null}
        onClose={() => setImportResult(null)}
        title="Resultado de importación"
      >
        {importResult && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-success-50 border border-success-100 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-success-700">{importResult.creados}</p>
                <p className="text-xs text-success-600 font-semibold mt-1">Creados</p>
              </div>
              <div className="bg-warning-50 border border-warning-100 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-warning-700">{importResult.omitidos}</p>
                <p className="text-xs text-warning-600 font-semibold mt-1">Omitidos (ya existen)</p>
              </div>
              <div className="bg-danger-50 border border-danger-100 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-danger-700">{importResult.errores.length}</p>
                <p className="text-xs text-danger-600 font-semibold mt-1">Con error</p>
              </div>
            </div>

            {importResult.errores.length > 0 && (
              <div>
                <p className="text-sm font-semibold text-surface-700 mb-2">Detalle de errores:</p>
                <div className="bg-surface-50 rounded-xl border border-surface-200 overflow-hidden max-h-48 overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-surface-100 border-b border-surface-200">
                        <th className="text-left px-3 py-2 font-bold text-surface-500">Fila</th>
                        <th className="text-left px-3 py-2 font-bold text-surface-500">Nombre</th>
                        <th className="text-left px-3 py-2 font-bold text-surface-500">Motivo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {importResult.errores.map((e, i) => (
                        <tr key={i} className="border-b border-surface-100 last:border-0">
                          <td className="px-3 py-2 text-surface-500">{e.fila}</td>
                          <td className="px-3 py-2 font-semibold text-surface-700">{e.nombre || "—"}</td>
                          <td className="px-3 py-2 text-danger-600">{e.motivo}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {importResult.creados > 0 && importResult.errores.length === 0 && (
              <p className="text-sm text-success-600 font-semibold text-center">
                ✓ Todos los ingredientes se importaron correctamente
              </p>
            )}

            <div className="flex justify-end pt-2 border-t border-surface-100">
              <button
                onClick={() => setImportResult(null)}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-brand-500 text-white hover:bg-brand-600 transition cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal CRUD */}
      <IngredienteModal
        open={modalOpen}
        editing={editing}
        onClose={closeModal}
        onSubmit={handleSubmit}
        isSaving={isSaving}
        error={modalError}
      />
    </div>
  );
}
