export interface Ingrediente {
  id: number;
  nombre: string;
  descripcion?: string;
  unidad_medida: string;
  es_alergeno: boolean;
  created_at: string;
  updated_at?: string;
  deleted_at?: string;
}

export interface PaginatedIngredientes {
  items: Ingrediente[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

export interface IngredienteCreate {
  nombre: string;
  descripcion?: string;
  unidad_medida: string;
  es_alergeno: boolean;
}

export interface IngredienteUpdate {
  nombre?: string;
  descripcion?: string;
  unidad_medida?: string;
  es_alergeno?: boolean;
}

export interface IngredienteFilters {
  nombre?: string;
  es_alergeno?: boolean;
  page: number;
  size: number;
}

export interface ImportErrorRow {
  fila: number;
  nombre: string;
  motivo: string;
}

export interface ImportarResult {
  creados: number;
  omitidos: number;
  errores: ImportErrorRow[];
}
