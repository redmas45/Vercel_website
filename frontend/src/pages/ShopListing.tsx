import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { listProducts } from '../lib/api';
import type { Product } from '../lib/types';
import { ProductGrid } from '../components/product/ProductGrid';

const ALL_CATEGORIES = [
  'bags', 'drinkware', 'electronics', 'footware', 'headwear',
  'hoodies', 'jackets', 'kids', 'pets', 'shirts', 'stickers',
];

export function ShopListing() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const selectedCategory = searchParams.get('category') ?? '';
  const searchQuery = searchParams.get('q') ?? '';

  useEffect(() => {
    setLoading(true);
    setError(null);
    listProducts({
      category: selectedCategory || undefined,
      q: searchQuery || undefined,
    })
      .then(setProducts)
      .catch(() => setError('Failed to load products.'))
      .finally(() => setLoading(false));
  }, [selectedCategory, searchQuery]);

  function selectCategory(cat: string) {
    const params = new URLSearchParams(searchParams);
    if (cat) params.set('category', cat);
    else params.delete('category');
    params.delete('q');
    setSearchParams(params);
  }

  return (
    <main className="max-w-[1200px] mx-auto px-6 py-10">
      {/* Search bar */}
      <div className="mb-8">
        <input
          type="search"
          placeholder="Search products..."
          defaultValue={searchQuery}
          className="w-full max-w-[400px] h-9 px-3 rounded-[10px] border border-[var(--color-border)] bg-[var(--color-surface)] text-[13px] text-[var(--color-ink)] placeholder:text-[var(--color-muted)] focus:outline-none focus:border-[var(--color-muted)] transition-colors"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              const val = (e.target as HTMLInputElement).value.trim();
              const params = new URLSearchParams(searchParams);
              if (val) params.set('q', val);
              else params.delete('q');
              setSearchParams(params);
            }
          }}
          id="shop-search-input"
        />
      </div>

      <div className="flex gap-8 items-start">
        {/* ── Left filter rail (desktop) ── */}
        <aside className="hidden md:block w-[130px] shrink-0 sticky top-20">
          <p className="text-[10px] uppercase tracking-[0.07em] text-[var(--color-muted)] mb-4">Category</p>
          <ul className="space-y-1.5">
            <li>
              <button
                onClick={() => selectCategory('')}
                className={`text-[13px] transition-colors text-left w-full ${
                  !selectedCategory
                    ? 'text-[var(--color-ink)] font-[500]'
                    : 'text-[var(--color-muted)] hover:text-[var(--color-ink)]'
                }`}
              >
                All
              </button>
            </li>
            {ALL_CATEGORIES.map((cat) => (
              <li key={cat}>
                <button
                  onClick={() => selectCategory(cat)}
                  className={`text-[13px] transition-colors text-left w-full capitalize ${
                    selectedCategory === cat
                      ? 'text-[var(--color-ink)] font-[500]'
                      : 'text-[var(--color-muted)] hover:text-[var(--color-ink)]'
                  }`}
                >
                  {cat}
                </button>
              </li>
            ))}
          </ul>
        </aside>

        {/* ── Mobile: horizontal pill chips ── */}
        <div className="md:hidden flex gap-2 overflow-x-auto pb-2 mb-4 w-full">
          <button
            onClick={() => selectCategory('')}
            className={`shrink-0 px-3 h-7 rounded-full text-[11px] font-[500] border transition-colors ${
              !selectedCategory
                ? 'bg-[var(--color-ink)] text-white border-[var(--color-ink)]'
                : 'bg-[var(--color-surface)] text-[var(--color-muted)] border-[var(--color-border)]'
            }`}
          >
            All
          </button>
          {ALL_CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => selectCategory(cat)}
              className={`shrink-0 px-3 h-7 rounded-full text-[11px] font-[500] border transition-colors capitalize ${
                selectedCategory === cat
                  ? 'bg-[var(--color-ink)] text-white border-[var(--color-ink)]'
                  : 'bg-[var(--color-surface)] text-[var(--color-muted)] border-[var(--color-border)]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* ── Product grid ── */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-5">
            <h1 className="text-[15px] font-[500] text-[var(--color-ink)]">
              {selectedCategory
                ? `${selectedCategory.charAt(0).toUpperCase() + selectedCategory.slice(1)}`
                : searchQuery
                ? `Results for "${searchQuery}"`
                : 'All products'}
            </h1>
            {!loading && (
              <span className="text-[12px] text-[var(--color-muted)]">
                {products.length} {products.length === 1 ? 'item' : 'items'}
              </span>
            )}
          </div>

          {error ? (
            <p className="text-red-500 text-[13px]">{error}</p>
          ) : (
            <ProductGrid products={products} loading={loading} />
          )}
        </div>
      </div>
    </main>
  );
}
