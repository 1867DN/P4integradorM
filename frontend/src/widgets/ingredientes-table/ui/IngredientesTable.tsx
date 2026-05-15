import type { Ingrediente, PaginatedIngredientes } from "../../../entities/ingrediente/model";

interface IngredientesTableProps {
  data: PaginatedIngredientes;
  onEdit: (ing: Ingrediente) => void;
  onDelete: (ing: Ingrediente) => void;
  onPageChange: (page: number) => void;
  isDeleting: boolean;
}

export default function IngredientesTable({
  data,
  onEdit,
  onDelete,
  onPageChange,
  isDeleting,
}: IngredientesTableProps) {
  const { items, total, page, size, pages } = data;

  return (
    <div className="bg-white rounded-xl border border-surface-200 overflow-hidden shadow-sm">
      <table className="w-full">
        <thead>
          <tr className="bg-surface-50 border-b border-surface-200">
            <th className="text-left px-6 py-3.5 text-xs font-bold text-surface-500 uppercase tracking-wider">ID</th>
            <th className="text-left px-6 py-3.5 text-xs font-bold text-surface-500 uppercase tracking-wider">Nombre</th>
            <th className="text-left px-6 py-3.5 text-xs font-bold text-surface-500 uppercase tracking-wider">Descripción</th>
            <th className="text-left px-6 py-3.5 text-xs font-bold text-surface-500 uppercase tracking-wider">Unidad</th>
            <th className="text-center px-6 py-3.5 text-xs font-bold text-surface-500 uppercase tracking-wider">Alérgeno</th>
            <th className="text-center px-6 py-3.5 text-xs font-bold text-surface-500 uppercase tracking-wider">Estado</th>
            <th className="text-center px-6 py-3.5 text-xs font-bold text-surface-500 uppercase tracking-wider">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {items.length === 0 && (
            <tr>
              <td colSpan={7} className="text-center py-16 text-surface-400">
                <p className="text-3xl mb-2">🧂</p>
                <p className="font-medium">No se encontraron ingredientes</p>
                <p className="text-xs mt-1">Probá con otros filtros o creá uno nuevo</p>
              </td>
            </tr>
          )}
          {items.map((ing, i) => {
            const isDeleted = !!ing.deleted_at;
            return (
              <tr
                key={ing.id}
                className={`border-b border-surface-100 last:border-0 transition-colors ${
                  isDeleted
                    ? "bg-gray-50 opacity-60"
                    : i % 2 === 0
                    ? "bg-white hover:bg-surface-50/50"
                    : "bg-surface-50/30 hover:bg-surface-50"
                }`}
              >
                <td className="px-6 py-4">
                  <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-surface-100 text-xs font-bold text-surface-500">
                    {ing.id}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className={`font-semibold text-sm ${isDeleted ? "line-through text-surface-400" : "text-surface-800"}`}>
                    {ing.nombre}
                  </span>
                </td>
                <td className="px-6 py-4 max-w-[180px]">
                  <span className="text-xs text-surface-500 truncate block">
                    {ing.descripcion || <em className="text-surface-300">—</em>}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className="inline-flex items-center gap-1.5 bg-purple-50 text-purple-700 px-3 py-1 rounded-lg text-xs font-bold">
                    📏 {ing.unidad_medida}
                  </span>
                </td>
                <td className="px-6 py-4 text-center">
                  {ing.es_alergeno ? (
                    <span className="inline-flex items-center gap-1 bg-orange-50 text-orange-600 border border-orange-200 px-2.5 py-1 rounded-full text-xs font-bold">
                      ⚠️ Alérgeno
                    </span>
                  ) : (
                    <span className="text-surface-300 text-xs">—</span>
                  )}
                </td>
                <td className="px-6 py-4 text-center">
                  {isDeleted ? (
                    <span className="inline-flex items-center gap-1 bg-red-50 text-red-500 border border-red-100 px-2.5 py-1 rounded-full text-xs font-bold">
                      🗑 Eliminado
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 bg-green-50 text-green-600 border border-green-100 px-2.5 py-1 rounded-full text-xs font-bold">
                      ✓ Activo
                    </span>
                  )}
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center justify-center gap-2">
                    {!isDeleted && (
                      <>
                        <button
                          onClick={() => onEdit(ing)}
                          className="p-2 rounded-lg bg-brand-50 text-brand-600 hover:bg-brand-100 transition-all text-xs font-semibold cursor-pointer"
                        >
                          ✏️ Editar
                        </button>
                        <button
                          onClick={() => onDelete(ing)}
                          disabled={isDeleting}
                          className="p-2 rounded-lg bg-danger-50 text-danger-600 hover:bg-danger-100 disabled:opacity-50 transition-all text-xs font-semibold cursor-pointer"
                        >
                          🗑️ Eliminar
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Footer: info + paginación */}
      <div className="px-6 py-3 bg-surface-50 border-t border-surface-200 flex items-center justify-between">
        <span className="text-xs text-surface-400">
          {total} resultado{total !== 1 && "s"} — página {page} de {pages || 1}
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-surface-200 hover:bg-surface-100 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
          >
            ← Anterior
          </button>
          {Array.from({ length: Math.min(pages, 5) }, (_, i) => {
            const p = i + 1;
            return (
              <button
                key={p}
                onClick={() => onPageChange(p)}
                className={`w-8 h-8 text-xs font-semibold rounded-lg transition cursor-pointer ${
                  p === page
                    ? "bg-brand-500 text-white shadow-sm"
                    : "border border-surface-200 hover:bg-surface-100 text-surface-600"
                }`}
              >
                {p}
              </button>
            );
          })}
          <button
            onClick={() => onPageChange(page + 1)}
            disabled={page >= pages}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-surface-200 hover:bg-surface-100 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
          >
            Siguiente →
          </button>
        </div>
      </div>
    </div>
  );
}
