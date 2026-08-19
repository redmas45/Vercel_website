import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { searchSuggestions } from '../../lib/productApi';
import { productPath } from '../../lib/productRoutes';
import type { Product } from '../../lib/types';
import { ProductImage } from '../ui/ProductImage';
import { AIHUB_ROLE, aihubRole } from '../../lib/hostContract';

const SEARCH_DELAY_MS = 300;
const POPULAR_SEARCHES = ['Laptop', 'Saree', 'Air Fryer', 'Sneakers'];

// The storefront's half of the filter contract: which canonical hard-filter keys
// this search form accepts, and the URL parameter each maps to. ShopListing reads
// these same URL keys, so a canonical filter set by an assistant becomes a real
// filtered results page. The website owns this mapping; the Hub only speaks the
// canonical names.
const FILTER_SLOTS: ReadonlyArray<{ canonical: string; urlKey: string }> = [
  { canonical: 'max_price', urlKey: 'price_max' },
  { canonical: 'min_price', urlKey: 'price_min' },
  { canonical: 'min_rating', urlKey: 'rating_min' },
  { canonical: 'brand', urlKey: 'brand' },
  { canonical: 'category', urlKey: 'category' },
  // A display limit ("top 3"): render exactly this many, so the on-screen count
  // matches what the assistant says aloud instead of the full result page.
  { canonical: 'limit', urlKey: 'limit' },
];

