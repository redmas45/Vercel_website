export function ActiveFilterPills({ params, onRemove, onClear }: { params: URLSearchParams; onRemove: (key: string) => void; onClear: () => void }) {
  const entries = Array.from(params.entries()).filter(([key]) => !['page', 'per_page', 'sort'].includes(key));
  if (!entries.length) return null;
  return (
    <div className="flex flex-wrap items-center gap-2">
      {entries.map(([key, value]) => (
        <button key={key} className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1 text-[12px] text-[var(--color-muted)]" type="button" onClick={() => onRemove(key)}>
          {label(key, value)} x
        </button>
      ))}
      <button className="px-2 py-1 text-[12px] text-[var(--color-accent)]" type="button" onClick={onClear}>Clear all</button>
    </div>
  );
}

function label(key: string, value: string): string {
  if (key === 'discount_min') return `${value}% off or more`;
  if (key === 'rating_min') return `${value}+ stars`;
  if (key === 'price_min') return `From Rs ${Number(value).toLocaleString('en-IN')}`;
  if (key === 'price_max') return `Under Rs ${Number(value).toLocaleString('en-IN')}`;
  if (key === 'new_arrival') return 'New arrivals';
  if (key === 'bestseller') return 'Bestsellers';
  if (key === 'in_stock') return 'In stock';
  return `${key.replace(/_/g, ' ')}: ${value}`;
}
