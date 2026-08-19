import { useCart } from '../../hooks/useCart';
import { Button } from '../ui/Button';
import { CartCrossSell } from './CartCrossSell';
import { money } from '../../lib/format';
import { useLocation, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { ProductImage } from '../ui/ProductImage';
import { AIHUB_ROLE, aihubProductIdentity, aihubRole } from '../../lib/hostContract';

export function CartDrawer() {
  const { items, isOpen, closeCart, removeItem, updateQuantity, cartTotal, totalItems } = useCart();
  const totals = cartTotal();
  const location = useLocation();
  const navigate = useNavigate();

  // Navigate from a real <button>, so the checkout control is not a button nested
  // inside an anchor (invalid markup and an ambiguous automation target).
  function goToCheckout(): void {
    closeCart();
    navigate('/checkout');
  }

  useEffect(() => {
    closeCart();
  }, [location.pathname, closeCart]);

  return (
    <>
      {/* Overlay */}
      <div
        className={`fixed inset-0 z-40 bg-[var(--color-ink)]/40 backdrop-blur-sm transition-opacity duration-300 ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={closeCart}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        className={`fixed top-0 right-0 bottom-0 z-50 w-full max-w-[420px] bg-[var(--color-paper)] border-l border-[var(--color-border)] flex flex-col shadow-2xl transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        role="dialog"
        aria-label="Shopping cart"
        aria-modal="true"
        id="cart-drawer"
        {...aihubRole(AIHUB_ROLE.cartDrawer)}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border)]">
          <h2 className="text-[15px] font-[500] text-[var(--color-ink)]">Cart ({totalItems()} items)</h2>
          <button
            onClick={closeCart}
            className="text-[var(--color-muted)] hover:text-[var(--color-ink)] transition-colors"
            aria-label="Close cart"
          >
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M15 5 5 15M5 5l10 10" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center gap-3 py-20">
              <svg width="40" height="40" viewBox="0 0 20 20" fill="none" stroke="var(--color-border)" strokeWidth="1.4">
                <path d="M6 2 3 6v12a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V6l-3-4z" />
                <path d="M3 6h14" strokeLinecap="round" />
                <path d="M13 10a3 3 0 0 1-6 0" />
              </svg>
              <p className="text-[13px] text-[var(--color-muted)]">Your cart is empty.</p>
            </div>
          ) : (
            items.map(({ product, quantity }) => (
              <div
                key={product.id}
                className="flex gap-3 p-3 rounded-[10px] bg-[var(--color-surface)] border border-[var(--color-border)]"
                {...aihubRole(AIHUB_ROLE.cartLineItem)}
                data-product-id={product.id}
                data-entity-name={product.name}
                data-quantity={quantity}
              >
                <div className="w-16 h-16 rounded-[8px] bg-[var(--color-accent-contrast)] flex-shrink-0 overflow-hidden">
                  <ProductImage
                    src={product.image_url}
                    alt={product.name}
                    className="w-full h-full object-contain p-1.5"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-[500] text-[var(--color-ink)] truncate">{product.name}</p>
                  <p className="text-[11px] text-[var(--color-accent)] mt-0.5">{money(product.price, product.currency)}</p>
                  <p className="text-[11px] text-[var(--color-muted)]">Variant: standard</p>
                  <div className="flex items-center gap-2 mt-2">
                    <button
                      onClick={() => updateQuantity(product.id, quantity - 1)}
                      className="w-6 h-6 rounded-[6px] border border-[var(--color-border)] text-[var(--color-ink)] flex items-center justify-center hover:bg-[var(--color-border)] transition-colors text-sm"
                    >
                      −
                    </button>
                    <span className="text-[12px] font-[500] w-4 text-center">{quantity}</span>
                    <button
                      onClick={() => updateQuantity(product.id, quantity + 1)}
                      className="w-6 h-6 rounded-[6px] border border-[var(--color-border)] text-[var(--color-ink)] flex items-center justify-center hover:bg-[var(--color-border)] transition-colors text-sm"
                      disabled={product.stock !== null && quantity >= product.stock}
                    >
                      +
                    </button>
                    <button
                      onClick={() => removeItem(product.id)}
                      className="ml-auto text-[11px] text-[var(--color-muted)] transition-colors"
                      type="button"
                      {...aihubRole(AIHUB_ROLE.removeFromCart)}
                      {...aihubProductIdentity(product)}
                      aria-label={`Remove ${product.name} from cart`}
                    >
                      Remove
                    </button>
                  </div>
                  <button className="mt-2 text-[11px] text-[var(--color-muted)]" type="button">Save for later</button>
                </div>
              </div>
            ))
          )}
          {items.length > 0 ? <CartCrossSell /> : null}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="px-6 py-5 border-t border-[var(--color-border)] space-y-3">
            <div className="flex justify-between text-[13px] text-[var(--color-muted)]">
              <span>Items</span>
              <span className="font-[500] text-[var(--color-ink)]">{money(totals.subtotal)}</span>
            </div>
            <div className="flex justify-between text-[13px] text-[var(--color-muted)]">
              <span>Delivery</span>
              <span className="font-[500] text-[var(--color-ink)]">Free</span>
            </div>
            <div className="flex justify-between text-[13px] text-[var(--color-muted)]">
              <span>Discount</span>
              <span className="font-[500] text-[var(--color-ink)]">-{money(totals.discount)}</span>
            </div>
            <div className="flex justify-between border-t border-[var(--color-border)] pt-3 text-[14px] text-[var(--color-ink)]">
              <span>Total</span>
              <span className="font-[500]">{money(totals.total)}</span>
            </div>
            {totals.discount ? <p className="text-[11px] text-[var(--color-muted)]">You save {money(totals.discount)} on this order.</p> : null}
            <Button
              {...(isOpen ? aihubRole(AIHUB_ROLE.checkout) : {})}
              className="w-full h-11"
              onClick={goToCheckout}
            >
              Proceed to checkout
            </Button>
          </div>
        )}
      </div>
    </>
  );
}
