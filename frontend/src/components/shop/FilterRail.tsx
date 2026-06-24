import type { ProductListMeta } from '../../lib/types';
import { money } from '../../lib/format';

const CATEGORIES = ['electronics', 'fashion-men', 'fashion-women', 'home-kitchen', 'beauty-personal-care', 'sports-fitness', 'books-stationery', 'food-grocery'];
const RATINGS = [4, 3];
const DISCOUNTS = [10, 30, 50];

export function FilterRail({
  meta,
  filters,
  onChange,
  onClear,
}: {
  meta: ProductListMeta | null;
  filters: URLSearchParams;
  onChange: (key: string, value: string) => void;
  onClear: () => void;
}) {
  const category = filters.get('category') || '';
  const brand = filters.get('brand') || '';
  return (
    <aside className="grid gap-6 rounded-[8px] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 md:sticky md:top-20">
      <div className="flex items-center justify-between">
        <h2 className="text-[13px] font-[500] uppercase tracking-[0.08em] text-[var(--color-muted)]">Filters</h2>
        <button className="text-[12px] text-[var(--color-accent)]" type="button" onClick={onClear}>Clear all</button>
      </div>
      <FilterGroup title="Category">
        <Radio label="All" active={!category} onClick={() => onChange('category', '')} />
        {CATEGORIES.map((item) => <Radio key={item} label={label(item)} active={category === item} onClick={() => onChange('category', item)} />)}
      </FilterGroup>
      <FilterGroup title="Brand">
        {(meta?.facets.brands || []).slice(0, 8).map((item) => (
          <Checkbox key={item.name} label={`${item.name} (${item.count})`} active={brand.split(',').includes(item.name)} onClick={() => toggleCsv(filters, 'brand', item.name, onChange)} />
        ))}
      </FilterGroup>
      <FilterGroup title="Price range">
        <div className="grid grid-cols-2 gap-2">
          <input className="h-9 rounded-[8px] border border-[var(--color-border)] px-2 text-[12px]" placeholder={money(meta?.facets.price_range.min || 0)} value={filters.get('price_min') || ''} onChange={(event) => onChange('price_min', event.target.value)} />
          <input className="h-9 rounded-[8px] border border-[var(--color-border)] px-2 text-[12px]" placeholder={money(meta?.facets.price_range.max || 0)} value={filters.get('price_max') || ''} onChange={(event) => onChange('price_max', event.target.value)} />
        </div>
      </FilterGroup>
      <FilterGroup title="Customer rating">
        {RATINGS.map((item) => <Checkbox key={item} label={`${item} star and above`} active={filters.get('rating_min') === String(item)} onClick={() => onChange('rating_min', filters.get('rating_min') === String(item) ? '' : String(item))} />)}
      </FilterGroup>
      <FilterGroup title="Discount">
        {DISCOUNTS.map((item) => <Checkbox key={item} label={`${item}% or more`} active={filters.get('discount_min') === String(item)} onClick={() => onChange('discount_min', filters.get('discount_min') === String(item) ? '' : String(item))} />)}
      </FilterGroup>
      <FilterGroup title="Availability">
        <Checkbox label="In stock only" active={filters.get('in_stock') === 'true'} onClick={() => onChange('in_stock', filters.get('in_stock') === 'true' ? '' : 'true')} />
      </FilterGroup>
    </aside>
  );
}

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return <section><h3 className="mb-2 text-[12px] font-[500] text-[var(--color-ink)]">{title}</h3><div className="grid gap-2">{children}</div></section>;
}

function Radio({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return <button className={`text-left text-[12px] ${active ? 'font-[500] text-[var(--color-ink)]' : 'text-[var(--color-muted)]'}`} type="button" onClick={onClick}>{active ? '●' : '○'} {label}</button>;
}

function Checkbox({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return <button className={`text-left text-[12px] ${active ? 'font-[500] text-[var(--color-ink)]' : 'text-[var(--color-muted)]'}`} type="button" onClick={onClick}>{active ? '☑' : '☐'} {label}</button>;
}

function toggleCsv(params: URLSearchParams, key: string, value: string, onChange: (key: string, value: string) => void): void {
  const parts = (params.get(key) || '').split(',').filter(Boolean);
  const next = parts.includes(value) ? parts.filter((item) => item !== value) : [...parts, value];
  onChange(key, next.join(','));
}

function label(value: string): string {
  return value.replace(/-/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}
