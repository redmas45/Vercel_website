import { fetchJson } from './http';
import type { Product, ProductListResponse, Review, User } from './types';

export interface AdminUserPayload {
  email: string;
  password: string;
  name: string;
  role: 'admin' | 'customer';
}

export async function listAdminUsers(): Promise<User[]> {
  return fetchJson<User[]>('/api/admin/users');
}

export async function createAdminUser(payload: AdminUserPayload): Promise<User> {
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

export async function listAdminReviews(): Promise<Review[]> {
  return fetchJson<Review[]>('/api/admin/reviews');
}

export async function updateAdminReview(reviewId: string, isPublished: boolean): Promise<Review> {
  return fetchJson<Review>(`/api/admin/reviews/${encodeURIComponent(reviewId)}?is_published=${isPublished}`, {
    method: 'PATCH',
  });
}

export async function deleteAdminReview(reviewId: string): Promise<void> {
  await fetchJson<{ status: string }>(`/api/admin/reviews/${encodeURIComponent(reviewId)}`, { method: 'DELETE' });
}
