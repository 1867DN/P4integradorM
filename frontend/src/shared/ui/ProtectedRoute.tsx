import { Navigate, Outlet } from "react-router-dom";
import { useAuthStore } from "../store/authStore";

interface ProtectedRouteProps {
  allowedRoles?: string[];
}

/**
 * Guard de rutas. Sin token → redirige a /login.
 * Con allowedRoles → verifica que el usuario tenga al menos uno.
 * Usa <Outlet /> para renderizar rutas anidadas.
 */
export default function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const hasRole = useAuthStore((s) => s.hasRole);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !hasRole(allowedRoles)) {
    return <Navigate to="/sin-permisos" replace />;
  }

  return <Outlet />;
}
