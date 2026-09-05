import { Link } from 'react-router-dom';
import { AIHUB_NAV_ATTR, AIHUB_ROLE, aihubRole } from '../../lib/hostContract';

// [label, route, nav-key]. These are the storefront's category destinations, and
// the footer is the one place they appear on every page - so publishing them with
// stable nav keys is what lets an assistant open a section from anywhere without
// knowing this site's URL shape. The key is the storefront's own category handle.
const SHOP_LINKS = [
  ['Electronics', '/shop?category=electronics', 'electronics'],
  ["Men's fashion", '/shop?category=fashion-men', 'fashion-men'],
  ["Women's fashion", '/shop?category=fashion-women', 'fashion-women'],
  ['Home & kitchen', '/shop?category=home-kitchen', 'home-kitchen'],
  ['Beauty', '/shop?category=beauty-personal-care', 'beauty-personal-care'],
  ['Sports & fitness', '/shop?category=sports-fitness', 'sports-fitness'],
  ['Books & stationery', '/shop?category=books-stationery', 'books-stationery'],
  ['Food & grocery', '/shop?category=food-grocery', 'food-grocery'],
  ["Kids' fashion", '/shop?category=fashion-kids', 'fashion-kids'],
  ['Pets', '/shop?category=pets', 'pets'],
] as const;

// [label, route, nav-key]. Same shape as SHOP_LINKS, and for the same reason: an
// assistant that has to guess which URL is the returns page will guess wrong. A
// crawl of this footer without declared keys mapped "contact" onto a product page.
const INFO_LINKS = [
  ['About', '/about', 'about'],
  ['FAQ', '/faq', 'faq'],
  ['Shipping & Returns', '/shipping-and-returns', 'shipping-and-returns'],
  ['Shipping Policy', '/shipping-policy', 'shipping-policy'],
  ['Return Policy', '/return-policy', 'return-policy'],
  ['Support', '/support', 'support'],
  ['Contact Us', '/contact', 'contact'],
  ['Privacy Policy', '/privacy-policy', 'privacy-policy'],
  ['Terms & Conditions', '/terms-and-conditions', 'terms-and-conditions'],
] as const;

export function Footer() {
  return (
    <footer className="bg-[var(--color-ink)] text-[var(--color-paper)] mt-24">
      <div className="max-w-[1200px] mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2.5 mb-4">
              <span className="w-7 h-7 rounded-[6px] bg-[var(--color-accent)] text-white text-[11px] font-[500] flex items-center justify-center">
                AK
              </span>
              <span className="text-[14px] font-[500]">AI-KART</span>
            </div>
            <p className="text-[13px] text-[var(--color-muted)] leading-relaxed max-w-[220px]">
              A voice-powered shopping experience for the modern world.
            </p>
          </div>

          {/* Shop */}
          <div>
            <p className="text-[10px] uppercase tracking-[0.08em] text-[var(--color-muted)] mb-4">Shop</p>
            <ul className="space-y-2.5">
              {SHOP_LINKS.map(([label, href, navKey]) => (
                <li key={href}>
                  <Link
                    to={href}
                    {...aihubRole(AIHUB_ROLE.navLink)}
                    {...{ [AIHUB_NAV_ATTR]: navKey }}
                    className="text-[13px] text-[var(--color-paper)] opacity-70 hover:opacity-100 transition-opacity"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Info */}
          <div>
            <p className="text-[10px] uppercase tracking-[0.08em] text-[var(--color-muted)] mb-4">Info</p>
            <ul className="space-y-2.5">
              {INFO_LINKS.map(([label, href, navKey]) => (
                <li key={href}>
                  <Link
                    to={href}
                    {...aihubRole(AIHUB_ROLE.navLink)}
                    {...{ [AIHUB_NAV_ATTR]: navKey }}
                    className="text-[13px] text-[var(--color-paper)] opacity-70 hover:opacity-100 transition-opacity"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-14 pt-6 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-4 text-[12px] text-[var(--color-muted)]">
          <p>© {new Date().getFullYear()} AI-KART. All rights reserved.</p>
          <p>Powered by AI voice shopping</p>
        </div>
      </div>
    </footer>
  );
}
