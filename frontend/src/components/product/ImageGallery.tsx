import { useState } from 'react';
import type { Product } from '../../lib/types';
import { percentText, productImages } from '../../lib/format';
import { ProductImage } from '../ui/ProductImage';

export function ImageGallery({ product }: { product: Product }) {
  const images = productImages(product);
  const [active, setActive] = useState(images[0] ?? product.image_url);

  return (
    <section className="grid gap-3 md:grid-cols-[72px_minmax(0,1fr)]">
      <div className="order-2 flex gap-2 overflow-x-auto md:order-1 md:grid md:overflow-visible">
        {images.map((image) => (
          <button
            key={image}
            className={`aspect-square w-16 shrink-0 rounded-[8px] border bg-[var(--color-surface)] p-1 ${active === image ? 'border-[var(--color-ink)]' : 'border-[var(--color-border)]'}`}
            type="button"
            onClick={() => setActive(image)}
          >
            <ProductImage className="h-full w-full object-contain" src={image} alt="" />
          </button>
        ))}
      </div>
      <div className="group relative order-1 aspect-square overflow-hidden rounded-[8px] border border-[var(--color-border)] bg-[var(--color-accent-contrast)] md:order-2">
        <ProductImage
          className="h-full w-full object-contain p-5 transition-transform duration-300 group-hover:scale-[1.7]"
          src={active}
          alt={product.name}
          loading="eager"
        />
        <div className="absolute left-3 top-3 flex gap-2">
          {product.is_new_arrival ? <Badge label="New" /> : null}
          {product.is_bestseller ? <Badge label="Bestseller" /> : null}
          {product.discount_percent ? <Badge label={percentText(product.discount_percent)} /> : null}
        </div>
      </div>
    </section>
  );
}

function Badge({ label }: { label: string }) {
  return <span className="rounded-full bg-[var(--color-ink)] px-3 py-1 text-[11px] text-[var(--color-paper)]">{label}</span>;
}
