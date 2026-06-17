import type { Product, ProductDetailResponse, ProductListResponse } from './types';

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';

async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`);
  if (!res.ok) {
    throw new Error(`API error ${res.status} for ${path}`);
  }
  return res.json() as Promise<T>;
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
