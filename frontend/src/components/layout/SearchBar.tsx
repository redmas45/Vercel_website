import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { searchSuggestions } from '../../lib/productApi';
import { productPath } from '../../lib/productRoutes';
import type { Product } from '../../lib/types';

const SEARCH_DELAY_MS = 300;
const POPULAR_SEARCHES = ['Laptop', 'Saree', 'Air Fryer', 'Sneakers'];

export function SearchBar() {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<Product[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

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

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (!query.trim()) {
        setSuggestions([]);
        return;
      }
      searchSuggestions(query).then(setSuggestions).catch(() => setSuggestions([]));
    }, SEARCH_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [query]);

  function submit(): void {
    const clean = query.trim();
    if (!clean) return;
    navigate(`/search?q=${encodeURIComponent(clean)}`);
    setOpen(false);
  }

  return (
    <div className="relative">
      <div className={`flex h-9 items-center rounded-[8px] border border-[var(--color-border)] bg-[var(--color-surface)] transition-all ${open ? 'w-[min(320px,70vw)]' : 'w-9'}`}>
        <button className="grid h-9 w-9 shrink-0 place-items-center text-[var(--color-muted)]" type="button" aria-label="Search" onClick={() => { setOpen(true); inputRef.current?.focus(); }}>
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="9" cy="9" r="6" /><path d="m15 15 3 3" strokeLinecap="round" /></svg>
        </button>
        {open ? (
          <input
            ref={inputRef}
            className="min-w-0 flex-1 bg-transparent pr-3 text-[13px] outline-none"
            value={query}
            placeholder="Search products..."
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => { if (event.key === 'Enter') submit(); }}
          />
        ) : null}
      </div>
      {open ? (
        <div className="absolute right-0 top-11 z-50 w-[min(360px,calc(100vw-24px))] rounded-[8px] border border-[var(--color-border)] bg-[var(--color-surface)] p-3 shadow-xl">
          <p className="text-[11px] uppercase tracking-[0.08em] text-[var(--color-muted)]">Suggestions</p>
          <div className="mt-2 grid gap-1">
            {suggestions.map((product) => (
              <Link key={product.id} className="flex items-center gap-3 rounded-[8px] px-2 py-2 hover:bg-[var(--color-paper)]" to={productPath(product)} onClick={() => setOpen(false)}>
                <img className="h-9 w-9 rounded-[6px] object-contain" src={product.image_url} alt="" />
                <span className="text-[12px] text-[var(--color-ink)]">{product.name}</span>
              </Link>
            ))}
            {query ? <button className="rounded-[8px] px-2 py-2 text-left text-[12px] text-[var(--color-accent)]" type="button" onClick={submit}>See all results for "{query}"</button> : null}
          </div>
          <p className="mt-3 text-[11px] uppercase tracking-[0.08em] text-[var(--color-muted)]">Popular searches</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {POPULAR_SEARCHES.map((term) => (
              <Link key={term} className="rounded-full border border-[var(--color-border)] px-3 py-1 text-[12px] text-[var(--color-muted)]" to={`/search?q=${encodeURIComponent(term)}`} onClick={() => setOpen(false)}>{term}</Link>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
