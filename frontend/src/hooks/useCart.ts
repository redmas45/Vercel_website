import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CartItem, Product } from '../lib/types';

interface CartStore {
  items: CartItem[];
  isOpen: boolean;
  promoCode: string;
  lastAdded: CartItem | null;
  addItem: (product: Product, quantity?: number) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  openCart: () => void;
  closeCart: () => void;
  clearLastAdded: () => void;
  applyPromoCode: (code: string) => { success: boolean; discount: number };
  totalItems: () => number;
  totalPrice: () => number;
  totalDiscount: () => number;
  cartTotal: () => { subtotal: number; discount: number; total: number };
}

export const useCart = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,
      promoCode: '',
      lastAdded: null,

      addItem: (product, quantity = 1) => {
        set((state) => {
          const existing = state.items.find((i) => i.product.id === product.id);
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.product.id === product.id
                  ? { ...i, quantity: i.quantity + quantity }
                  : i
              ),
              lastAdded: { product, quantity },
            };
          }
          return { items: [...state.items, { product, quantity }], lastAdded: { product, quantity } };
        });
      },

      removeItem: (productId) => {
        set((state) => ({
          items: state.items.filter((i) => i.product.id !== productId),
        }));
      },

      updateQuantity: (productId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(productId);
          return;
        }
        set((state) => ({
          items: state.items.map((i) =>
            i.product.id === productId ? { ...i, quantity } : i
          ),
        }));
      },

      clearCart: () => set({ items: [] }),
      openCart: () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),
      clearLastAdded: () => set({ lastAdded: null }),
      applyPromoCode: (code) => {
        const clean = code.trim().toUpperCase();
        const success = clean === 'AIKART10';
        set({ promoCode: success ? clean : '' });
        return { success, discount: success ? get().totalPrice() * 0.1 : 0 };
      },

      totalItems: () => get().items.reduce((sum, i) => sum + i.quantity, 0),
      totalPrice: () =>
        get().items.reduce((sum, i) => sum + i.product.price * i.quantity, 0),
      totalDiscount: () =>
        get().items.reduce((sum, i) => {
          const original = i.product.original_price ?? i.product.price;
          return sum + Math.max(0, original - i.product.price) * i.quantity;
        }, 0),
      cartTotal: () => {
        const subtotal = get().totalPrice();
        const productDiscount = get().totalDiscount();
        const promoDiscount = get().promoCode ? subtotal * 0.1 : 0;
        return { subtotal, discount: productDiscount + promoDiscount, total: Math.max(0, subtotal - promoDiscount) };
      },
    }),
    { name: 'aikart-cart' }
  )
);
