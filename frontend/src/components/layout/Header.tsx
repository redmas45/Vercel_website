import { Link, NavLink } from 'react-router-dom';
import { useCart } from '../../hooks/useCart';
import { SearchBar } from './SearchBar';
import { AIHUB_NAV_ATTR, AIHUB_ROLE, aihubRole } from '../../lib/hostContract';

// [route, label, nav-key]. The nav-key is a stable, vertical-neutral handle an
// assistant can navigate to without reading the storefront's URLs or labels.
const NAV_LINKS = [
  ['/', 'Home', 'home'],
  ['/shop', 'Shop', 'shop'],
  ['/new', 'New', 'new'],
  ['/sale', 'Sale', 'sale'],
] as const;

export function Header() {
  const { totalItems, openCart } = useCart();
  const count = totalItems();

  return (
    <header className="sticky top-0 z-40 bg-[var(--color-paper)] border-b border-[var(--color-border)] backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-[1200px] items-center justify-between gap-2 px-3 sm:gap-4 sm:px-6">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 shrink-0">
          <span className="w-7 h-7 rounded-[6px] bg-[var(--color-ink)] text-white text-[11px] font-[500] flex items-center justify-center">
            AK
          </span>
          <span className="hidden text-[14px] font-[500] text-[var(--color-ink)] sm:inline">AI-KART</span>
        </Link>

        {/* Nav */}
        <nav className="hidden md:flex items-center gap-6">
          {NAV_LINKS.map(([href, label, navKey]) => {
            return (
              <NavLink
                key={href}
                to={href}
                {...aihubRole(AIHUB_ROLE.navLink)}
                {...{ [AIHUB_NAV_ATTR]: navKey }}
                className={({ isActive }) =>
                  `text-[13px] transition-colors ${
                    isActive
                      ? 'text-[var(--color-ink)] font-[500]'
                      : 'text-[var(--color-muted)] hover:text-[var(--color-ink)]'
                  }`
                }
              >
                {label}
              </NavLink>
            );
          })}
        </nav>

        {/* Right actions */}
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <Link
            to="/login"
            {...aihubRole(AIHUB_ROLE.navLink)}
            {...{ [AIHUB_NAV_ATTR]: 'login' }}
            className="hidden sm:inline text-[12px] font-[500] text-[var(--color-muted)] hover:text-[var(--color-ink)] transition-colors"
          >
            Login
          </Link>
          <SearchBar />

          {/* The cart icon opens the slide-out drawer for mouse users. The cart
              also has its own real page at /cart; publish it as a navigable nav
              target so an assistant (or a keyboard user) can reach the cart route
              itself, not only the drawer. It carries no visual weight, so the
              header design is unchanged. */}
          <NavLink
            to="/cart"
            {...aihubRole(AIHUB_ROLE.navLink)}
            {...{ [AIHUB_NAV_ATTR]: 'cart' }}
            className="sr-only"
          >
            Cart page
          </NavLink>
          <button
            onClick={openCart}
            className="relative text-[var(--color-muted)] hover:text-[var(--color-ink)] transition-colors"
            aria-label={`Cart (${count} items)`}
            id="cart-icon-btn"
            {...aihubRole(AIHUB_ROLE.cartButton)}
            data-cart-count={count}
          >
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M6 2 3 6v12a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V6l-3-4z" />
              <path d="M3 6h14" strokeLinecap="round" />
              <path d="M13 10a3 3 0 0 1-6 0" />
            </svg>
            {/* The visible badge is hidden at zero. `data-cart-count` on the
                button (above) is always present, so automation can read and
                verify the cart total in every state, including empty. */}
            {count > 0 && (
              <span
                aria-hidden="true"
                className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 bg-[var(--color-accent)] text-white text-[9px] font-[500] rounded-full flex items-center justify-center"
              >
                {count}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
