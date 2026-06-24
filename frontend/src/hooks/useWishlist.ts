import { useEffect, useState } from 'react';
import { addWishlistItem, listWishlist, removeWishlistItem } from '../lib/accountApi';
import { getAuthToken } from '../lib/authApi';

const LOCAL_WISHLIST_KEY = 'aikart-local-wishlist';

export function useWishlist() {
  const [ids, setIds] = useState<string[]>(readLocalWishlist());
  const isAuthenticated = Boolean(getAuthToken());

  useEffect(() => {
    if (!isAuthenticated) return;
    listWishlist()
      .then((items) => setIds(items.map((item) => item.product.id)))
      .catch(() => setIds(readLocalWishlist()));
  }, [isAuthenticated]);

  async function toggle(productId: string): Promise<boolean> {
    const nextIsSaved = !ids.includes(productId);
    const nextIds = nextIsSaved ? [...ids, productId] : ids.filter((id) => id !== productId);
    setIds(nextIds);
    writeLocalWishlist(nextIds);
    if (isAuthenticated) {
      try {
        if (nextIsSaved) await addWishlistItem(productId);
        else await removeWishlistItem(productId);
      } catch {
        setIds(ids);
        writeLocalWishlist(ids);
        throw new Error('Wishlist update failed.');
      }
    }
    window.ShopBotConfig?.onWishlistAdd?.(productId);
    return nextIsSaved;
  }

  return { ids, has: (productId: string) => ids.includes(productId), toggle };
}

function readLocalWishlist(): string[] {
  try {
    const raw = JSON.parse(localStorage.getItem(LOCAL_WISHLIST_KEY) || '[]') as string[];
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

function writeLocalWishlist(ids: string[]): void {
  localStorage.setItem(LOCAL_WISHLIST_KEY, JSON.stringify(ids));
}
