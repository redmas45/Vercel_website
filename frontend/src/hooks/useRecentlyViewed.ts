import { useEffect, useState } from 'react';
import { getProduct } from '../lib/productApi';
import type { Product } from '../lib/types';

const RECENTLY_VIEWED_KEY = 'aikart-recently-viewed';
const RECENT_LIMIT = 10;

export function rememberProduct(productId: string): void {
  const current = readIds().filter((id) => id !== productId);
  localStorage.setItem(RECENTLY_VIEWED_KEY, JSON.stringify([productId, ...current].slice(0, RECENT_LIMIT)));
}

export function useRecentlyViewed(): Product[] {
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    Promise.all(readIds().map((id) => getProduct(id).catch(() => null))).then((items) => {
      setProducts(items.filter((item): item is Product => Boolean(item)));
    });
  }, []);

  return products;
}

function readIds(): string[] {
  try {
    const raw = JSON.parse(localStorage.getItem(RECENTLY_VIEWED_KEY) || '[]') as string[];
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}
