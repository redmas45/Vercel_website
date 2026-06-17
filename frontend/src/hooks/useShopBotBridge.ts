import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { currentUser, getProduct } from '../lib/api';
import { useCart } from './useCart';

interface ShopBotConfig {
  sessionId?: string;
  onOpenCart?: () => void;
  onAddToCart?: (productId: string, quantity: number) => Promise<void>;
  onNavigate?: (page: string) => void;
  onCheckout?: () => void;
}

interface ShopCart {
  addItem: (productId: string, quantity?: number) => Promise<void>;
  open: () => void;
  clear: () => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  checkout: () => void;
  showProductDetail: (productId: string) => void;
  filterProducts: (params: Record<string, string>) => void;
}

declare global {
  interface Window {
    ShopBotConfig?: ShopBotConfig;
    ShopCart?: ShopCart;
  }
}

export function useShopBotBridge(): void {
  const cart = useCart();
  const navigate = useNavigate();

  useEffect(() => {
    async function addProduct(productId: string, quantity = 1): Promise<void> {
      const product = await getProduct(productId);
      cart.addItem(product, quantity);
      cart.openCart();
    }

    function openProduct(productId: string): void {
      if (!productId) return;
      navigate(`/product/${productId}`);
    }

    function filterProducts(params: Record<string, string>): void {
      const query = new URLSearchParams();
      if (params.category) query.set('category', params.category);
      if (params.search_query) query.set('q', params.search_query);
      navigate(`/shop${query.toString() ? `?${query.toString()}` : ''}`);
    }

    window.ShopBotConfig = {
      ...window.ShopBotConfig,
      onOpenCart: cart.openCart,
      onAddToCart: addProduct,
      onNavigate: (page: string) => navigate(normalizePath(page)),
      onCheckout: () => navigate('/cart'),
    };

    window.ShopCart = {
      addItem: addProduct,
      open: cart.openCart,
      clear: cart.clearCart,
      removeItem: cart.removeItem,
      updateQuantity: cart.updateQuantity,
      checkout: () => navigate('/cart'),
      showProductDetail: openProduct,
      filterProducts,
    };

    currentUser()
      .then((user) => {
        window.ShopBotConfig = {
          ...window.ShopBotConfig,
          sessionId: `user-${user.id}`,
        };
      })
      .catch(() => {
        if (window.ShopBotConfig) delete window.ShopBotConfig.sessionId;
      });

    return () => {
      delete window.ShopBotConfig;
      delete window.ShopCart;
    };
  }, [cart, navigate]);
}

function normalizePath(page: string): string {
  const clean = String(page || '').trim().replace(/^\/+|\/+$/g, '');
  if (!clean || clean === 'home') return '/';
  if (clean === 'cart') return '/cart';
  if (clean === 'shop') return '/shop';
  return `/${clean}`;
}
