import axiosClient from "./axiosClient";
import type { LoginRequest, RegisterRequest, TokenResponse, User } from "../types/auth";

function extractErrorMessage(error: unknown): string {
  if (typeof error === "object" && error !== null && "response" in error) {
    const axiosErr = error as {
      response?: { status?: number; data?: { detail?: unknown; error?: unknown } };
    };
    if (axiosErr.response?.status === 429) {
      return "Demasiados intentos fallidos. Intentá de nuevo en 15 minutos.";
    }
    const detail = axiosErr.response?.data?.detail;
    if (typeof detail === "string") return detail;
    if (typeof detail === "object" && detail !== null && "detail" in detail) {
      return (detail as { detail: string }).detail;
    }
  }
  return "Error inesperado";
}

export const authApi = {
  login: async (credentials: LoginRequest): Promise<{ tokens: TokenResponse; user: User }> => {
    try {
      const { data: tokens } = await axiosClient.post<TokenResponse>(
        "/api/v1/auth/login",
        credentials
      );
      // Obtener datos del usuario con el nuevo token
      const { data: user } = await axiosClient.get<User>("/api/v1/auth/me", {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      });
      return { tokens, user };
    } catch (err) {
      throw new Error(extractErrorMessage(err));
    }
  },

  register: async (data: RegisterRequest): Promise<User> => {
    try {
      const res = await axiosClient.post<User>("/api/v1/auth/register", data);
      return res.data;
    } catch (err) {
      throw new Error(extractErrorMessage(err));
    }
  },

  logout: async (refreshToken: string): Promise<void> => {
    try {
      await axiosClient.post("/api/v1/auth/logout", { refresh_token: refreshToken });
    } catch {
      // Silenciar errores de logout — el store se limpia igual
    }
  },

  getMe: async (): Promise<User> => {
    const { data } = await axiosClient.get<User>("/api/v1/auth/me");
    return data;
  },

  forgotPassword: async (email: string): Promise<void> => {
    try {
      await axiosClient.post("/api/v1/auth/forgot-password", { email });
    } catch (err) {
      throw new Error(extractErrorMessage(err));
    }
  },

  resetPassword: async (token: string, new_password: string): Promise<void> => {
    try {
      await axiosClient.post("/api/v1/auth/reset-password", { token, new_password });
    } catch (err) {
      throw new Error(extractErrorMessage(err));
    }
  },

  googleLogin: async (credential: string): Promise<{ tokens: TokenResponse; user: User }> => {
    try {
      const { data: tokens } = await axiosClient.post<TokenResponse>(
        "/api/v1/auth/google",
        { credential }
      );
      const { data: user } = await axiosClient.get<User>("/api/v1/auth/me", {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      });
      return { tokens, user };
    } catch (err) {
      throw new Error(extractErrorMessage(err));
    }
  },
};
