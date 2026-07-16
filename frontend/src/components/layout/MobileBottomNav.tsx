import { Link } from 'react-router-dom';
import { useCart } from '../../hooks/useCart';

export function MobileBottomNav() {
  const { openCart, totalItems } = useCart();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-[var(--color-border)] bg-[var(--color-surface)] text-[11px] text-[var(--color-muted)] md:hidden">
      <Link className="grid min-h-12 place-items-center text-center" to="/">Home</Link>
      <Link className="grid min-h-12 place-items-center text-center" to="/search">Search</Link>
      <Link className="grid min-h-12 place-items-center text-center" to="/account/wishlist">Wishlist</Link>
      <button className="grid min-h-12 place-items-center text-center" type="button" onClick={openCart}>Cart ({totalItems()})</button>
      <Link className="grid min-h-12 place-items-center text-center" to="/account">Account</Link>
    </nav>
  );
}
