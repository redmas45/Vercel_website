import { useMemo, useState } from 'react';
import type { ProductVariant } from '../../lib/types';

export function VariantSelector({ variants }: { variants: ProductVariant[] | null }) {
  const grouped = useMemo(() => groupVariants(variants || []), [variants]);
  const [selected, setSelected] = useState<Record<string, string>>({});
  const entries = Object.entries(grouped);

  if (!entries.length) return null;

  return (
    <section className="grid gap-3 border-y border-[var(--color-border)] py-4">
      {entries.map(([type, items]) => (
        <div key={type}>
          <p className="mb-2 text-[12px] text-[var(--color-muted)] capitalize">{type}</p>
          <div className="flex flex-wrap gap-2">
            {items.map((item) => {
              const active = selected[type] === item.name;
              const disabled = item.in_stock === false;
              return (
                <button
                  key={item.name}
                  className={`h-9 rounded-[8px] border px-3 text-[12px] ${active ? 'border-[var(--color-ink)] bg-[var(--color-ink)] text-[var(--color-paper)]' : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-ink)]'} ${disabled ? 'line-through opacity-50' : ''}`}
                  type="button"
                  disabled={disabled}
                  onClick={() => setSelected((current) => ({ ...current, [type]: item.name }))}
                >
                  {item.name}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </section>
  );
}

function groupVariants(variants: ProductVariant[]): Record<string, ProductVariant[]> {
  return variants.reduce<Record<string, ProductVariant[]>>((groups, variant) => {
    const key = variant.type || 'option';
    groups[key] = [...(groups[key] || []), variant];
    return groups;
  }, {});
}
