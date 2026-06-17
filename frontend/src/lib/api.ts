import type { AuthResponse, Product, ProductDetailResponse, ProductListResponse, User } from './types';

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';
const AUTH_TOKEN_KEY = 'aikartAuthToken';

async function fetchJson<T>(path: string, options: RequestInit = {}): Promise<T> {
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

async function responseMessage(res: Response, path: string): Promise<string> {
  try {
    const body = (await res.json()) as { detail?: string };
    return body.detail || `API error ${res.status} for ${path}`;
  } catch {
    return `API error ${res.status} for ${path}`;
  }
}

export interface ListProductsParams {
  category?: string;
  q?: string;
  min_price?: number;
  max_price?: number;
  in_stock?: boolean;
}

export async function listProducts(params: ListProductsParams = {}): Promise<Product[]> {
  const qs = new URLSearchParams();
  if (params.category) qs.set('category', params.category);
  if (params.q) qs.set('q', params.q);
  if (params.min_price !== undefined) qs.set('min_price', String(params.min_price));
  if (params.max_price !== undefined) qs.set('max_price', String(params.max_price));
  if (params.in_stock !== undefined) qs.set('in_stock', String(params.in_stock));

  const query = qs.toString();
  const res = await fetchJson<ProductListResponse>(`/api/products${query ? `?${query}` : ''}`);
  return res.data;
}

export async function getProduct(productId: string): Promise<Product> {
  const res = await fetchJson<ProductDetailResponse>(`/api/products/${productId}`);
  return res.data;
}

export function getAuthToken(): string {
  return localStorage.getItem(AUTH_TOKEN_KEY) ?? '';
}

export function setAuthToken(token: string): void {
  localStorage.setItem(AUTH_TOKEN_KEY, token);
}

export function clearAuthToken(): void {
  localStorage.removeItem(AUTH_TOKEN_KEY);
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  const response = await fetchJson<AuthResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  setAuthToken(response.token);
  return response;
}

export async function signup(email: string, password: string, name: string): Promise<AuthResponse> {
  const response = await fetchJson<AuthResponse>('/api/auth/signup', {
    method: 'POST',
    body: JSON.stringify({ email, password, name }),
  });
  setAuthToken(response.token);
  return response;
}

export async function currentUser(): Promise<User> {
  return fetchJson<User>('/api/auth/me');
}

export async function listAdminUsers(): Promise<User[]> {
  return fetchJson<User[]>('/api/admin/users');
}

export async function createAdminUser(payload: {
  email: string;
  password: string;
  name: string;
  role: 'admin' | 'customer';
}): Promise<User> {
  return fetchJson<User>('/api/admin/users', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function deleteAdminUser(userId: number): Promise<void> {
  await fetchJson<{ status: string }>(`/api/admin/users/${userId}`, { method: 'DELETE' });
}

export async function listAdminProducts(): Promise<Product[]> {
  const response = await fetchJson<ProductListResponse>('/api/admin/products');
  return response.data;
}

export async function createAdminProduct(formData: FormData): Promise<Product> {
  return fetchJson<Product>('/api/admin/products', {
    method: 'POST',
    body: formData,
  });
}

export async function deleteAdminProduct(productId: string): Promise<void> {
  await fetchJson<{ status: string }>(`/api/admin/products/${encodeURIComponent(productId)}`, { method: 'DELETE' });
}
