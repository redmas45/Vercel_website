import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CountdownTimer } from '../components/ui/CountdownTimer';
import { ProductCardSkeleton } from '../components/ui/Skeleton';
import { ProductCard } from '../components/product/ProductCard';
import { RecommendationRail } from '../components/product/RecommendationRail';
import { useRecentlyViewed } from '../hooks/useRecentlyViewed';
import { listProducts } from '../lib/productApi';
import { productPath } from '../lib/productRoutes';
import type { Product } from '../lib/types';

const HERO_SLIDES = [
  { title: 'Shop with your voice', copy: 'Ask the AI assistant to find products, compare options, and add items to cart.', href: '/shop' },
  { title: 'Fresh deals every day', copy: 'Browse high-discount picks across electronics, fashion, home, and beauty.', href: '/shop?discount_min=30&sort=price_asc' },
  { title: 'Built for smarter discovery', copy: 'Use filters, ratings, reviews, and bundles to buy with more context.', href: '/shop?sort=popularity' },
];

const CATEGORIES = [
  ['Phones', '/shop?subcategory=Smartphones'],
  ['Laptops', '/shop?subcategory=Laptops'],
  ["Men's fashion", '/shop?category=fashion-men'],
  ["Women's fashion", '/shop?category=fashion-women'],
  ['Home', '/shop?category=home-kitchen'],
  ['Beauty', '/shop?category=beauty-personal-care'],
  ['Fitness', '/shop?category=sports-fitness'],
  ['Books', '/shop?category=books-stationery'],
] as const;

export function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [slide, setSlide] = useState(0);
  const recentlyViewed = useRecentlyViewed();

  useEffect(() => {
    listProducts({ per_page: 96, sort: 'popularity' })
      .then(setProducts)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setSlide((value) => (value + 1) % HERO_SLIDES.length), 5000);
    return () => window.clearInterval(timer);
  }, []);

  const featured = products.filter((product) => product.is_featured).slice(0, 4);
  const deals = products.filter((product) => (product.discount_percent || 0) >= 30).sort((a, b) => (b.discount_percent || 0) - (a.discount_percent || 0)).slice(0, 12);
  const arrivals = products.filter((product) => product.is_new_arrival).slice(0, 12);
  const bestsellers = products.filter((product) => product.is_bestseller).sort((a, b) => (b.review_count || 0) - (a.review_count || 0)).slice(0, 12);
  const currentSlide = HERO_SLIDES[slide];

  return (
    <main>
      <section className="relative overflow-hidden bg-[var(--color-accent)]">
        <div className="mx-auto grid min-h-[520px] max-w-[1240px] gap-8 px-6 py-12 md:grid-cols-[minmax(0,1fr)_520px] md:items-center">
          <div className="text-[var(--color-paper)]">
            <p className="mb-4 text-[11px] uppercase tracking-[0.08em] opacity-80">AI-KART storefront</p>
            <h1 className="text-[42px] font-[500] leading-none md:text-[68px]">{currentSlide.title}</h1>
            <p className="mt-5 max-w-[420px] text-[14px] leading-6 opacity-80">{currentSlide.copy}</p>
            <Link className="mt-8 inline-grid h-11 place-items-center rounded-[8px] bg-[var(--color-ink)] px-6 text-[13px] text-[var(--color-paper)]" to={currentSlide.href}>Browse catalog</Link>
          </div>
          <div className="relative min-h-[280px]">
            {(featured.length ? featured : products.slice(0, 4)).map((product, index) => (
              <Link
                key={product.id}
                className="absolute w-[150px] rounded-[8px] border border-[var(--color-border)] bg-[var(--color-surface)] p-3 shadow-xl transition-transform hover:scale-105 md:w-[190px]"
                style={{ left: `${(index % 2) * 45 + 4}%`, top: `${Math.floor(index / 2) * 42 + 2}%` }}
                to={productPath(product)}
              >
                <img className="aspect-square w-full object-contain" src={product.image_url} alt={product.name} loading={index === 0 ? 'eager' : 'lazy'} />
                <p className="mt-2 truncate text-[12px] font-[500] text-[var(--color-ink)]">{product.name}</p>
              </Link>
            ))}
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-6 rounded-t-[40px] bg-[var(--color-paper)]" />
      </section>

      <section className="mx-auto max-w-[1240px] px-4 py-8 md:px-6">
        <div className="grid auto-cols-[120px] grid-flow-col gap-3 overflow-x-auto pb-2">
          {CATEGORIES.map(([label, href]) => (
            <Link key={label} className="grid place-items-center gap-2 rounded-[8px] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-center text-[12px] text-[var(--color-ink)]" to={href}>
              <span className="grid h-12 w-12 place-items-center rounded-full bg-[var(--color-paper)] text-[18px]">{label.slice(0, 1)}</span>
              {label}
            </Link>
          ))}
        </div>
      </section>

      <section className="bg-[var(--color-ink)] py-8">
        <div className="mx-auto max-w-[1240px] px-4 md:px-6">
          <div className="mb-4 flex items-center justify-between text-[var(--color-paper)]">
            <h2 className="text-[18px] font-[500]">Deals of the day</h2>
            <p className="text-[13px]">Ends in <CountdownTimer /></p>
          </div>
          <ProductRail products={deals} loading={loading} dark />
        </div>
      </section>

      <section className="mx-auto max-w-[1240px] px-4 py-8 md:px-6">
        <RecommendationRail title="New arrivals" products={arrivals} />
        <TopCategories />
        <RecommendationRail title="Best sellers" products={bestsellers} />
        <Link className="my-8 block rounded-[8px] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 text-[18px] font-[500] text-[var(--color-ink)]" to="/shop?sort=popularity">
          Trending across AI-KART
        </Link>
        <RecommendationRail title="Continue where you left off" products={recentlyViewed} />
      </section>
    </main>
  );
}

function ProductRail({ products, loading }: { products: Product[]; loading: boolean; dark?: boolean }) {
  if (loading) {
    return <div className="grid auto-cols-[180px] grid-flow-col gap-3 overflow-x-auto">{Array.from({ length: 6 }).map((_, index) => <ProductCardSkeleton key={index} />)}</div>;
  }
  return <div className="grid auto-cols-[190px] grid-flow-col gap-3 overflow-x-auto pb-2">{products.map((product) => <ProductCard key={product.id} product={product} />)}</div>;
}

function TopCategories() {
  const items = useMemo(() => CATEGORIES.slice(0, 8), []);
  return (
    <section className="py-8">
      <h2 className="mb-4 text-[16px] font-[500] text-[var(--color-ink)]">Top categories</h2>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {items.map(([label, href]) => (
          <Link key={label} className="grid min-h-[140px] content-end rounded-[8px] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-[14px] font-[500] text-[var(--color-ink)]" to={href}>
            {label}
          </Link>
        ))}
      </div>
    </section>
  );
}
