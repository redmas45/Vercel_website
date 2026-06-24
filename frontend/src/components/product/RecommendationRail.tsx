import type { Product } from '../../lib/types';
import { ProductCard } from './ProductCard';

export function RecommendationRail({ title, products }: { title: string; products: Product[] }) {
  if (!products.length) return null;
  return (
    <section className="py-8">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-[16px] font-[500] text-[var(--color-ink)]">{title}</h2>
      </div>
      <div className="grid auto-cols-[180px] grid-flow-col gap-3 overflow-x-auto pb-2 md:auto-cols-[220px]">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
}
