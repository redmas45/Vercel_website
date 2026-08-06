import { Link } from 'react-router-dom';
import { useCart } from '../hooks/useCart';
import { Button } from '../components/ui/Button';
import { money } from '../lib/format';
import { productPath } from '../lib/productRoutes';
import { ProductImage } from '../components/ui/ProductImage';
import { AIHUB_ROLE, aihubRole } from '../lib/hostContract';

export function Cart() {
  const { items, removeItem, updateQuantity, clearCart, cartTotal } = useCart();
  const totals = cartTotal();

  if (items.length === 0) {
    return (
      <main className="max-w-[600px] mx-auto px-6 py-24 text-center">
        <h1 className="text-[22px] font-[500] text-[var(--color-ink)] mb-4">Your cart</h1>
        <p className="text-[13px] text-[var(--color-muted)] mb-8">Nothing here yet. Browse the catalog and add something you like.</p>
        <Link to="/shop"><Button>Go to shop</Button></Link>
      </main>
    );
  }

  return (
    <main className="max-w-[1000px] mx-auto px-6 py-12">
      <h1 className="text-[22px] font-[500] text-[var(--color-ink)] mb-8">Your cart</h1>
      <div className="grid gap-8 md:grid-cols-[1fr_320px]">
        <div className="space-y-3">
          {items.map(({ product, quantity }) => (
            <div key={product.id} className="flex gap-4 rounded-[8px] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
              <ProductImage className="h-20 w-20 rounded-[8px] object-contain" src={product.image_url} alt={product.name} />
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <Link to={productPath(product)} className="truncate text-[13px] font-[500] text-[var(--color-ink)]">{product.name}</Link>
                  <span className="shrink-0 text-[13px] font-[500] text-[var(--color-accent)]">{money(product.price * quantity, product.currency)}</span>
                </div>
                <p className="mt-1 text-[11px] text-[var(--color-muted)]">{money(product.price, product.currency)} each</p>
                <div className="mt-3 flex items-center gap-3">
                  <button className="h-8 w-8 rounded-[8px] border border-[var(--color-border)]" onClick={() => updateQuantity(product.id, quantity - 1)} type="button">-</button>
                  <span className="text-[12px] font-[500]">{quantity}</span>
                  <button className="h-8 w-8 rounded-[8px] border border-[var(--color-border)] disabled:cursor-not-allowed disabled:text-[var(--color-muted)]" onClick={() => updateQuantity(product.id, quantity + 1)} type="button" disabled={product.stock !== null && quantity >= product.stock}>+</button>
                  <button className="ml-auto text-[11px] text-[var(--color-muted)]" onClick={() => removeItem(product.id)} type="button">Remove</button>
                </div>
              </div>
            </div>
          ))}
          <button {...aihubRole(AIHUB_ROLE.clearCart)} className="text-[11px] text-[var(--color-muted)]" onClick={clearCart} type="button">Clear cart</button>
        </div>
        <aside className="sticky top-20 rounded-[8px] border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
          <h2 className="mb-4 text-[14px] font-[500] text-[var(--color-ink)]">Price details</h2>
          <Row label="Items" value={money(totals.subtotal)} />
          <Row label="Delivery" value="Free" />
          <Row label="Discount" value={`-${money(totals.discount)}`} />
          <div className="mt-4 flex justify-between border-t border-[var(--color-border)] pt-4 text-[14px] font-[500]">
            <span>Total</span><span>{money(totals.total)}</span>
          </div>
          <Link className="mt-5 block" to="/checkout"><Button className="h-11 w-full">Proceed to checkout</Button></Link>
        </aside>
      </div>
    </main>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return <div className="mb-2 flex justify-between text-[13px] text-[var(--color-muted)]"><span>{label}</span><span>{value}</span></div>;
}
