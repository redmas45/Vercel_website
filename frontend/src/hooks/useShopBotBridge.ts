import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { currentUser } from '../lib/authApi';
import { getProduct } from '../lib/productApi';
import { useCart } from './useCart';

interface ShopBotConfig {
  sessionId?: string;
  onOpenCart?: () => void;
  onAddToCart?: (productId: string, quantity: number) => Promise<void>;
  onNavigate?: (page: string) => void;
  onCheckout?: () => void;
  onProductView?: (productId: string) => void;
  onWishlistAdd?: (productId: string) => void;
  onSearch?: (query: string) => void;
  onCheckoutStart?: () => void;
  onOrderPlaced?: (orderId: string, total: number) => void;
  catalog?: {
    currency: string;
    symbol: string;
    getProduct: (id: string) => Promise<unknown>;
    searchProducts: (q: string) => Promise<unknown>;
    getCrossSells: (id: string) => Promise<unknown>;
    filterProducts: (params: Record<string, string>) => Promise<unknown>;
  };
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
  getItems: () => unknown[];
  getTotal: () => { subtotal: number; discount: number; total: number };
  applyPromoCode: (code: string) => { success: boolean; discount: number };
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
      onCheckout: () => navigate('/checkout'),
      catalog: {
        currency: 'INR',
        symbol: 'Rs',
        getProduct: (id: string) => fetch(`/api/products/${id}`).then((response) => response.json()),
        searchProducts: (q: string) => fetch(`/api/products?q=${encodeURIComponent(q)}`).then((response) => response.json()),
        getCrossSells: (id: string) => fetch(`/api/products/${id}/related`).then((response) => response.json()),
        filterProducts: (params: Record<string, string>) => fetch(`/api/products?${new URLSearchParams(params)}`).then((response) => response.json()),
      },
    };

    window.ShopCart = {
      addItem: addProduct,
      open: cart.openCart,
      clear: cart.clearCart,
      removeItem: cart.removeItem,
      updateQuantity: cart.updateQuantity,
      checkout: () => navigate('/checkout'),
      showProductDetail: openProduct,
      filterProducts,
      getItems: () => cart.items,
      getTotal: cart.cartTotal,
      applyPromoCode: cart.applyPromoCode,
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
