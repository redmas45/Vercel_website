import { fetchJson } from './http';
import type { Address, WishlistItem } from './types';

export async function listWishlist(): Promise<WishlistItem[]> {
  const res = await fetchJson<{ data: WishlistItem[] }>('/api/users/me/wishlist');
  return res.data;
}

export async function addWishlistItem(productId: string): Promise<WishlistItem[]> {
  const res = await fetchJson<{ data: WishlistItem[] }>('/api/users/me/wishlist', {
    method: 'POST',
    body: JSON.stringify({ product_id: productId }),
  });
  return res.data;
}

export async function removeWishlistItem(productId: string): Promise<void> {
  await fetchJson<{ data: { status: string } }>(`/api/users/me/wishlist/${encodeURIComponent(productId)}`, {
    method: 'DELETE',
  });
}

export async function listAddresses(): Promise<Address[]> {
  const res = await fetchJson<{ data: Address[] }>('/api/users/me/addresses');
  return res.data;
}

export async function addAddress(payload: Omit<Address, 'id'>): Promise<Address> {
  return fetchJson<Address>('/api/users/me/addresses', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function listOrders(): Promise<unknown[]> {
  const res = await fetchJson<{ data: unknown[] }>('/api/users/me/orders');
  return res.data;
}
