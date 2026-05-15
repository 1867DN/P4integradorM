export interface RolInfo {
  codigo: string;
  nombre: string;
}

export interface User {
  id: number;
  nombre: string;
  apellido: string;
  email: string;
  celular?: string;
  roles: RolInfo[];
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  nombre: string;
  apellido: string;
  email: string;
  password: string;
  celular?: string;
}
