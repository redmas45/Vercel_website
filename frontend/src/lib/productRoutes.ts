import type { Product } from './types';

type ProductRoute = Pick<Product, 'id' | 'url'>;

export function productPath(product: ProductRoute): string {
  const catalogPath = internalProductPath(product.url);
  if (catalogPath) return catalogPath;
  return `/product/${encodeURIComponent(product.id)}`;
}

function internalProductPath(value: string | null | undefined): string {
  const rawValue = String(value || '').trim();
  if (!rawValue) return '';
  if (rawValue.startsWith('/product/')) return normalizedProductPath(rawValue);
  try {
    const parsedUrl = new URL(rawValue, window.location.origin);
    if (parsedUrl.origin !== window.location.origin) return '';
    return parsedUrl.pathname.startsWith('/product/')
      ? normalizedProductPath(`${parsedUrl.pathname}${parsedUrl.search}${parsedUrl.hash}`)
      : '';
  } catch {
    return '';
  }
}

function normalizedProductPath(value: string): string {
  const [pathWithQuery, hash = ''] = value.split('#', 2);
  const [path, query = ''] = pathWithQuery.split('?', 2);
  const cleanPath = path.length > '/product/'.length && path.endsWith('/') ? path.slice(0, -1) : path;
  return `${cleanPath}${query ? `?${query}` : ''}${hash ? `#${hash}` : ''}`;
}
