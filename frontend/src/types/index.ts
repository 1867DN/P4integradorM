// --- Categoría ---
export interface Categoria {
  id: number;
  nombre: string;
  descripcion?: string;
  parent_id?: number;
  deleted_at?: string;
  created_at?: string;
}

export interface CategoriaInput {
  nombre: string;
  descripcion?: string;
  parent_id?: number | null;
}

export interface PaginatedCategorias {
  items: Categoria[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

// --- Ingrediente ---
export interface Ingrediente {
  id: number;
  nombre: string;
  descripcion?: string;
  unidad_medida: string;
  es_alergeno: boolean;
  created_at?: string;
  deleted_at?: string;
}

export interface IngredienteInput {
  nombre: string;
  descripcion?: string;
  unidad_medida: string;
  es_alergeno?: boolean;
}

// --- Producto ---
export interface ProductoListItem {
  id: number;
  nombre: string;
  descripcion?: string;
  precio: number;
  stock_cantidad: number;
  disponible: boolean;
  created_at: string;
  updated_at?: string;
  deleted_at?: string;
}

export interface PaginatedProductos {
  items: ProductoListItem[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

export interface IngredienteEnProducto {
  id: number;
  nombre: string;
  unidad_medida: string;
  cantidad: number;
}

export interface ProductoDetalle {
  id: number;
  nombre: string;
  descripcion?: string;
  precio: number;
  categorias: Categoria[];
  ingredientes: IngredienteEnProducto[];
}

export interface IngredienteProductoInput {
  ingrediente_id: number;
  cantidad: number;
}

export interface ProductoCreate {
  nombre: string;
  descripcion?: string;
  precio: number;
  categoria_ids: number[];
  ingredientes: IngredienteProductoInput[];
}

export interface ProductoUpdate {
  nombre: string;
  descripcion?: string;
  precio: number;
}
