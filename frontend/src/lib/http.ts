import type { AuthResponse } from './types';

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';
const AUTH_TOKEN_KEY = 'aikartAuthToken';

export function getAuthToken(): string {
  return localStorage.getItem(AUTH_TOKEN_KEY) ?? '';
}

export function setAuthToken(token: string): void {
  localStorage.setItem(AUTH_TOKEN_KEY, token);
}

export function clearAuthToken(): void {
  localStorage.removeItem(AUTH_TOKEN_KEY);
}

export async function fetchJson<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  const token = getAuthToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (options.body && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });
  if (!res.ok) {
    throw new Error(await responseMessage(res, path));
  }
  return res.json() as Promise<T>;
}

export function storeAuthResponse(response: AuthResponse): AuthResponse {
  setAuthToken(response.token);
  return response;
}

async function responseMessage(res: Response, path: string): Promise<string> {
  try {
    const body = (await res.json()) as { detail?: string };
    return body.detail || `API error ${res.status} for ${path}`;
  } catch {
    return `API error ${res.status} for ${path}`;
  }
}
