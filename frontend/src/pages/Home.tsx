import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listProducts } from '../lib/api';
import type { Product } from '../lib/types';
import { ProductCard } from '../components/product/ProductCard';
import { Button } from '../components/ui/Button';

// Products shown as floating hero cards with subtle rotation
const HERO_PRODUCTS_COUNT = 3;
const CARD_ROTATIONS = [-5, 2, -2.5];

export function Home() {
  const [featured, setFeatured] = useState<Product[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listProducts()
      .then((products) => {
        setFeatured(products.slice(0, HERO_PRODUCTS_COUNT));
        setAllProducts(products.slice(0, 8));
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <main>
      {/* ── Hero ── */}
      <section
        className="relative bg-[var(--color-accent)] overflow-hidden"
        style={{ minHeight: 'clamp(460px, 55vh, 620px)' }}
      >
        <div className="max-w-[1200px] mx-auto px-6 pt-16 pb-10 flex flex-col md:flex-row items-center gap-10 h-full">
          {/* Text */}
          <div className="flex-1 z-10">
            <p className="text-[10px] uppercase tracking-[0.08em] text-[var(--color-accent-contrast)] opacity-80 mb-4">
              New season
            </p>
            <h1
              className="text-[var(--color-accent-contrast)] font-[500] leading-[0.98]"
              style={{ fontSize: 'clamp(36px, 6vw, 72px)' }}
            >
              Shop with<br />your voice.
            </h1>
            <p className="mt-5 text-[14px] text-[var(--color-accent-contrast)] opacity-70 max-w-[360px] leading-relaxed">
              Tell the AI assistant what you need. Browse, add to cart, and checkout — hands free.
            </p>
            <div className="mt-8 flex items-center gap-3">
              <Link to="/shop">
                <Button
                  className="bg-[var(--color-ink)] text-[var(--color-paper)] hover:opacity-90 border-0 h-11 px-6 text-[13px]"
                >
                  Browse catalog
                </Button>
              </Link>
              <span className="text-[12px] text-[var(--color-accent-contrast)] opacity-60">
                or just ask the orb →
              </span>
            </div>
          </div>

          {/* Floating product cards */}
          <div className="relative flex-1 flex items-center justify-center h-[300px] md:h-auto">
            {featured.map((product, i) => (
              <Link
                key={product.id}
                to={`/product/${product.id}`}
                className="hero-float-card absolute w-[140px] md:w-[160px] rounded-[10px] bg-[var(--color-surface)] border border-[var(--color-border)] p-3 hover:scale-105 transition-transform duration-300 shadow-lg"
                style={{
                  transform: `rotate(${CARD_ROTATIONS[i]}deg)`,
                  left: `${15 + i * 28}%`,
                  top: `${10 + (i % 2) * 20}%`,
                  zIndex: i + 1,
                }}
              >
                <div className="aspect-square rounded-[8px] bg-[var(--color-accent-contrast)] mb-2 overflow-hidden">
                  <img
                    src={product.image_url}
                    alt={product.name}
                    className="w-full h-full object-contain p-3 mix-blend-multiply"
                  />
                </div>
                <p className="text-[10px] font-[500] text-[var(--color-ink)] truncate">{product.name}</p>
                <p className="text-[10px] text-[var(--color-accent-dark)]">${product.price}</p>
              </Link>
            ))}
          </div>
        </div>

        {/* Bottom wave / curve separator */}
        <div className="absolute bottom-0 left-0 right-0 h-6 bg-[var(--color-paper)] rounded-t-[40px]" />
      </section>

      {/* ── Featured products ── */}
      <section className="max-w-[1200px] mx-auto px-6 py-16">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-[16px] font-[500] text-[var(--color-ink)]">Featured products</h2>
          <Link
            to="/shop"
            className="text-[12px] text-[var(--color-muted)] hover:text-[var(--color-ink)] transition-colors"
          >
            View all →
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="rounded-[10px] bg-[var(--color-border)] animate-pulse aspect-[3/4]" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {allProducts.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </section>

      {/* ── CTA band ── */}
      <section className="bg-[var(--color-ink)] py-16 px-6 text-center">
        <p className="text-[10px] uppercase tracking-[0.08em] text-[var(--color-muted)] mb-4">
          AI-powered
        </p>
        <h2 className="text-[var(--color-paper)] font-[500] text-[clamp(24px,4vw,44px)] leading-tight mb-6">
          Try saying:<br />
          <span className="text-[var(--color-accent)]">"Show me hoodies under $60"</span>
        </h2>
        <p className="text-[13px] text-[var(--color-muted)] max-w-[400px] mx-auto">
          Tap the voice orb in the bottom-right corner to start shopping with your voice.
        </p>
      </section>
    </main>
  );
}