export function SearchBar() {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<Product[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Closing always drops stale results so a later reopen never flashes suggestions
  // that belong to an earlier query.
  const closePanel = useCallback(() => {
    setOpen(false);
    setSuggestions([]);
  }, []);

  useEffect(() => {
    function focusSearch(event: KeyboardEvent): void {
      if (event.key !== '/' || event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
      event.preventDefault();
      setOpen(true);
      inputRef.current?.focus();
    }
    window.addEventListener('keydown', focusSearch);
    return () => window.removeEventListener('keydown', focusSearch);
  }, []);

  // The header lives outside <Routes>, so SearchBar survives navigation. Any route
  // change (Login, a suggestion link, a popular chip) must dismiss the panel.
  useEffect(() => {
    closePanel();
  }, [location.pathname, location.search, closePanel]);

  // Outside interaction closes. Using pointerdown on the container (not input blur)
  // keeps clicks *inside* the panel working: their onClick still runs.
  useEffect(() => {
    if (!open) return;
    function handlePointerDown(event: PointerEvent): void {
      if (containerRef.current?.contains(event.target as Node)) return;
      closePanel();
    }
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [open, closePanel]);

  useEffect(() => {
    if (!open) return;
    function handleEscape(event: KeyboardEvent): void {
      if (event.key !== 'Escape') return;
      closePanel();
      inputRef.current?.blur();
    }
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [open, closePanel]);

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      if (!open || !query.trim()) {
        setSuggestions([]);
        return;
      }
      searchSuggestions(query)
        .then((products) => { if (!cancelled) setSuggestions(products); })
        .catch(() => { if (!cancelled) setSuggestions([]); });
    }, SEARCH_DELAY_MS);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [open, query]);

  // Build the search destination from the query plus any hard filters the form
  // carries. The filter slots are published as hidden inputs (below): an assistant
  // sets their values by the vertical-neutral canonical marker, and the storefront
  // maps each to its own URL key here — the input's `name` is that key. This keeps
  // filtered search (e.g. "phones under 20000") a single SPA move that ShopListing
  // renders straight from the URL, with no reload.
  function searchDestination(form: HTMLFormElement | null | undefined, cleanQuery: string): string {
    const params = new URLSearchParams();
    params.set('q', cleanQuery);
    form?.querySelectorAll<HTMLInputElement>('[data-aihub-filter]').forEach((field) => {
      const value = field.value.trim();
      if (value && field.name) params.set(field.name, value);
    });
    return `/search?${params.toString()}`;
  }

  function submit(): void {
    const clean = query.trim();
    if (!clean) return;
    navigate(searchDestination(inputRef.current?.form, clean));
    closePanel();
  }

  // A real <form> so a submit — from Enter, the submit control, or an assistant's
  // requestSubmit() — takes one path. Reading the value from the field on submit
  // (not only from React state) means a programmatic value set is honored even if
  // React state has not yet caught up to the dispatched input event.
  function handleSubmit(event: React.FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const fieldValue = inputRef.current?.value ?? '';
    const clean = fieldValue.trim() || query.trim();
    if (!clean) return;
    navigate(searchDestination(event.currentTarget, clean));
    closePanel();
  }

  return (
    <div className="relative" ref={containerRef}>
      <form
        className={`flex h-9 items-center rounded-[8px] border border-[var(--color-border)] bg-[var(--color-surface)] transition-all ${open ? 'w-[min(224px,calc(100vw-96px))] sm:w-[min(320px,70vw)]' : 'w-9'}`}
        role="search"
        onSubmit={handleSubmit}
        {...aihubRole(AIHUB_ROLE.searchForm)}
      >
        <button
          className="grid h-9 w-9 shrink-0 place-items-center text-[var(--color-muted)]"
          type={open ? 'submit' : 'button'}
          aria-label="Search"
          aria-expanded={open}
          aria-controls="search-suggestions"
          onClick={() => { if (!open) { setOpen(true); inputRef.current?.focus(); } }}
          {...aihubRole(AIHUB_ROLE.searchSubmit)}
        >
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="9" cy="9" r="6" /><path d="m15 15 3 3" strokeLinecap="round" /></svg>
        </button>
        {open ? (
          <input
            ref={inputRef}
            name="q"
            type="search"
            className="min-w-0 flex-1 bg-transparent pr-3 text-[13px] outline-none"
            aria-label="Search products"
            value={query}
            placeholder="Search products..."
            onChange={(event) => setQuery(event.target.value)}
            {...aihubRole(AIHUB_ROLE.searchInput)}
          />
        ) : null}
        {/* Published, always-present filter slots. An assistant addresses each by
            its vertical-neutral canonical marker (`data-aihub-filter`) and the
            storefront owns the URL key (`name`). Uncontrolled so a programmatic
            value set survives to submit; hidden so they carry no visual weight. */}
        {FILTER_SLOTS.map(({ canonical, urlKey }) => (
          <input key={canonical} type="hidden" name={urlKey} data-aihub-filter={canonical} defaultValue="" />
        ))}
      </form>
      {open ? (
        <div id="search-suggestions" role="region" aria-label="Search suggestions" className="fixed left-3 right-3 top-[60px] z-50 max-h-[calc(100dvh-72px)] overflow-y-auto rounded-[8px] border border-[var(--color-border)] bg-[var(--color-surface)] p-3 shadow-xl sm:absolute sm:left-auto sm:right-0 sm:top-11 sm:w-[min(360px,calc(100vw-24px))]">
          <p className="text-[11px] uppercase tracking-[0.08em] text-[var(--color-muted)]">Suggestions</p>
          <div className="mt-2 grid gap-1">
            {suggestions.map((product) => (
              <Link key={product.id} className="flex items-center gap-3 rounded-[8px] px-2 py-2 hover:bg-[var(--color-paper)]" to={productPath(product)} onClick={closePanel}>
                <ProductImage className="h-9 w-9 rounded-[6px] object-contain" src={product.image_url} alt="" />
                <span className="text-[12px] text-[var(--color-ink)]">{product.name}</span>
              </Link>
            ))}
            {query ? <button className="rounded-[8px] px-2 py-2 text-left text-[12px] text-[var(--color-accent)]" type="button" onClick={submit}>See all results for "{query}"</button> : null}
          </div>
          <p className="mt-3 text-[11px] uppercase tracking-[0.08em] text-[var(--color-muted)]">Popular searches</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {POPULAR_SEARCHES.map((term) => (
              <Link key={term} className="rounded-full border border-[var(--color-border)] px-3 py-1 text-[12px] text-[var(--color-muted)]" to={`/search?q=${encodeURIComponent(term)}`} onClick={closePanel}>{term}</Link>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
