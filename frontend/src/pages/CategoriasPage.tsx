import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { categoriasApi } from "../services/api";
import type { Categoria, CategoriaInput } from "../types";
import Modal from "../components/Modal";
import { useAuthStore } from "../shared/store/authStore";

type Tab = "activos" | "inactivos";

const PAGE_SIZE = 5;

export default function CategoriasPage() {
  const queryClient = useQueryClient();
  const canManage = useAuthStore((s) => s.hasRole(["ADMIN", "STOCK"]));

  const [searchParams, setSearchParams] = useSearchParams();
  const tab = (searchParams.get("tab") as Tab) ?? "activos";
  const currentPage = parseInt(searchParams.get("page") ?? "1", 10);
  const nombreFilter = searchParams.get("nombre") ?? "";

  // Búsqueda local (aplica al tipear, se guarda en URL al hacer submit o debounce)
  const [nombreInput, setNombreInput] = useState(nombreFilter);

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Categoria | null>(null);
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [parentId, setParentId] = useState<number | null>(null);
  const [error, setError] = useState("");

  // ── Queries ──────────────────────────────────────────────────────────────
  const { data: activosData, isLoading, isError } = useQuery({
    queryKey: ["categorias", "paginated", currentPage, nombreFilter],
    queryFn: () => categoriasApi.getPaginated(currentPage, PAGE_SIZE, nombreFilter || undefined),
    enabled: tab === "activos",
  });

  const { data: inactivosData, isLoading: isLoadingInactivos, isError: isErrorInactivos } = useQuery({
    queryKey: ["categorias", "inactivos", currentPage],
    queryFn: () => categoriasApi.getInactivos(currentPage, PAGE_SIZE),
    enabled: tab === "inactivos",
  });

  // Para el selector de categoría padre en el modal (todas las activas)
  const { data: todasCategorias } = useQuery({
    queryKey: ["categorias", "all"],
    queryFn: () => categoriasApi.getAll(),
  });

  // ── Mutations ────────────────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: (data: CategoriaInput) => categoriasApi.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["categorias"] }); closeModal(); },
    onError: (err: Error) => setError(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: CategoriaInput }) => categoriasApi.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["categorias"] }); closeModal(); },
    onError: (err: Error) => setError(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => categoriasApi.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["categorias"] }),
  });

  const reactivarMutation = useMutation({
    mutationFn: (id: number) => categoriasApi.reactivar(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["categorias"] }),
  });

  // ── Handlers ─────────────────────────────────────────────────────────────
  function setPage(updater: number | ((p: number) => number)) {
    const next = typeof updater === "function" ? updater(currentPage) : updater;
    setSearchParams((prev) => {
      const p = new URLSearchParams(prev);
      p.set("page", String(next));
      return p;
    });
  }

  function switchTab(t: Tab) {
    setSearchParams({ tab: t, page: "1" });
    setNombreInput("");
  }

  function applySearch(value: string) {
    setSearchParams((prev) => {
      const p = new URLSearchParams(prev);
      p.set("page", "1");
      if (value) p.set("nombre", value); else p.delete("nombre");
      return p;
    });
  }

  function handleSearchKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") applySearch(nombreInput);
  }

  function handleSearchChange(value: string) {
    setNombreInput(value);
    // búsqueda en tiempo real con pequeño delay visual
    applySearch(value);
  }

  function openCreate() {
    setEditing(null);
    setNombre("");
    setDescripcion("");
    setParentId(null);
    setError("");
    setModalOpen(true);
  }

  function openEdit(cat: Categoria) {
    setEditing(cat);
    setNombre(cat.nombre);
    setDescripcion(cat.descripcion ?? "");
    setParentId(cat.parent_id ?? null);
    setError("");
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditing(null);
    setError("");
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const payload: CategoriaInput = {
      nombre,
      descripcion: descripcion || undefined,
      parent_id: parentId ?? null,
    };
    if (editing) {
      updateMutation.mutate({ id: editing.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  }

  function handleDelete(id: number) {
    if (window.confirm("¿Eliminar esta categoría? Pasará a inactivos.")) {
      deleteMutation.mutate(id);
    }
  }

  function handleReactivar(cat: Categoria) {
    if (window.confirm(`¿Reactivar "${cat.nombre}"?`)) {
      reactivarMutation.mutate(cat.id);
    }
  }

  function handleExportar() {
    categoriasApi.exportar().catch(() => alert("Error al exportar"));
  }

  const isSaving = createMutation.isPending || updateMutation.isPending;
  const currentData = tab === "activos" ? activosData : inactivosData;
  const currentLoading = tab === "activos" ? isLoading : isLoadingInactivos;
  const currentError = tab === "activos" ? isError : isErrorInactivos;

  // Para mostrar el nombre del padre en la tabla
  const categoriaMap: Record<number, string> = {};
  if (todasCategorias) todasCategorias.forEach((c) => { categoriaMap[c.id] = c.nombre; });

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-warning-50 flex items-center justify-center text-xl">
            🏷️
          </div>
          <div>
            <h1 className="text-2xl font-bold text-surface-800">Categorías</h1>
            <p className="text-sm text-surface-400 mt-0.5">
              {currentData
                ? `${currentData.total} categoría${currentData.total !== 1 ? "s" : ""} ${tab === "activos" ? "activas" : "inactivas"}`
                : "Cargando..."}
            </p>
          </div>
        </div>
        {canManage && tab === "activos" && (
          <button
            onClick={openCreate}
            className="bg-warning-500 hover:bg-warning-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm shadow-warning-500/25 hover:shadow-md hover:shadow-warning-500/30 cursor-pointer flex items-center gap-2"
          >
            <span className="text-lg leading-none">+</span>
            Nueva Categoría
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-surface-100 p-1 rounded-xl w-fit">
        <button
          onClick={() => switchTab("activos")}
          className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
            tab === "activos"
              ? "bg-white text-warning-600 shadow-sm"
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

      {/* Barra de filtros (solo en activos) */}
      {tab === "activos" && (
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="relative w-56">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400 text-sm pointer-events-none">🔍</span>
            <input
              type="text"
              value={nombreInput}
              onChange={(e) => handleSearchChange(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              placeholder="Buscar por nombre..."
              className="w-full pl-9 pr-4 py-2.5 border border-surface-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-warning-500/30 focus:border-warning-500 transition bg-white"
            />
          </div>
          {nombreFilter && (
            <button
              onClick={() => { setNombreInput(""); applySearch(""); }}
              className="flex items-center gap-1.5 text-xs font-semibold text-brand-600 bg-brand-50 border border-brand-200 px-3 py-2.5 rounded-xl hover:bg-brand-100 transition cursor-pointer"
            >
              ✕ Limpiar filtros
            </button>
          )}

          <div className="flex-1" />

          {canManage && (
            <button
              onClick={handleExportar}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer"
            >
              ⬇ Exportar Excel
            </button>
          )}
        </div>
      )}

      {/* Loading / Error */}
      {currentLoading && (
        <div className="bg-white rounded-xl border border-surface-200 p-16 text-center">
          <div className="w-10 h-10 border-3 border-warning-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-surface-400 text-sm">Cargando categorías...</p>
        </div>
      )}
      {currentError && (
        <div className="bg-danger-50 border border-danger-100 rounded-xl p-6 text-center text-danger-600">
          Error al cargar las categorías
        </div>
      )}

      {/* Table */}
      {currentData && (
        <div className="bg-white rounded-xl border border-surface-200 overflow-hidden shadow-sm">
          <table className="w-full">
            <thead>
              <tr className="bg-surface-50 border-b border-surface-200">
                <th className="text-left px-6 py-3.5 text-xs font-bold text-surface-500 uppercase tracking-wider">ID</th>
                <th className="text-left px-6 py-3.5 text-xs font-bold text-surface-500 uppercase tracking-wider">Nombre</th>
                <th className="text-left px-6 py-3.5 text-xs font-bold text-surface-500 uppercase tracking-wider">Descripción</th>
                <th className="text-left px-6 py-3.5 text-xs font-bold text-surface-500 uppercase tracking-wider">Categoría Padre</th>
                <th className="text-center px-6 py-3.5 text-xs font-bold text-surface-500 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {currentData.items.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-16 text-surface-400">
                    <p className="text-3xl mb-2">🏷️</p>
                    <p className="font-medium">
                      {tab === "activos" ? "No hay categorías activas" : "No hay categorías inactivas"}
                    </p>
                    {tab === "activos" && (
                      <p className="text-xs mt-1">Creá la primera con el botón de arriba</p>
                    )}
                  </td>
                </tr>
              )}
              {currentData.items.map((cat, i) => (
                <tr
                  key={cat.id}
                  className={`border-b border-surface-100 last:border-0 ${
                    tab === "inactivos"
                      ? "bg-gray-50 opacity-75"
                      : i % 2 === 0
                      ? "bg-white hover:bg-surface-50/50"
                      : "bg-surface-50/30 hover:bg-surface-50"
                  }`}
                >
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-surface-100 text-xs font-bold text-surface-500">
                      {cat.id}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {tab === "inactivos" ? (
                      <span className="font-semibold text-sm text-surface-400 line-through">{cat.nombre}</span>
                    ) : (
                      <span className="font-semibold text-sm text-surface-800">{cat.nombre}</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-surface-500">
                    {cat.descripcion || <span className="italic text-surface-300">Sin descripción</span>}
                  </td>
                  <td className="px-6 py-4">
                    {cat.parent_id && categoriaMap[cat.parent_id] ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-warning-50 text-warning-700 text-xs font-semibold">
                        🏷️ {categoriaMap[cat.parent_id]}
                      </span>
                    ) : (
                      <span className="text-xs text-surface-300 italic">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center gap-2">
                      {tab === "activos" && canManage && (
                        <>
                          <button
                            onClick={() => openEdit(cat)}
                            className="p-2 rounded-lg bg-brand-50 text-brand-600 hover:bg-brand-100 transition-all text-xs font-semibold cursor-pointer"
                          >
                            ✏️ Editar
                          </button>
                          <button
                            onClick={() => handleDelete(cat.id)}
                            disabled={deleteMutation.isPending}
                            className="p-2 rounded-lg bg-danger-50 text-danger-600 hover:bg-danger-100 disabled:opacity-50 transition-all text-xs font-semibold cursor-pointer"
                          >
                            🗑️ Eliminar
                          </button>
                        </>
                      )}
                      {tab === "inactivos" && canManage && (
                        <button
                          onClick={() => handleReactivar(cat)}
                          disabled={reactivarMutation.isPending}
                          className="p-2 rounded-lg bg-success-50 text-success-700 hover:bg-success-100 disabled:opacity-50 transition-all text-xs font-semibold cursor-pointer"
                        >
                          ♻️ Reactivar
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Paginación */}
          <div className="px-6 py-3 bg-surface-50 border-t border-surface-200 flex items-center justify-between">
            <span className="text-xs text-surface-400">
              {currentData.total} resultado{currentData.total !== 1 && "s"} — página {currentData.page} de {currentData.pages || 1}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => p - 1)}
                disabled={currentPage <= 1}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-surface-200 hover:bg-surface-100 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
              >
                ← Anterior
              </button>
              {Array.from({ length: Math.min(currentData.pages, 5) }, (_, i) => {
                const p = i + 1;
                return (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`w-8 h-8 text-xs font-semibold rounded-lg transition cursor-pointer ${
                      p === currentPage
                        ? "bg-warning-500 text-white shadow-sm"
                        : "border border-surface-200 hover:bg-surface-100 text-surface-600"
                    }`}
                  >
                    {p}
                  </button>
                );
              })}
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={currentPage >= (currentData.pages || 1)}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-surface-200 hover:bg-surface-100 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
              >
                Siguiente →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal */}
      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editing ? "Editar Categoría" : "Nueva Categoría"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-danger-50 border border-danger-100 text-danger-600 text-sm px-4 py-3 rounded-xl flex items-center gap-2">
              <span>⚠️</span> {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-surface-700 mb-1.5">
              Nombre <span className="text-danger-500">*</span>
            </label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              required
              className="w-full border border-surface-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition bg-white"
              placeholder="Ej: Bebidas"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-surface-700 mb-1.5">
              Descripción
            </label>
            <input
              type="text"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              className="w-full border border-surface-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition bg-white"
              placeholder="Ej: Bebidas frías y calientes"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-surface-700 mb-1.5">
              Categoría Padre
            </label>
            <select
              value={parentId ?? ""}
              onChange={(e) => setParentId(e.target.value ? Number(e.target.value) : null)}
              className="w-full border border-surface-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition bg-white"
            >
              <option value="">Sin categoría padre (raíz)</option>
              {todasCategorias
                ?.filter((c) => c.id !== editing?.id)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
            </select>
            <p className="text-xs text-surface-400 mt-1">
              Opcional. Asignás esta categoría como subcategoría de otra.
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-surface-100">
            <button
              type="button"
              onClick={closeModal}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-surface-600 hover:bg-surface-100 transition cursor-pointer border border-surface-200"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white px-6 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm shadow-brand-500/25 cursor-pointer"
            >
              {isSaving ? "Guardando..." : editing ? "Actualizar" : "Crear Categoría"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
