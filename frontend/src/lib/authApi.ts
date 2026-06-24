import { clearAuthToken, fetchJson, getAuthToken, setAuthToken, storeAuthResponse } from './http';
import type { AuthResponse, User } from './types';

export { clearAuthToken, getAuthToken, setAuthToken };

export async function login(email: string, password: string): Promise<AuthResponse> {
  const response = await fetchJson<AuthResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  return storeAuthResponse(response);
}

export async function signup(email: string, password: string, name: string): Promise<AuthResponse> {
  const response = await fetchJson<AuthResponse>('/api/auth/signup', {
    method: 'POST',
    body: JSON.stringify({ email, password, name }),
  });
  return storeAuthResponse(response);
}

export async function currentUser(): Promise<User> {
  return fetchJson<User>('/api/auth/me');
}
