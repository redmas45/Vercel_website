import { fetchJson } from './http';
import type {
  PincodeEstimate,
  Product,
  ProductDetailResponse,
  ProductListMeta,
  ProductListResponse,
  ReviewListResponse,
} from './types';

export interface ListProductsParams {
  category?: string;
  subcategory?: string;
  brand?: string;
  q?: string;
  price_min?: number;
  price_max?: number;
  rating_min?: number;
  discount_min?: number;
  in_stock?: boolean;
  featured?: boolean;
  new_arrival?: boolean;
  bestseller?: boolean;
  sort?: string;
  page?: number;
  per_page?: number;
}

export interface ProductListResult {
  products: Product[];
  meta: ProductListMeta | null;
}

export async function listProducts(params: ListProductsParams = {}): Promise<Product[]> {
  const result = await listProductResult(params);
  return result.products;
}

export async function listProductResult(params: ListProductsParams = {}): Promise<ProductListResult> {
  const query = productQuery(params);
  const res = await fetchJson<ProductListResponse>(`/api/products${query ? `?${query}` : ''}`);
  return { products: res.data, meta: res.meta ?? null };
}

export async function getProduct(productId: string): Promise<Product> {
  const res = await fetchJson<ProductDetailResponse>(`/api/products/${productId}`);
  return res.data;
}

export async function getRelatedProducts(productId: string): Promise<{ cross_sell: Product[]; frequently_bought_with: Product[] }> {
  const res = await fetchJson<{ data: { cross_sell: Product[]; frequently_bought_with: Product[] } }>(`/api/products/${productId}/related`);
  return res.data;
}

export async function getReviews(productId: string, page = 1, sort = 'helpful'): Promise<ReviewListResponse> {
  return fetchJson<ReviewListResponse>(`/api/products/${productId}/reviews?page=${page}&per_page=5&sort=${encodeURIComponent(sort)}`);
}

export async function searchSuggestions(q: string): Promise<Product[]> {
  const res = await fetchJson<{ data: Product[] }>(`/api/search/suggest?q=${encodeURIComponent(q)}&limit=5`);
  return res.data;
}

export async function cartSuggestions(productIds: string[]): Promise<Product[]> {
  if (!productIds.length) return [];
  const res = await fetchJson<{ data: Product[] }>(`/api/cart/suggestions?product_ids=${encodeURIComponent(productIds.join(','))}`);
  return res.data;
}

export async function checkPincode(pincode: string): Promise<PincodeEstimate> {
  const res = await fetchJson<{ data: PincodeEstimate }>(`/api/pincode/${encodeURIComponent(pincode)}`);
  return res.data;
}

function productQuery(params: ListProductsParams): string {
  const qs = new URLSearchParams();
  if (params.category) qs.set('category', params.category);
  if (params.subcategory) qs.set('subcategory', params.subcategory);
  if (params.brand) qs.set('brand', params.brand);
  if (params.q) qs.set('q', params.q);
  if (params.price_min !== undefined) qs.set('price_min', String(params.price_min));
  if (params.price_max !== undefined) qs.set('price_max', String(params.price_max));
  if (params.rating_min !== undefined) qs.set('rating_min', String(params.rating_min));
  if (params.discount_min !== undefined) qs.set('discount_min', String(params.discount_min));
  if (params.in_stock !== undefined) qs.set('in_stock', String(params.in_stock));
  if (params.featured !== undefined) qs.set('featured', String(params.featured));
  if (params.new_arrival !== undefined) qs.set('new_arrival', String(params.new_arrival));
  if (params.bestseller !== undefined) qs.set('bestseller', String(params.bestseller));
  if (params.sort) qs.set('sort', params.sort);
  if (params.page !== undefined) qs.set('page', String(params.page));
  if (params.per_page !== undefined) qs.set('per_page', String(params.per_page));
  return qs.toString();
}
