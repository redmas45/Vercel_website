import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { DeliveryChecker } from '../components/product/DeliveryChecker';
import { FrequentlyBoughtTogether } from '../components/product/FrequentlyBoughtTogether';
import { ImageGallery } from '../components/product/ImageGallery';
import { RecommendationRail } from '../components/product/RecommendationRail';
import { ReviewSection } from '../components/product/ReviewSection';
import { SpecsAccordion } from '../components/product/SpecsAccordion';
import { VariantSelector } from '../components/product/VariantSelector';
import { RatingStars } from '../components/ui/RatingStars';
import { SkeletonBlock } from '../components/ui/Skeleton';
import { useCart } from '../hooks/useCart';
import { rememberProduct } from '../hooks/useRecentlyViewed';
import { useToast } from '../hooks/useToast';
import { useWishlist } from '../hooks/useWishlist';
import { money, percentText, stockText } from '../lib/format';
import { getProduct, getRelatedProducts } from '../lib/productApi';
import type { Product } from '../lib/types';

export function ProductDetail() {
  const { productId } = useParams<{ productId: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [crossSell, setCrossSell] = useState<Product[]>([]);
  const [frequentlyBought, setFrequentlyBought] = useState<Product[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { addItem, openCart } = useCart();
  const wishlist = useWishlist();
  const { showToast } = useToast();

  useEffect(() => {
    if (!productId) return;
    setLoading(true);
    setError('');
    Promise.all([getProduct(productId), getRelatedProducts(productId)])
      .then(([nextProduct, related]) => {
        setProduct(nextProduct);
        setCrossSell(related.cross_sell);
        setFrequentlyBought(related.frequently_bought_with);
        rememberProduct(nextProduct.id);
      })
      .catch(() => setError('Product failed to load.'))
      .finally(() => setLoading(false));
  }, [productId]);

  function addToCart(): void {
    if (!product || !product.in_stock) return;
    addItem(product, quantity);
    openCart();
    showToast('Item added to cart');
  }

  async function toggleWishlist(): Promise<void> {
    if (!product) return;
    const saved = await wishlist.toggle(product.id);
    showToast(saved ? 'Added to wishlist' : 'Removed from wishlist', 'neutral');
  }

  if (loading) {
    return (
      <main className="mx-auto max-w-[1240px] px-4 py-8 md:px-6">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_420px]">
          <SkeletonBlock className="aspect-square" />
          <div className="grid content-start gap-4">
            <SkeletonBlock className="h-5 w-1/3" />
            <SkeletonBlock className="h-12 w-full" />
            <SkeletonBlock className="h-8 w-1/2" />
            <SkeletonBlock className="h-36 w-full" />
          </div>
        </div>
      </main>
    );
  }

  if (error || !product) {
    return (
      <main className="mx-auto max-w-[720px] px-6 py-16 text-center">
        <p className="text-[13px] text-[var(--color-muted)]">{error || 'Product not found.'}</p>
        <Link className="mt-4 inline-block text-[13px] text-[var(--color-accent)]" to="/shop">Back to shop</Link>
      </main>
    );
  }

  const reviewLabel = product.review_count
    ? `${product.review_count} verified reviews`
    : 'Reviews coming soon';
  const descriptionParagraphs = productDescriptionParagraphs(product.description);

  return (
    <main className="mx-auto max-w-[1240px] px-4 py-6 md:px-6 md:py-10">
      <nav className="mb-6 flex flex-wrap items-center gap-2 text-[12px] text-[var(--color-muted)]">
        <Link to="/">Home</Link>
        <span>/</span>
        <Link to="/shop">Shop</Link>
        {product.category ? (
          <>
            <span>/</span>
            <Link to={`/shop?category=${product.category}`}>{product.category}</Link>
          </>
        ) : null}
        <span>/</span>
        <span className="text-[var(--color-ink)]">{product.name}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_440px]">
        <ImageGallery product={product} />
        <aside className="grid content-start gap-4 lg:sticky lg:top-20">
          <div>
            <Link className="text-[12px] uppercase tracking-[0.08em] text-[var(--color-accent)]" to={`/shop?brand=${encodeURIComponent(product.brand)}`}>
              {product.brand}
            </Link>
            <h1 className="mt-2 text-[30px] font-[500] leading-tight text-[var(--color-ink)] md:text-[42px]">{product.name}</h1>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <RatingStars rating={product.rating} count={product.review_count} />
              <span className="text-[12px] text-[var(--color-muted)]">| {reviewLabel}</span>
            </div>
          </div>

          <section className="border-y border-[var(--color-border)] py-4">
            <div className="flex flex-wrap items-end gap-2">
              <p className="text-[28px] font-[500] text-[var(--color-accent)]">{money(product.price, product.currency)}</p>
              {product.original_price ? <p className="pb-1 text-[13px] text-[var(--color-muted)] line-through">{money(product.original_price, product.currency)}</p> : null}
              {product.discount_percent ? <p className="pb-1 text-[13px] text-[var(--color-muted)]">{percentText(product.discount_percent)}</p> : null}
            </div>
            {product.discount_percent ? (
              <p className="mt-2 inline-flex rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1 text-[12px] text-[var(--color-muted)]">
                Offer applied from current catalog data
              </p>
            ) : null}
          </section>

          <VariantSelector variants={product.variants} />

          <section className="grid gap-4 border-b border-[var(--color-border)] pb-4">
            <div className="flex items-center gap-3">
              <p className="text-[12px] text-[var(--color-muted)]">Quantity</p>
              <div className="inline-flex h-9 overflow-hidden rounded-[8px] border border-[var(--color-border)]">
                <button className="w-9" type="button" onClick={() => setQuantity((value) => Math.max(1, value - 1))}>-</button>
                <span className="grid w-10 place-items-center text-[13px]">{quantity}</span>
                <button className="w-9" type="button" onClick={() => setQuantity((value) => value + 1)}>+</button>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <button className="h-11 rounded-[8px] bg-[var(--color-ink)] px-5 text-[13px] font-[500] text-[var(--color-paper)] disabled:cursor-not-allowed disabled:bg-[var(--color-muted)]" id="add-to-cart-btn" type="button" onClick={addToCart} disabled={!product.in_stock}>
                {product.in_stock ? 'Add to cart' : 'Out of stock'}
              </button>
              <button className="h-11 rounded-[8px] border border-[var(--color-border)] bg-[var(--color-surface)] px-5 text-[13px] font-[500] text-[var(--color-ink)] disabled:cursor-not-allowed disabled:text-[var(--color-muted)]" type="button" onClick={addToCart} disabled={!product.in_stock}>
                Buy now
              </button>
            </div>
          </section>

          <DeliveryChecker />
          <p className="text-[12px] text-[var(--color-muted)]">{stockText(product)}</p>
          <div className="flex flex-wrap gap-3">
            <button className="h-9 rounded-[8px] border border-[var(--color-border)] px-4 text-[12px]" type="button" onClick={toggleWishlist}>
              {wishlist.has(product.id) ? 'Saved to wishlist' : 'Add to wishlist'}
            </button>
            <button className="h-9 rounded-[8px] border border-[var(--color-border)] px-4 text-[12px]" type="button" onClick={() => navigator.clipboard?.writeText(window.location.href)}>
              Share
            </button>
          </div>
        </aside>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className="grid gap-6">
          {product.highlights?.length ? (
            <section className="rounded-[8px] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
              <h2 className="mb-3 text-[16px] font-[500] text-[var(--color-ink)]">Highlights</h2>
              <ul className="grid gap-2 text-[13px] text-[var(--color-muted)]">
                {product.highlights.map((highlight) => <li key={highlight}>- {highlight}</li>)}
              </ul>
            </section>
          ) : null}
          <SpecsAccordion specs={product.specs} />
          {descriptionParagraphs.length ? (
            <section className="rounded-[8px] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
              <h2 className="mb-3 text-[16px] font-[500] text-[var(--color-ink)]">Product description</h2>
              <div className="grid gap-3 text-[13px] leading-6 text-[var(--color-muted)]">
                {descriptionParagraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
              </div>
            </section>
          ) : null}
        </section>
        <FrequentlyBoughtTogether product={product} products={frequentlyBought} />
      </div>

      <RecommendationRail title="You may also like" products={crossSell} />
      <RecommendationRail title="Customers who bought this also bought" products={frequentlyBought} />
      <ReviewSection productId={product.id} />
    </main>
  );
}

function productDescriptionParagraphs(description: string): string[] {
  const template = document.createElement('template');
  template.innerHTML = description;
  const paragraphs = Array.from(template.content.querySelectorAll('p'))
    .map((paragraph) => paragraph.textContent?.trim() ?? '')
    .filter(Boolean);
  if (paragraphs.length) return paragraphs;
  const fallback = template.content.textContent?.trim();
  return fallback ? [fallback] : [];
}
