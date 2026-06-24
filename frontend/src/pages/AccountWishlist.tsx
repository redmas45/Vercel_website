import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ProductGrid } from '../components/product/ProductGrid';
import { useCart } from '../hooks/useCart';
import { listWishlist } from '../lib/accountApi';
import type { Product } from '../lib/types';

export function AccountWishlist() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const { addItem, openCart } = useCart();

  useEffect(() => {
    listWishlist()
      .then((items) => setProducts(items.map((item) => item.product)))
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="mx-auto max-w-[1040px] px-4 py-10 md:px-6">
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-[22px] font-[500] text-[var(--color-ink)]">Saved items</h1>
        <Link className="text-[13px] text-[var(--color-accent)]" to="/account">Account</Link>
      </div>
      <ProductGrid products={products} loading={loading} />
      {products.length ? (
        <button className="mt-5 rounded-[8px] bg-[var(--color-ink)] px-4 py-2 text-[13px] text-[var(--color-paper)]" type="button" onClick={() => { products.forEach((product) => addItem(product)); openCart(); }}>
          Move all to cart
        </button>
      ) : null}
    </main>
  );
}
