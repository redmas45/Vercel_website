import type { Product } from '../../lib/types';

export function ProductTable({
  products,
  onDelete,
}: {
  products: Product[];
  onDelete: (productId: string) => void;
}) {
  return (
    <section className="rounded-[10px] border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
      <h2 className="text-[16px] text-[var(--color-ink)]">Products</h2>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-left text-[13px]">
          <thead className="text-[11px] uppercase tracking-[0.06em] text-[var(--color-muted)]">
            <tr>
              <th className="py-2 pr-4">Item</th>
              <th className="py-2 pr-4">Category</th>
              <th className="py-2 pr-4">Price</th>
              <th className="py-2 pr-4">Stock</th>
              <th className="py-2 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product.id} className="border-t border-[var(--color-border)]">
                <td className="py-3 pr-4">
                  <div className="flex items-center gap-3">
                    {product.image_url ? (
                      <img
                        className="h-12 w-12 rounded-[8px] object-contain bg-[var(--color-paper)]"
                        src={product.image_url}
                        alt=""
                      />
                    ) : null}
                    <div>
                      <p className="font-[500] text-[var(--color-ink)]">{product.name}</p>
                      <p className="text-[11px] text-[var(--color-muted)]">{product.id}</p>
                    </div>
                  </div>
                </td>
                <td className="py-3 pr-4">{product.category || '-'}</td>
                <td className="py-3 pr-4">${product.price.toFixed(2)}</td>
                <td className="py-3 pr-4">{product.stock ?? '-'}</td>
                <td className="py-3 text-right">
                  <button className="text-red-600" type="button" onClick={() => onDelete(product.id)}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
