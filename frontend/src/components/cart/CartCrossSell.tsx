import { useEffect, useState } from 'react';
import { useCart } from '../../hooks/useCart';
import { cartSuggestions } from '../../lib/productApi';
import type { Product } from '../../lib/types';
import { money } from '../../lib/format';

export function CartCrossSell() {
  const { items, addItem } = useCart();
  const [suggestions, setSuggestions] = useState<Product[]>([]);

  useEffect(() => {
    cartSuggestions(items.map((item) => item.product.id)).then(setSuggestions).catch(() => setSuggestions([]));
  }, [items]);

  if (!suggestions.length) return null;

  return (
    <section className="border-t border-[var(--color-border)] pt-4">
      <h3 className="mb-3 text-[13px] font-[500] text-[var(--color-ink)]">People also buy</h3>
      <div className="grid grid-cols-2 gap-2">
        {suggestions.slice(0, 4).map((product) => (
          <button key={product.id} className="rounded-[8px] border border-[var(--color-border)] bg-[var(--color-surface)] p-2 text-left" type="button" onClick={() => addItem(product)}>
            <img className="h-16 w-full object-contain" src={product.image_url} alt="" />
            <p className="mt-1 truncate text-[11px] text-[var(--color-ink)]">{product.name}</p>
            <p className="text-[11px] text-[var(--color-accent)]">{money(product.price, product.currency)}</p>
          </button>
        ))}
      </div>
    </section>
  );
}
