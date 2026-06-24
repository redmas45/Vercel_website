import type { Product } from './types';

export function money(value: number | null | undefined, currency = 'INR'): string {
  const amount = Number(value || 0);
  if (currency === 'INR') return `Rs ${amount.toLocaleString('en-IN')}`;
  return `${currency} ${amount.toLocaleString('en-US')}`;
}

export function percentText(value: number | null | undefined): string {
  return value ? `${value}% off` : '';
}

export function productImages(product: Product): string[] {
  const images = product.images?.length ? product.images : [product.image_url];
  return images.filter(Boolean);
}

export function stockText(product: Product): string {
  if (!product.in_stock) return 'Out of stock';
  if (product.stock && product.stock <= 5) return `In stock, only ${product.stock} left`;
  return 'In stock';
}

export function plainText(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}
