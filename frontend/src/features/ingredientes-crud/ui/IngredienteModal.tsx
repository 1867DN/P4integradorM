import { useState, useEffect, type FormEvent } from "react";
import Modal from "../../../components/Modal";
import type { Ingrediente, IngredienteCreate } from "../../../entities/ingrediente/model";

interface IngredienteModalProps {
  open: boolean;
  editing: Ingrediente | null;
  onClose: () => void;
  onSubmit: (data: IngredienteCreate) => void;
  isSaving: boolean;
  error: string;
}

const EMPTY: IngredienteCreate = {
  nombre: "",
  descripcion: "",
  unidad_medida: "",
  es_alergeno: false,
};

export default function IngredienteModal({
  open,
  editing,
  onClose,
  onSubmit,
  isSaving,
  error,
}: IngredienteModalProps) {
  const [form, setForm] = useState<IngredienteCreate>(EMPTY);

  useEffect(() => {
    if (editing) {
      setForm({
        nombre: editing.nombre,
        descripcion: editing.descripcion ?? "",
        unidad_medida: editing.unidad_medida,
        es_alergeno: editing.es_alergeno,
      });
    } else {
      setForm(EMPTY);
    }
  }, [editing, open]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit(form);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? "Editar Ingrediente" : "Nuevo Ingrediente"}
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
            value={form.nombre}
            onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
            required
            minLength={2}
            maxLength={100}
            className="w-full border border-surface-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition bg-white"
            placeholder="Ej: Harina"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-surface-700 mb-1.5">
            Descripción
          </label>
          <textarea
            value={form.descripcion ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, descripcion: e.target.value }))}
            maxLength={500}
            rows={2}
            className="w-full border border-surface-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition bg-white resize-none"
            placeholder="Descripción opcional..."
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-surface-700 mb-1.5">
            Unidad de Medida <span className="text-danger-500">*</span>
          </label>
          <input
            type="text"
            value={form.unidad_medida}
            onChange={(e) => setForm((f) => ({ ...f, unidad_medida: e.target.value }))}
            required
            minLength={1}
            maxLength={50}
            className="w-full border border-surface-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition bg-white"
            placeholder="Ej: kg, lt, unidad"
          />
        </div>

        <div className="flex items-center gap-3">
          <input
            id="es_alergeno"
            type="checkbox"
            checked={form.es_alergeno}
            onChange={(e) => setForm((f) => ({ ...f, es_alergeno: e.target.checked }))}
            className="w-4 h-4 accent-orange-500 cursor-pointer"
          />
          <label htmlFor="es_alergeno" className="text-sm font-semibold text-surface-700 cursor-pointer">
            Es alérgeno{" "}
            <span className="text-xs font-normal text-orange-500">(Reg. UE 1169/2011)</span>
          </label>
        </div>

        <div className="flex justify-end gap-3 pt-3 border-t border-surface-100">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold text-surface-600 hover:bg-surface-100 transition cursor-pointer border border-surface-200"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="bg-success-500 hover:bg-success-600 disabled:opacity-50 text-white px-6 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm cursor-pointer"
          >
            {isSaving ? "Guardando..." : editing ? "Actualizar" : "Crear Ingrediente"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
