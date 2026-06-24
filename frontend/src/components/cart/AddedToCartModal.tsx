import { Link, useLocation } from 'react-router-dom';
import { useEffect, useRef } from 'react';
import { useCart } from '../../hooks/useCart';
import { money } from '../../lib/format';

const DISMISS_MS = 8000;

export function AddedToCartModal() {
  const { lastAdded, clearLastAdded, cartTotal } = useCart();
  const location = useLocation();
  const previousPath = useRef(location.pathname);

  useEffect(() => {
    if (!lastAdded) return;
    const timer = window.setTimeout(clearLastAdded, DISMISS_MS);
    return () => window.clearTimeout(timer);
  }, [lastAdded, clearLastAdded]);

  useEffect(() => {
    if (previousPath.current === location.pathname) return;
    previousPath.current = location.pathname;
    clearLastAdded();
  }, [location.pathname, clearLastAdded]);

  if (!lastAdded) return null;

  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-[var(--color-ink)]/30 px-4" onClick={clearLastAdded}>
      <section className="w-full max-w-[380px] rounded-[8px] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <h2 className="text-[16px] font-[500] text-[var(--color-ink)]">Added to cart</h2>
        <div className="mt-3 flex gap-3 border-y border-[var(--color-border)] py-3">
          <img className="h-16 w-16 rounded-[8px] object-contain" src={lastAdded.product.image_url} alt="" />
          <div>
            <p className="text-[13px] text-[var(--color-ink)]">{lastAdded.product.name}</p>
            <p className="text-[12px] text-[var(--color-muted)]">{money(lastAdded.product.price, lastAdded.product.currency)} - {lastAdded.quantity} item</p>
          </div>
        </div>
        <div className="mt-4 grid gap-2">
          <button className="h-10 rounded-[8px] border border-[var(--color-border)] text-[13px]" type="button" onClick={clearLastAdded}>Continue shopping</button>
          <Link className="grid h-10 place-items-center rounded-[8px] bg-[var(--color-ink)] text-[13px] text-[var(--color-paper)]" to="/cart" onClick={clearLastAdded}>
            View cart ({money(cartTotal().total)})
          </Link>
        </div>
      </section>
    </div>
  );
}
