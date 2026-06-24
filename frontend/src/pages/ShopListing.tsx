import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ActiveFilterPills } from '../components/shop/ActiveFilterPills';
import { FilterRail } from '../components/shop/FilterRail';
import { Pagination } from '../components/shop/Pagination';
import { ProductGrid } from '../components/product/ProductGrid';
import { listProductResult } from '../lib/productApi';
import type { Product, ProductListMeta } from '../lib/types';

type ShopPreset = 'new' | 'sale';

export function ShopListing({ forcedQuery, preset }: { forcedQuery?: string; preset?: ShopPreset }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [meta, setMeta] = useState<ProductListMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const searchKey = searchParams.toString();
  const query = forcedQuery ?? searchParams.get('q') ?? '';
  const page = Number(searchParams.get('page') || 1);
  const filters = useMemo(() => new URLSearchParams(searchKey), [searchKey]);
  const effectiveFilters = useMemo(() => {
    const next = new URLSearchParams(searchKey);
    if (preset === 'new') {
      next.set('new_arrival', 'true');
      if (!next.get('sort')) next.set('sort', 'newest');
    }
    if (preset === 'sale') {
      next.set('discount_min', next.get('discount_min') || '30');
      if (!next.get('sort')) next.set('sort', 'popularity');
    }
    return next;
  }, [searchKey, preset]);

  useEffect(() => {
    setLoading(true);
    setError('');
    listProductResult({
      category: effectiveFilters.get('category') || undefined,
      subcategory: effectiveFilters.get('subcategory') || undefined,
      brand: effectiveFilters.get('brand') || undefined,
      price_min: numberParam(effectiveFilters, 'price_min'),
      price_max: numberParam(effectiveFilters, 'price_max'),
      rating_min: numberParam(effectiveFilters, 'rating_min'),
      discount_min: numberParam(effectiveFilters, 'discount_min'),
      in_stock: effectiveFilters.get('in_stock') === 'true' ? true : undefined,
      new_arrival: effectiveFilters.get('new_arrival') === 'true' ? true : undefined,
      bestseller: effectiveFilters.get('bestseller') === 'true' ? true : undefined,
      sort: effectiveFilters.get('sort') || 'relevance',
      page,
      per_page: 24,
      q: query || undefined,
    })
      .then((result) => {
        setProducts(result.products);
        setMeta(result.meta);
      })
      .catch(() => setError('Something went wrong.'))
      .finally(() => setLoading(false));
  }, [effectiveFilters, query, page]);

  function changeFilter(key: string, value: string): void {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete('page');
    setSearchParams(next);
  }

  function clearFilters(): void {
    const next = new URLSearchParams();
    if (query) next.set('q', query);
    setSearchParams(next);
  }

  const count = meta?.total ?? products.length;
  const title = query
    ? `${count} results for "${query}"`
    : preset === 'new'
      ? `${count} new arrivals`
      : preset === 'sale'
        ? `${count} sale deals`
        : `${count} products`;

  return (
    <main className="mx-auto max-w-[1240px] px-4 py-6 md:px-6 md:py-10">
      <div className="grid gap-6 md:grid-cols-[260px_minmax(0,1fr)]">
        <FilterRail meta={meta} filters={effectiveFilters} onChange={changeFilter} onClear={clearFilters} />
        <section className="min-w-0">
          <div className="mb-5 grid gap-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h1 className="text-[20px] font-[500] text-[var(--color-ink)]">{title}</h1>
              <select className="h-9 rounded-[8px] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-[12px]" value={effectiveFilters.get('sort') || 'relevance'} onChange={(event) => changeFilter('sort', event.target.value)}>
                <option value="relevance">Relevance</option>
                <option value="price_asc">Price: low to high</option>
                <option value="price_desc">Price: high to low</option>
                <option value="newest">Newest first</option>
                <option value="rating_desc">Rating</option>
                <option value="popularity">Popularity</option>
              </select>
            </div>
            <ActiveFilterPills params={filters} onRemove={(key) => changeFilter(key, '')} onClear={clearFilters} />
          </div>
          {error ? (
            <div className="rounded-[8px] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 text-[13px] text-[var(--color-muted)]">
              {error} <button className="text-[var(--color-accent)]" type="button" onClick={() => setSearchParams(new URLSearchParams(searchParams))}>Retry</button>
            </div>
          ) : (
            <>
              <ProductGrid products={products} loading={loading} />
              <Pagination page={meta?.page ?? page} totalPages={meta?.total_pages ?? 0} onPage={(nextPage) => changeFilter('page', String(nextPage))} />
            </>
          )}
        </section>
      </div>
    </main>
  );
}

function numberParam(params: URLSearchParams, key: string): number | undefined {
  const raw = params.get(key);
  if (!raw) return undefined;
  const value = Number(raw);
  return Number.isFinite(value) ? value : undefined;
}
