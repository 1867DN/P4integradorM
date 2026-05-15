import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { authApi } from "../shared/api/authApi";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await authApi.forgotPassword(email);
      setSent(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error inesperado");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8">

        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center">
            <span className="text-white font-bold text-sm">FS</span>
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-800 leading-none">Food Store</h1>
            <p className="text-xs text-gray-400 mt-0.5">Recuperá tu contraseña</p>
          </div>
        </div>

        {sent ? (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto text-3xl">
              ✉️
            </div>
            <h2 className="text-lg font-semibold text-gray-800">¡Mail enviado!</h2>
            <p className="text-sm text-gray-500">
              Si el email está registrado, vas a recibir un link para restablecer tu contraseña.
              El link expira en <strong>15 minutos</strong>.
            </p>
            <Link
              to="/login"
              className="block text-sm text-blue-600 hover:underline font-medium"
            >
              Volver al inicio de sesión
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-sm text-gray-500">
              Ingresá tu email y te mandamos un link para restablecer tu contraseña.
            </p>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="tu@email.com"
              />
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-2 rounded-lg transition-colors text-sm"
            >
              {loading ? "Enviando..." : "Enviar link de recuperación"}
            </button>

            <Link
              to="/login"
              className="block text-center text-sm text-gray-400 hover:text-gray-600"
            >
              Volver al inicio de sesión
            </Link>
          </form>
        )}
      </div>
    </div>
  );
}
