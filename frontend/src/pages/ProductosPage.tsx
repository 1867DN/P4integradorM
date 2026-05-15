import { useState } from "react";
import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import { productosApi, categoriasApi, ingredientesApi } from "../services/api";
import type {
  ProductoListItem,
  ProductoCreate,
  ProductoUpdate,
} from "../types";
import Modal from "../components/Modal";
import { useAuthStore } from "../shared/store/authStore";

type Tab = "activos" | "inactivos";

const PAGE_SIZE = 5;

export default function ProductosPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const canManage = useAuthStore((s) => s.hasRole(["ADMIN", "STOCK"]));

  // Estado en URL: ?tab=activos&page=2&nombre=...
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = (searchParams.get("tab") as Tab) ?? "activos";
  const currentPage = parseInt(searchParams.get("page") ?? "1", 10);
  const nombreParam = searchParams.get("nombre") ?? "";
  const [nombreInput, setNombreInput] = useState(nombreParam);

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [precio, setPrecio] = useState("");
  const [selectedCategorias, setSelectedCategorias] = useState<number[]>([]);
  const [selectedIngredientes, setSelectedIngredientes] = useState<
    { ingrediente_id: number; cantidad: string }[]
  >([]);
  const [error, setError] = useState("");

  // ── Queries ────────────────────────────────────────────────────────────────
  const {
    data: productosData,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["productos", "activos", currentPage, nombreParam],
    queryFn: () => productosApi.getAll(currentPage, PAGE_SIZE, { solo_disponibles: false, nombre: nombreParam || undefined }),
    enabled: tab === "activos",
  });

  const {
    data: inactivosData,
    isLoading: isLoadingInactivos,
    isError: isErrorInactivos,
  } = useQuery({
    queryKey: ["productos", "inactivos", currentPage],
    queryFn: () => productosApi.getInactivos(currentPage, PAGE_SIZE),
    enabled: tab === "inactivos",
  });

  const { data: categorias } = useQuery({
    queryKey: ["categorias"],
    queryFn: categoriasApi.getAll,
  });

  const { data: ingredientes } = useQuery({
    queryKey: ["ingredientes-select"],
    queryFn: ingredientesApi.getAll,
  });

  // ── Mutations ──────────────────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: (data: ProductoCreate) => productosApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["productos"] });
      closeModal();
    },
    onError: (err: Error) => setError(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: ProductoUpdate }) =>
      productosApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["productos"] });
      closeModal();
    },
    onError: (err: Error) => setError(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => productosApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["productos"] });
    },
  });

  const reactivarMutation = useMutation({
    mutationFn: (id: number) => productosApi.reactivar(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["productos"] });
    },
  });

  // ── Handlers ───────────────────────────────────────────────────────────────
  function handleNombreChange(value: string) {
    setNombreInput(value);
    setSearchParams((prev) => {
      const p = new URLSearchParams(prev);
      p.set("page", "1");
      if (value) p.set("nombre", value); else p.delete("nombre");
      return p;
    });
  }

  function switchTab(t: Tab) {
    setNombreInput("");
    setSearchParams({ tab: t, page: "1" });
  }

  function setCurrentPage(updater: number | ((p: number) => number)) {
    const next = typeof updater === "function" ? updater(currentPage) : updater;
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev);
      params.set("page", String(next));
      return params;
    });
  }

  function openCreate() {
    setEditingId(null);
    setNombre("");
    setDescripcion("");
    setPrecio("");
    setSelectedCategorias([]);
    setSelectedIngredientes([]);
    setError("");
    setModalOpen(true);
  }

  function openEdit(prod: ProductoListItem) {
    setEditingId(prod.id);
    setNombre(prod.nombre);
    setDescripcion(prod.descripcion ?? "");
    setPrecio(String(prod.precio));
    setSelectedCategorias([]);
    setSelectedIngredientes([]);
    setError("");
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingId(null);
    setError("");
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    if (editingId) {
      updateMutation.mutate({ id: editingId, data: { nombre, descripcion: descripcion || undefined, precio: Number(precio) } });
    } else {
      createMutation.mutate({
        nombre,
        descripcion: descripcion || undefined,
        precio: Number(precio),
        categoria_ids: selectedCategorias,
        ingredientes: selectedIngredientes
          .filter((i) => i.ingrediente_id > 0 && Number(i.cantidad) > 0)
          .map((i) => ({ ingrediente_id: i.ingrediente_id, cantidad: Number(i.cantidad) })),
      });
    }
  }

  function handleDelete(id: number) {
    if (window.confirm("¿Estás seguro de eliminar este producto? Pasará a inactivos.")) {
      deleteMutation.mutate(id);
    }
  }

  function handleReactivar(prod: ProductoListItem) {
    if (window.confirm(`¿Reactivar "${prod.nombre}"?`)) {
      reactivarMutation.mutate(prod.id);
    }
  }

  function addIngrediente() {
    setSelectedIngredientes((prev) => [...prev, { ingrediente_id: 0, cantidad: "" }]);
  }

  function removeIngrediente(index: number) {
    setSelectedIngredientes((prev) => prev.filter((_, i) => i !== index));
  }

  function updateIngredienteId(index: number, value: number) {
    setSelectedIngredientes((prev) =>
      prev.map((item, i) => (i === index ? { ...item, ingrediente_id: value } : item))
    );
  }

  function updateIngredienteCantidad(index: number, value: string) {
    if (value === "" || /^\d*\.?\d*$/.test(value)) {
      setSelectedIngredientes((prev) =>
        prev.map((item, i) => (i === index ? { ...item, cantidad: value } : item))
      );
    }
  }

  function toggleCategoria(id: number) {
    setSelectedCategorias((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  }

  const isSaving = createMutation.isPending || updateMutation.isPending;
  const currentData = tab === "activos" ? productosData : inactivosData;
  const currentLoading = tab === "activos" ? isLoading : isLoadingInactivos;
  const currentError = tab === "activos" ? isError : isErrorInactivos;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-brand-50 flex items-center justify-center text-xl">
            📦
          </div>
          <div>
            <h1 className="text-2xl font-bold text-surface-800">Productos</h1>
            <p className="text-sm text-surface-400 mt-0.5">
              {currentData
                ? `${currentData.total} producto${currentData.total !== 1 ? "s" : ""} ${tab === "activos" ? "activos" : "inactivos"}`
                : "Cargando..."}
            </p>
          </div>
        </div>
        {canManage && tab === "activos" && (
          <button
            onClick={openCreate}
            className="bg-brand-500 hover:bg-brand-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm shadow-brand-500/25 hover:shadow-md hover:shadow-brand-500/30 cursor-pointer flex items-center gap-2"
          >
            <span className="text-lg leading-none">+</span>
            Nuevo Producto
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 bg-surface-100 p-1 rounded-xl w-fit">
        <button
          onClick={() => switchTab("activos")}
          className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
            tab === "activos"
              ? "bg-white text-brand-600 shadow-sm"
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
              onChange={(e) => handleNombreChange(e.target.value)}
              placeholder="Buscar por nombre..."
              className="w-full pl-9 pr-4 py-2.5 border border-surface-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition bg-white"
            />
          </div>
          {nombreParam && (
            <button
              onClick={() => handleNombreChange("")}
              className="flex items-center gap-1.5 text-xs font-semibold text-brand-600 bg-brand-50 border border-brand-200 px-3 py-2.5 rounded-xl hover:bg-brand-100 transition cursor-pointer"
            >
              ✕ Limpiar filtros
            </button>
          )}
          <div className="flex-1" />
          {canManage && (
            <button
              onClick={() => productosApi.exportar().catch(() => alert("Error al exportar"))}
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
          <div className="w-10 h-10 border-3 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-surface-400 text-sm">Cargando productos...</p>
        </div>
      )}
      {currentError && (
        <div className="bg-danger-50 border border-danger-100 rounded-xl p-6 text-center text-danger-600">
          Error al cargar los productos
        </div>
      )}

      {/* Table */}
      {currentData && (
        <div className="bg-white rounded-xl border border-surface-200 overflow-hidden shadow-sm">
          <table className="w-full">
            <thead>
              <tr className="bg-surface-50 border-b border-surface-200">
                <th className="text-left px-6 py-3.5 text-xs font-bold text-surface-500 uppercase tracking-wider">ID</th>
                <th className="text-left px-6 py-3.5 text-xs font-bold text-surface-500 uppercase tracking-wider">Producto</th>
                <th className="text-left px-6 py-3.5 text-xs font-bold text-surface-500 uppercase tracking-wider">Descripción</th>
                <th className="text-right px-6 py-3.5 text-xs font-bold text-surface-500 uppercase tracking-wider">Precio</th>
                <th className="text-center px-6 py-3.5 text-xs font-bold text-surface-500 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {currentData.items.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-16 text-surface-400">
                    <p className="text-3xl mb-2">📦</p>
                    <p className="font-medium">
                      {tab === "activos" ? "No hay productos activos" : "No hay productos inactivos"}
                    </p>
                    {tab === "activos" && (
                      <p className="text-xs mt-1">Creá el primero con el botón de arriba</p>
                    )}
                  </td>
                </tr>
              )}
              {currentData.items.map((prod, i) => (
                <tr
                  key={prod.id}
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
                      {prod.id}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {tab === "activos" ? (
                      <button
                        onClick={() => navigate(`/productos/${prod.id}`)}
                        className="font-semibold text-sm text-brand-600 hover:text-brand-800 transition-colors cursor-pointer hover:underline underline-offset-2"
                      >
                        {prod.nombre}
                      </button>
                    ) : (
                      <span className="font-semibold text-sm text-surface-400 line-through">
                        {prod.nombre}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-surface-500">
                    {prod.descripcion || <span className="italic text-surface-300">Sin descripción</span>}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className={`inline-flex items-center px-3 py-1 rounded-lg text-sm font-bold ${
                      tab === "inactivos"
                        ? "bg-surface-100 text-surface-400"
                        : "bg-success-50 text-success-700"
                    }`}>
                      ${Number(prod.precio).toLocaleString("es-AR")}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center gap-2">
                      {tab === "activos" && (
                        <>
                          <button
                            onClick={() => navigate(`/productos/${prod.id}`)}
                            className="p-2 rounded-lg bg-purple-50 text-purple-600 hover:bg-purple-100 transition-all text-xs font-semibold cursor-pointer"
                          >
                            👁️ Ver
                          </button>
                          {canManage && (
                            <button
                              onClick={() => openEdit(prod)}
                              className="p-2 rounded-lg bg-brand-50 text-brand-600 hover:bg-brand-100 transition-all text-xs font-semibold cursor-pointer"
                            >
                              ✏️ Editar
                            </button>
                          )}
                          {canManage && (
                            <button
                              onClick={() => handleDelete(prod.id)}
                              disabled={deleteMutation.isPending}
                              className="p-2 rounded-lg bg-danger-50 text-danger-600 hover:bg-danger-100 disabled:opacity-50 transition-all text-xs font-semibold cursor-pointer"
                            >
                              🗑️
                            </button>
                          )}
                        </>
                      )}
                      {tab === "inactivos" && canManage && (
                        <button
                          onClick={() => handleReactivar(prod)}
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

          {/* Footer con paginación */}
          <div className="px-6 py-3 bg-surface-50 border-t border-surface-200 flex items-center justify-between">
            <span className="text-xs text-surface-400">
              {currentData.total} resultado{currentData.total !== 1 && "s"} — página {currentData.page} de {currentData.pages || 1}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage((p) => p - 1)}
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
                    onClick={() => setCurrentPage(p)}
                    className={`w-8 h-8 text-xs font-semibold rounded-lg transition cursor-pointer ${
                      p === currentPage
                        ? "bg-brand-500 text-white shadow-sm"
                        : "border border-surface-200 hover:bg-surface-100 text-surface-600"
                    }`}
                  >
                    {p}
                  </button>
                );
              })}
              <button
                onClick={() => setCurrentPage((p) => p + 1)}
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
        title={editingId ? "Editar Producto" : "Nuevo Producto"}
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="bg-danger-50 border border-danger-100 text-danger-700 text-sm px-4 py-3 rounded-xl">
              <div className="flex items-start gap-2">
                <span className="mt-0.5 shrink-0">⚠️</span>
                <ul className="space-y-1">
                  {error.split("\n").map((msg, i) => (
                    <li key={i}>{msg}</li>
                  ))}
                </ul>
              </div>
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
              placeholder="Ej: Pan artesanal"
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
              placeholder="Ej: Pan de masa madre"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-surface-700 mb-1.5">
              Precio <span className="text-danger-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-surface-400 text-sm font-medium">$</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={precio}
                onChange={(e) => setPrecio(e.target.value)}
                required
                className="w-full border border-surface-300 rounded-xl pl-8 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition bg-white"
                placeholder="500"
              />
            </div>
          </div>

          {/* Categorías (solo creación) */}
          {!editingId && categorias && categorias.length > 0 && (
            <div>
              <label className="block text-sm font-semibold text-surface-700 mb-2">
                Categorías
              </label>
              <div className="flex flex-wrap gap-2">
                {categorias.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => toggleCategoria(cat.id)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer border ${
                      selectedCategorias.includes(cat.id)
                        ? "bg-brand-500 text-white border-brand-500 shadow-sm shadow-brand-500/25"
                        : "bg-white text-surface-600 border-surface-300 hover:border-brand-400 hover:text-brand-600"
                    }`}
                  >
                    {selectedCategorias.includes(cat.id) && "✓ "}
                    {cat.nombre}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Ingredientes (solo creación) */}
          {!editingId && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-semibold text-surface-700">Ingredientes</label>
                <button
                  type="button"
                  onClick={addIngrediente}
                  className="text-brand-600 hover:text-brand-800 text-xs font-bold cursor-pointer flex items-center gap-1 bg-brand-50 px-3 py-1.5 rounded-lg hover:bg-brand-100 transition"
                >
                  + Agregar
                </button>
              </div>
              {selectedIngredientes.length === 0 && (
                <div className="bg-surface-50 rounded-xl p-4 text-center border border-dashed border-surface-300">
                  <p className="text-xs text-surface-400">Sin ingredientes seleccionados</p>
                </div>
              )}
              <div className="space-y-2">
                {selectedIngredientes.map((item, index) => (
                  <div
                    key={index}
                    className="flex gap-2 items-center bg-surface-50 rounded-xl p-2 border border-surface-200"
                  >
                    <select
                      value={item.ingrediente_id}
                      onChange={(e) => updateIngredienteId(index, Number(e.target.value))}
                      className="flex-1 min-w-0 border border-surface-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 transition bg-white"
                    >
                      <option value={0}>{ingredientes ? "Seleccionar..." : "Cargando..."}</option>
                      {ingredientes
                        ?.filter(
                          (ing) =>
                            !selectedIngredientes.some(
                              (s, si) => si !== index && s.ingrediente_id === ing.id
                            )
                        )
                        .map((ing) => (
                          <option key={ing.id} value={ing.id}>
                            {ing.nombre} ({ing.unidad_medida})
                          </option>
                        ))}
                    </select>
                    <input
                      type="text"
                      inputMode="decimal"
                      placeholder="Cant."
                      value={item.cantidad}
                      onChange={(e) => updateIngredienteCantidad(index, e.target.value)}
                      className="w-20 shrink-0 border border-surface-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 transition bg-white"
                    />
                    <button
                      type="button"
                      onClick={() => removeIngrediente(index)}
                      className="w-8 h-8 shrink-0 rounded-lg bg-danger-50 text-danger-500 hover:bg-danger-100 flex items-center justify-center transition cursor-pointer text-sm"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {editingId && (
            <div className="bg-warning-50 border border-warning-100 text-warning-600 text-xs px-4 py-3 rounded-xl flex items-center gap-2">
              <span>ℹ️</span> La edición solo actualiza nombre, descripción y precio.
            </div>
          )}

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
              {isSaving ? "Guardando..." : editingId ? "Actualizar" : "Crear Producto"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
