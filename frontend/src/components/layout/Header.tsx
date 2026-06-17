import { Link, NavLink } from 'react-router-dom';
import { useCart } from '../../hooks/useCart';

export function Header() {
  const { totalItems, openCart } = useCart();
  const count = totalItems();

  return (
    <header className="sticky top-0 z-40 bg-[var(--color-paper)] border-b border-[var(--color-border)] backdrop-blur-sm">
      <div className="max-w-[1200px] mx-auto px-6 h-14 flex items-center justify-between gap-6">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 shrink-0">
          <span className="w-7 h-7 rounded-[6px] bg-[var(--color-ink)] text-white text-[11px] font-[500] flex items-center justify-center">
            AK
          </span>
          <span className="text-[14px] font-[500] text-[var(--color-ink)]">AI-KART</span>
        </Link>

        {/* Nav */}
        <nav className="hidden md:flex items-center gap-6">
          {(['/', '/shop', '/shop?category=new', '/shop?category=sale'] as const).map((href, i) => {
            const labels = ['Home', 'Shop', 'New', 'Sale'];
            return (
              <NavLink
                key={href}
                to={href}
                className={({ isActive }) =>
                  `text-[13px] transition-colors ${
                    isActive
                      ? 'text-[var(--color-ink)] font-[500]'
                      : 'text-[var(--color-muted)] hover:text-[var(--color-ink)]'
                  }`
                }
              >
                {labels[i]}
              </NavLink>
            );
          })}
        </nav>

        {/* Right actions */}
        <div className="flex items-center gap-3">
          <Link
            to="/shop"
            className="text-[var(--color-muted)] hover:text-[var(--color-ink)] transition-colors"
            aria-label="Search"
          >
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8">
              <circle cx="9" cy="9" r="6" />
              <path d="m15 15 3 3" strokeLinecap="round" />
            </svg>
          </Link>

          <button
            onClick={openCart}
            className="relative text-[var(--color-muted)] hover:text-[var(--color-ink)] transition-colors"
            aria-label={`Cart (${count} items)`}
            id="cart-icon-btn"
          >
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M6 2 3 6v12a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V6l-3-4z" />
              <path d="M3 6h14" strokeLinecap="round" />
              <path d="M13 10a3 3 0 0 1-6 0" />
            </svg>
            {count > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 bg-[var(--color-accent)] text-white text-[9px] font-[500] rounded-full flex items-center justify-center">
                {count}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
