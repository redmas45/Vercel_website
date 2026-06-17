import { Link } from 'react-router-dom';

const CATEGORIES = ['Shirts', 'Hoodies', 'Jackets', 'Headwear', 'Bags', 'Drinkware', 'Electronics', 'Kids', 'Pets'];

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
              {CATEGORIES.slice(0, 5).map((cat) => (
                <li key={cat}>
                  <Link
                    to={`/shop?category=${cat.toLowerCase()}`}
                    className="text-[13px] text-[var(--color-paper)] opacity-70 hover:opacity-100 transition-opacity"
                  >
                    {cat}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Info */}
          <div>
            <p className="text-[10px] uppercase tracking-[0.08em] text-[var(--color-muted)] mb-4">Info</p>
            <ul className="space-y-2.5">
              {['About', 'FAQ', 'Shipping & Returns', 'Privacy Policy', 'Terms & Conditions'].map((item) => (
                <li key={item}>
                  <Link
                    to={`/${item.toLowerCase().replace(/\s+/g, '-').replace(/&/g, 'and')}`}
                    className="text-[13px] text-[var(--color-paper)] opacity-70 hover:opacity-100 transition-opacity"
                  >
                    {item}
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
