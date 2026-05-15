import type {
  Categoria,
  CategoriaInput,
  PaginatedCategorias,
  Ingrediente,
  IngredienteInput,
  ProductoListItem,
  PaginatedProductos,
  ProductoDetalle,
  ProductoCreate,
  ProductoUpdate,
} from "../types";
import { useAuthStore } from "../shared/store/authStore";

const BASE = "http://localhost:8000";

// ─── helpers ─────────────────────────────────────────────
const fieldLabels: Record<string, string> = {
  nombre: "Nombre",
  precio: "Precio",
  descripcion: "Descripción",
  unidad_medida: "Unidad de medida",
  categoria_ids: "Categorías",
  ingredientes: "Ingredientes",
};

function parsePydanticMsg(msg: string): string {
  if (/at least \d+ character/.test(msg)) {
    const n = msg.match(/(\d+) character/)?.[1] ?? "2";
    return `Debe tener al menos ${n} caracteres`;
  }
  if (/greater than 0/.test(msg)) return "Debe ser mayor a 0";
  if (/greater than or equal to 0/.test(msg)) return "Debe ser mayor o igual a 0";
  if (/less than or equal to/.test(msg)) {
    const n = msg.match(/to ([\d.]+)/)?.[1] ?? "";
    return `Debe ser menor o igual a ${n}`;
  }
  if (/field required/i.test(msg)) return "Campo requerido";
  return msg;
}

function extractDetail(detail: unknown): string {
  // RFC 7807: detail es un objeto { detail: "...", code: "..." }
  if (typeof detail === "object" && detail !== null && "detail" in detail) {
    return String((detail as Record<string, unknown>).detail);
  }
  if (typeof detail === "string") return detail;
  return "";
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    let msg: string;
    if (Array.isArray(body?.detail)) {
      msg = body.detail
        .map((d: { loc: string[]; msg: string }) => {
          const field = d.loc?.[d.loc.length - 1];
          const label = field && field !== "body" ? (fieldLabels[field] ?? field) : null;
          const translated = parsePydanticMsg(d.msg);
          return label ? `${label}: ${translated}` : translated;
        })
        .join("\n");
    } else {
      msg = extractDetail(body?.detail) || `Error ${res.status}`;
    }
    throw new Error(msg);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

function authHeaders(): HeadersInit {
  const token = useAuthStore.getState().accessToken;
  if (token) return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
  return { "Content-Type": "application/json" };
}

function post<T>(url: string, data: unknown): Promise<T> {
  return fetch(`${BASE}${url}`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(data),
  }).then((r) => handleResponse<T>(r));
}

function put<T>(url: string, data: unknown): Promise<T> {
  return fetch(`${BASE}${url}`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify(data),
  }).then((r) => handleResponse<T>(r));
}

function del(url: string): Promise<void> {
  return fetch(`${BASE}${url}`, { method: "DELETE", headers: authHeaders() }).then((r) =>
    handleResponse<void>(r)
  );
}

function get<T>(url: string): Promise<T> {
  return fetch(`${BASE}${url}`, { headers: authHeaders() }).then((r) => handleResponse<T>(r));
}

async function getBlob(url: string, filename: string): Promise<void> {
  const token = useAuthStore.getState().accessToken;
  const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
  const res = await fetch(`${BASE}${url}`, { headers });
  if (!res.ok) throw new Error(`Error ${res.status}`);
  const blob = await res.blob();
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

// ─── Categorías ──────────────────────────────────────────
export const categoriasApi = {
  getAll: () => get<{ items: Categoria[]; total: number }>("/api/v1/categorias/?page=1&size=100").then(r => r.items),
  getPaginated: (page = 1, size = 5, nombre?: string) => {
    const qs = new URLSearchParams({ page: String(page), size: String(size) });
    if (nombre) qs.set("nombre", nombre);
    return get<PaginatedCategorias>(`/api/v1/categorias/?${qs}`);
  },
  getInactivos: (page = 1, size = 5) =>
    get<PaginatedCategorias>(`/api/v1/categorias/inactivos?page=${page}&size=${size}`),
  getById: (id: number) => get<Categoria>(`/api/v1/categorias/${id}`),
  create: (data: CategoriaInput) => post<Categoria>("/api/v1/categorias/", data),
  update: (id: number, data: CategoriaInput) => put<Categoria>(`/api/v1/categorias/${id}`, data),
  delete: (id: number) => del(`/api/v1/categorias/${id}`),
  reactivar: (id: number) =>
    fetch(`${BASE}/api/v1/categorias/${id}/reactivar`, { method: "PATCH", headers: authHeaders() }).then((r) =>
      handleResponse<Categoria>(r)
    ),
  exportar: () => getBlob("/api/v1/categorias/exportar", "categorias.xlsx"),
};

// ─── Ingredientes — apunta a la nueva URL con paginación ─
export const ingredientesApi = {
  getAll: () =>
    get<{ items: Ingrediente[] }>("/api/v1/ingredientes/?page=1&size=100").then((r) => r.items),
  getById: (id: number) => get<Ingrediente>(`/api/v1/ingredientes/${id}`),
  create: (data: IngredienteInput) => post<Ingrediente>("/api/v1/ingredientes/", data),
  update: (id: number, data: IngredienteInput) =>
    put<Ingrediente>(`/api/v1/ingredientes/${id}`, data),
  delete: (id: number) => del(`/api/v1/ingredientes/${id}`),
  getInactivos: (page = 1, size = 20) =>
    get<{ items: Ingrediente[]; total: number; page: number; size: number; pages: number }>(
      `/api/v1/ingredientes/inactivos?page=${page}&size=${size}`
    ),
  reactivar: (id: number) =>
    fetch(`${BASE}/api/v1/ingredientes/${id}/reactivar`, { method: "PATCH", headers: authHeaders() }).then((r) =>
      handleResponse<Ingrediente>(r)
    ),
};

// ─── Productos ───────────────────────────────────────────
export const productosApi = {
  getAll: (page = 1, size = 20, params?: { nombre?: string; solo_disponibles?: boolean }) => {
    const qs = new URLSearchParams({ page: String(page), size: String(size) });
    if (params?.nombre) qs.set("nombre", params.nombre);
    if (params?.solo_disponibles !== undefined) qs.set("solo_disponibles", String(params.solo_disponibles));
    return get<PaginatedProductos>(`/api/v1/productos/?${qs}`);
  },
  getAllForSelect: () =>
    get<PaginatedProductos>("/api/v1/productos/?page=1&size=100&solo_disponibles=false").then((r) => r.items),
  getById: (id: number) => get<ProductoDetalle>(`/api/v1/productos/${id}`),
  create: (data: ProductoCreate) => post<ProductoDetalle>("/api/v1/productos/", data),
  update: (id: number, data: ProductoUpdate) => put<ProductoDetalle>(`/api/v1/productos/${id}`, data),
  delete: (id: number) => del(`/api/v1/productos/${id}`),
  getInactivos: (page = 1, size = 20) =>
    get<PaginatedProductos>(`/api/v1/productos/inactivos?page=${page}&size=${size}`),
  reactivar: (id: number) =>
    fetch(`${BASE}/api/v1/productos/${id}/reactivar`, { method: "PATCH", headers: authHeaders() }).then((r) =>
      handleResponse<ProductoDetalle>(r)
    ),
  exportar: () => getBlob("/api/v1/productos/exportar", "productos.xlsx"),
};
