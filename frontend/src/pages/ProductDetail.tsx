import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getProduct } from '../lib/api';
import type { Product } from '../lib/types';
import { useCart } from '../hooks/useCart';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';

export function ProductDetail() {
  const { productId } = useParams<{ productId: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [added, setAdded] = useState(false);
  const { addItem, openCart } = useCart();

  useEffect(() => {
    if (!productId) return;
    setLoading(true);
    getProduct(productId)
      .then(setProduct)
      .catch(() => setError('Product not found.'))
      .finally(() => setLoading(false));
  }, [productId]);

  function handleAdd() {
    if (!product) return;
    addItem(product);
    setAdded(true);
    setTimeout(() => setAdded(false), 1800);
    openCart();
  }

  if (loading) {
    return (
      <main className="max-w-[1200px] mx-auto px-6 py-16">
        <div className="grid md:grid-cols-2 gap-12">
          <div className="aspect-square rounded-[10px] bg-[var(--color-border)] animate-pulse" />
          <div className="space-y-4">
            <div className="h-4 w-1/3 bg-[var(--color-border)] rounded animate-pulse" />
            <div className="h-10 w-2/3 bg-[var(--color-border)] rounded animate-pulse" />
            <div className="h-6 w-1/4 bg-[var(--color-border)] rounded animate-pulse" />
          </div>
        </div>
      </main>
    );
  }

  if (error || !product) {
    return (
      <main className="max-w-[1200px] mx-auto px-6 py-16 text-center">
        <p className="text-[var(--color-muted)] text-[13px]">{error ?? 'Product not found.'}</p>
        <Link to="/shop" className="mt-4 inline-block text-[13px] text-[var(--color-ink)] underline underline-offset-2">
          Back to shop
        </Link>
      </main>
    );
  }

  return (
    <main className="max-w-[1200px] mx-auto px-6 py-12">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-[11px] text-[var(--color-muted)] mb-8">
        <Link to="/" className="hover:text-[var(--color-ink)] transition-colors">Home</Link>
        <span>/</span>
        <Link to="/shop" className="hover:text-[var(--color-ink)] transition-colors">Shop</Link>
        {product.category && (
          <>
            <span>/</span>
            <Link
              to={`/shop?category=${product.category}`}
              className="hover:text-[var(--color-ink)] transition-colors capitalize"
            >
              {product.category}
            </Link>
          </>
        )}
        <span>/</span>
        <span className="text-[var(--color-ink)]">{product.name}</span>
      </nav>

      <div className="grid md:grid-cols-2 gap-12 items-start">
        {/* Image */}
        <div className="aspect-square rounded-[10px] bg-[var(--color-accent-contrast)] flex items-center justify-center overflow-hidden border border-[var(--color-border)]">
          <img
            src={product.image_url}
            alt={product.name}
            className="w-4/5 h-4/5 object-contain mix-blend-multiply"
          />
        </div>

        {/* Info */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <p className="text-[10px] uppercase tracking-[0.08em] text-[var(--color-accent-dark)]">
              {product.brand}
            </p>
            {product.category && (
              <Badge>{product.category}</Badge>
            )}
          </div>

          <h1
            className="text-[var(--color-ink)] font-[500] leading-[1.05]"
            style={{ fontSize: 'clamp(28px, 4vw, 48px)' }}
          >
            {product.name}
          </h1>

          <p className="text-[22px] font-[500] text-[var(--color-accent)] mt-4">
            ${product.price.toFixed(2)}{' '}
            <span className="text-[14px] text-[var(--color-muted)] font-[400]">{product.currency}</span>
          </p>

          {product.description && (
            <p className="mt-5 text-[13px] text-[var(--color-muted)] leading-relaxed max-w-[440px]">
              {product.description}
            </p>
          )}

          <div className="mt-8 flex gap-3">
            <Button
              onClick={handleAdd}
              className="h-11 px-8 text-[13px]"
              id="add-to-cart-btn"
            >
              {added ? 'Added ✓' : 'Add to cart'}
            </Button>
            <Link to="/shop">
              <Button variant="secondary" className="h-11 px-6 text-[13px]">
                Back to catalog
              </Button>
            </Link>
          </div>

          {/* Stock */}
          <p className="mt-5 text-[11px] text-[var(--color-muted)]">
            {product.in_stock ? '✓ In stock' : '✗ Out of stock'}
          </p>
        </div>
      </div>
    </main>
  );
}
