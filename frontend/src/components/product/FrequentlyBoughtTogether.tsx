import { useState } from 'react';
import { useCart } from '../../hooks/useCart';
import { money } from '../../lib/format';
import type { Product } from '../../lib/types';

export function FrequentlyBoughtTogether({ product, products }: { product: Product; products: Product[] }) {
  const { addItem, openCart } = useCart();
  const bundle = [product, ...products].slice(0, 3);
  const [selected, setSelected] = useState<string[]>(bundle.map((item) => item.id));
  if (bundle.length < 2) return null;

  const total = bundle.filter((item) => selected.includes(item.id)).reduce((sum, item) => sum + item.price, 0);

  function addSelected(): void {
    bundle.filter((item) => selected.includes(item.id)).forEach((item) => addItem(item));
    openCart();
  }

  return (
    <section className="scroll-mt-24 rounded-[8px] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      <h2 className="text-[16px] font-[500] text-[var(--color-ink)]">Frequently bought together</h2>
      <div className="mt-4 grid gap-5">
        <div className="min-w-0 pb-2">
          <div className="flex items-start justify-between gap-2">
          {bundle.map((item, index) => (
            <div key={item.id} className="flex items-center gap-2">
              {index ? <span className="text-[18px] text-[var(--color-muted)]">+</span> : null}
              <div className="grid w-[88px] gap-2">
                <div className="grid aspect-square place-items-center rounded-[8px] border border-[var(--color-border)] bg-[var(--color-paper)]">
                  <img className="h-full w-full object-contain p-2" src={item.image_url} alt="" />
                </div>
                <p className="line-clamp-2 text-[11px] leading-snug text-[var(--color-muted)]">{item.name}</p>
              </div>
            </div>
          ))}
          </div>
        </div>
        <div className="rounded-[8px] border border-[var(--color-border)] bg-[var(--color-paper)] p-3">
          <p className="text-[12px] text-[var(--color-muted)]">Bundle total</p>
          <p className="mt-1 text-[20px] font-[500] text-[var(--color-ink)]">{money(total, product.currency)}</p>
          <div className="mt-3 grid gap-2">
          {bundle.map((item) => (
            <label key={item.id} className="grid grid-cols-[18px_minmax(0,1fr)_auto] items-start gap-2 text-[12px] text-[var(--color-ink)]">
              <input
                className="mt-0.5"
                type="checkbox"
                checked={selected.includes(item.id)}
                onChange={(event) => {
                  setSelected((current) => event.target.checked ? [...current, item.id] : current.filter((id) => id !== item.id));
                }}
              />
              <span className="line-clamp-2 leading-snug">{item.name}</span>
              <span className="whitespace-nowrap text-[var(--color-muted)]">{money(item.price, item.currency)}</span>
            </label>
          ))}
          </div>
          <button className="mt-4 h-10 w-full rounded-[8px] bg-[var(--color-ink)] px-4 text-[13px] text-[var(--color-paper)]" type="button" onClick={addSelected}>
            Add selected items
          </button>
        </div>
      </div>
    </section>
  );
}
