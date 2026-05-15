import { NavLink, Outlet, useLocation, Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "../shared/store/authStore";
import { authApi } from "../shared/api/authApi";

// Cada item define qué roles pueden verlo.
// Array vacío = todos los roles autenticados pueden verlo.
const navItems = [
  {
    to: "/categorias",
    label: "Categorías",
    icon: "🏷️",
    color: "bg-warning-500",
    roles: ["ADMIN"],
  },
  {
    to: "/ingredientes",
    label: "Ingredientes",
    icon: "🧂",
    color: "bg-success-500",
    roles: ["ADMIN", "STOCK"],
  },
  {
    to: "/productos",
    label: "Productos",
    icon: "📦",
    color: "bg-brand-500",
    roles: ["ADMIN", "STOCK", "CLIENT"],
  },
];

const breadcrumbMap: Record<string, { label: string; path: string }> = {
  categorias:   { label: "Categorías",  path: "/categorias"  },
  ingredientes: { label: "Ingredientes", path: "/ingredientes" },
  productos:    { label: "Productos",   path: "/productos"   },
};

const roleLabels: Record<string, { label: string; color: string }> = {
  ADMIN:   { label: "Admin",            color: "bg-red-100 text-red-700"     },
  STOCK:   { label: "Stock",            color: "bg-blue-100 text-blue-700"   },
  PEDIDOS: { label: "Pedidos",          color: "bg-purple-100 text-purple-700" },
  CLIENT:  { label: "Cliente",          color: "bg-green-100 text-green-700" },
};

export default function Layout() {
  const location  = useLocation();
  const navigate  = useNavigate();
  const user      = useAuthStore((s) => s.user);
  const hasRole   = useAuthStore((s) => s.hasRole);
  const logout    = useAuthStore((s) => s.logout);
  const refreshToken = useAuthStore((s) => s.refreshToken);

  // Filtrar items según los roles del usuario
  const visibleItems = navItems.filter((item) =>
    item.roles.length === 0 || hasRole(item.roles)
  );

  // Breadcrumb
  const segments = location.pathname.split("/").filter(Boolean);
  const breadcrumbItems: { label: string; path?: string }[] = [];
  segments.forEach((seg, i) => {
    const mapped = breadcrumbMap[seg];
    if (mapped) {
      const isLast = i === segments.length - 1;
      breadcrumbItems.push({ label: mapped.label, path: isLast ? undefined : mapped.path });
    } else if (!isNaN(Number(seg))) {
      breadcrumbItems.push({ label: `Detalle #${seg}` });
    }
  });

  async function handleLogout() {
    try {
      if (refreshToken) await authApi.logout(refreshToken);
    } finally {
      logout();
      navigate("/login", { replace: true });
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* ─── Sidebar ──────────────────────────────── */}
      <aside className="w-60 bg-sidebar-900 flex flex-col shrink-0 sticky top-0 h-screen">

        {/* Logo */}
        <div className="px-5 py-6 border-b border-white/10">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-brand-500 flex items-center justify-center shadow-lg shadow-brand-500/30">
              <span className="text-white font-bold text-xs">FS</span>
            </div>
            <span className="text-white font-semibold text-sm tracking-tight">Food Store</span>
          </Link>
        </div>

        {/* Navegación filtrada por rol */}
        <nav className="flex-1 px-3 py-5">
          <p className="px-3 mb-3 text-[10px] font-bold tracking-[0.15em] text-sidebar-500 uppercase">
            Módulos
          </p>
          <div className="space-y-1">
            {visibleItems.length === 0 && (
              <p className="px-3 text-xs text-sidebar-500 italic">Sin módulos disponibles</p>
            )}
            {visibleItems.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? "bg-white/10 text-white shadow-sm"
                      : "text-sidebar-500 hover:text-white hover:bg-white/5"
                  }`
                }
              >
                <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm ${link.color} text-white shadow-sm`}>
                  {link.icon}
                </span>
                {link.label}
              </NavLink>
            ))}
          </div>
        </nav>

        {/* Usuario + roles + logout */}
        {user && (
          <div className="px-4 py-4 border-t border-white/10">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-full bg-brand-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                {user.nombre[0]}{user.apellido[0]}
              </div>
              <div className="min-w-0">
                <p className="text-white text-xs font-semibold truncate">
                  {user.nombre} {user.apellido}
                </p>
                <p className="text-sidebar-500 text-[10px] truncate">{user.email}</p>
              </div>
            </div>

            {/* Badges de roles */}
            <div className="flex flex-wrap gap-1 mb-3">
              {user.roles.map((r) => {
                const meta = roleLabels[r.codigo] ?? { label: r.codigo, color: "bg-gray-100 text-gray-600" };
                return (
                  <span key={r.codigo} className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${meta.color}`}>
                    {meta.label}
                  </span>
                );
              })}
            </div>

            <button
              onClick={handleLogout}
              className="w-full text-xs font-semibold text-sidebar-500 hover:text-white hover:bg-white/5 py-2 px-3 rounded-xl transition-all cursor-pointer text-left flex items-center gap-2"
            >
              <span>↩</span> Cerrar sesión
            </button>
          </div>
        )}
      </aside>

      {/* ─── Main content ────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar con breadcrumb */}
        <header className="bg-white border-b border-surface-200 sticky top-0 z-30">
          <div className="px-8 h-14 flex items-center">
            <div className="flex items-center gap-2 text-sm">
              {breadcrumbItems.map((item, i) => (
                <span key={i} className="flex items-center gap-2">
                  {i > 0 && <span className="text-surface-300">/</span>}
                  {item.path ? (
                    <Link to={item.path} className="text-surface-400 hover:text-brand-600 transition-colors">
                      {item.label}
                    </Link>
                  ) : (
                    <span className="text-surface-800 font-medium">{item.label}</span>
                  )}
                </span>
              ))}
            </div>
          </div>
        </header>

        {/* Contenido de página */}
        <main className="flex-1 p-8 animate-page">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
