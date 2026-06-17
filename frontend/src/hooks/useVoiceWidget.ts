import { useEffect, useState } from 'react';
import { useCart } from './useCart';
import type { OrbState } from '../lib/types';

const HUB_ORIGIN = import.meta.env.VITE_SHOPBOT_HUB_ORIGIN as string | undefined;
const SITE_ID = import.meta.env.VITE_SHOPBOT_SITE_ID ?? 'ai_kart_main';

/**
 * Dynamically injects the hub's shopbot.js script and manages the Voice Orb state.
 *
 * Widget contract (matches existing cart.js pattern):
 * - Script tag carries `data-site-id` so the hub knows the spoke.
 * - The hub reads/writes `window.ShopBotConfig` for callbacks.
 * - The hub fires `CustomEvent("shopbot:orb-state", { detail: { state } })` on window
 *   to drive the orb's visual state — this is the Option A contract agreed upon in the plan.
 * - The store exposes `window.ShopCart` and `window.ShopBotConfig` for hub interaction
 *   (wired by CartDrawer on mount).
 */
export function useVoiceWidget() {
  const [orbState, setOrbState] = useState<OrbState>('idle');
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const cart = useCart();

  // Inject shopbot.js from hub if configured
  useEffect(() => {
    if (!HUB_ORIGIN) return;
    if (document.querySelector('script[data-shopbot-hub]')) {
      setScriptLoaded(true);
      return;
    }

    const script = document.createElement('script');
    script.src = `${HUB_ORIGIN}/shopbot.js?site=${SITE_ID}`;
    script.defer = true;
    script.setAttribute('data-site-id', SITE_ID);
    script.setAttribute('data-shopbot-hub', 'true');
    script.onload = () => setScriptLoaded(true);
    script.onerror = () => console.warn('[VoiceWidget] shopbot.js failed to load — orb stays idle.');
    document.head.appendChild(script);
  }, []);

  // Listen for hub-dispatched orb state changes (Option A contract)
  useEffect(() => {
    function handleOrbState(e: Event) {
      const detail = (e as CustomEvent<{ state: OrbState }>).detail;
      if (detail?.state) setOrbState(detail.state);
    }
    window.addEventListener('shopbot:orb-state', handleOrbState);
    return () => window.removeEventListener('shopbot:orb-state', handleOrbState);
  }, []);

  // Wire window.ShopBotConfig so the hub can invoke store actions
  useEffect(() => {
    (window as any).ShopBotConfig = (window as any).ShopBotConfig ?? {};
    (window as any).ShopBotConfig.siteId = SITE_ID;
    (window as any).ShopBotConfig.apiUrl = window.location.origin;
    (window as any).ShopBotConfig.onOpenCart = cart.openCart;
    (window as any).ShopBotConfig.onAddToCart = async (productId: string, qty: number) => {
      // Dispatch for cart.js backward compat
      window.dispatchEvent(
        new CustomEvent('shopbot:action', {
          detail: { action: 'ADD_TO_CART', params: { product_id: productId, quantity: qty } },
        })
      );
    };
  }, [cart.openCart]);

  return { orbState, scriptLoaded };
}
