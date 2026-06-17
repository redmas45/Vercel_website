import { Link } from 'react-router-dom';
import { useCart } from '../hooks/useCart';
import { Button } from '../components/ui/Button';

export function Cart() {
  const { items, removeItem, updateQuantity, totalPrice, clearCart } = useCart();

  if (items.length === 0) {
    return (
      <main className="max-w-[600px] mx-auto px-6 py-24 text-center">
        <h1 className="text-[22px] font-[500] text-[var(--color-ink)] mb-4">Your cart</h1>
        <p className="text-[13px] text-[var(--color-muted)] mb-8">Nothing here yet. Browse the catalog and add something you like.</p>
        <Link to="/shop">
          <Button>Go to shop</Button>
        </Link>
      </main>
    );
  }

  return (
    <main className="max-w-[1000px] mx-auto px-6 py-12">
      <h1 className="text-[22px] font-[500] text-[var(--color-ink)] mb-8">Your cart</h1>

      <div className="grid md:grid-cols-[1fr_300px] gap-8 items-start">
        {/* Items */}
        <div className="space-y-3">
          {items.map(({ product, quantity }) => (
            <div
              key={product.id}
              className="flex gap-4 p-4 rounded-[10px] bg-[var(--color-surface)] border border-[var(--color-border)]"
            >
              <div className="w-20 h-20 rounded-[8px] bg-[var(--color-accent-contrast)] flex-shrink-0 overflow-hidden">
                <img
                  src={product.image_url}
                  alt={product.name}
                  className="w-full h-full object-contain p-2 mix-blend-multiply"
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <Link to={`/product/${product.id}`} className="text-[13px] font-[500] text-[var(--color-ink)] hover:underline underline-offset-2 truncate">
                    {product.name}
                  </Link>
                  <span className="text-[13px] font-[500] text-[var(--color-accent-dark)] shrink-0">
                    ${(product.price * quantity).toFixed(2)}
                  </span>
                </div>
                <p className="text-[11px] text-[var(--color-muted)] mt-0.5">${product.price.toFixed(2)} each</p>
                <div className="flex items-center gap-3 mt-3">
                  <div className="flex items-center gap-2 border border-[var(--color-border)] rounded-[8px] overflow-hidden">
                    <button
                      onClick={() => updateQuantity(product.id, quantity - 1)}
                      className="w-8 h-8 flex items-center justify-center text-[var(--color-muted)] hover:text-[var(--color-ink)] hover:bg-[var(--color-border)] transition-colors"
                    >
                      −
                    </button>
                    <span className="text-[12px] font-[500] px-1">{quantity}</span>
                    <button
                      onClick={() => updateQuantity(product.id, quantity + 1)}
                      className="w-8 h-8 flex items-center justify-center text-[var(--color-muted)] hover:text-[var(--color-ink)] hover:bg-[var(--color-border)] transition-colors"
                    >
                      +
                    </button>
                  </div>
                  <button
                    onClick={() => removeItem(product.id)}
                    className="text-[11px] text-[var(--color-muted)] hover:text-red-500 transition-colors"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>
          ))}

          <button
            onClick={clearCart}
            className="text-[11px] text-[var(--color-muted)] hover:text-red-500 transition-colors mt-2"
          >
            Clear cart
          </button>
        </div>

        {/* Summary */}
        <div className="rounded-[10px] bg-[var(--color-surface)] border border-[var(--color-border)] p-5 sticky top-20">
          <h2 className="text-[14px] font-[500] text-[var(--color-ink)] mb-4">Order summary</h2>
          <div className="flex justify-between text-[13px] text-[var(--color-muted)] mb-2">
            <span>Subtotal</span>
            <span>${totalPrice().toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-[13px] text-[var(--color-muted)] mb-5">
            <span>Shipping</span>
            <span>Calculated at checkout</span>
          </div>
          <div className="flex justify-between text-[14px] font-[500] text-[var(--color-ink)] pt-4 border-t border-[var(--color-border)] mb-5">
            <span>Total</span>
            <span>${totalPrice().toFixed(2)} USD</span>
          </div>
          <Button className="w-full h-11" onClick={() => alert('Checkout coming soon!')}>
            Proceed to checkout
          </Button>
        </div>
      </div>
    </main>
  );
}
