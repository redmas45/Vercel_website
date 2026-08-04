import { Link } from 'react-router-dom';
import type { Product } from '../../lib/types';
import { useCart } from '../../hooks/useCart';
import { useToast } from '../../hooks/useToast';
import { useWishlist } from '../../hooks/useWishlist';
import { money } from '../../lib/format';
import { productPath } from '../../lib/productRoutes';
import { RatingStars } from '../ui/RatingStars';
import { ProductImage } from '../ui/ProductImage';

interface ProductCardProps {
  product: Product;
}

const IMAGE_BG = ['bg-[#f5f0eb]', 'bg-[var(--color-accent-contrast)]', 'bg-[#eff0eb]'];

export function ProductCard({ product }: ProductCardProps) {
  const { addItem, openCart } = useCart();
  const { showToast } = useToast();
  const wishlist = useWishlist();
  // Alternate image backgrounds by product id hash for visual variety
  const bgIndex = product.id.charCodeAt(0) % IMAGE_BG.length;

  function handleAdd(e: React.MouseEvent) {
    e.preventDefault();
    if (!product.in_stock) {
      showToast('This item is currently out of stock', 'neutral');
      return;
    }
    addItem(product);
    openCart();
    showToast('Item added to cart');
  }

  async function toggleWishlist(event: React.MouseEvent): Promise<void> {
    event.preventDefault();
    try {
      const saved = await wishlist.toggle(product.id);
      showToast(saved ? 'Added to wishlist' : 'Removed from wishlist', 'neutral');
    } catch {
      showToast('Wishlist update failed', 'neutral');
    }
  }

  return (
    <Link
      to={productPath(product)}
      /* Stable identity for assistants and automation. Without these attributes a
         question about "these results" has no records to be answered from, and a
         claim that products were shown cannot be checked against the page. */
      data-product-id={product.id}
      data-entity-type="product"
      data-entity-name={product.name}
      className="group block rounded-[10px] bg-[var(--color-surface)] border border-[var(--color-border)] overflow-hidden hover:border-[var(--color-muted)] transition-colors duration-200"
    >
      {/* Image area */}
      <div className={`relative aspect-square ${IMAGE_BG[bgIndex]} overflow-hidden`}>
        <ProductImage
          src={product.image_url}
          alt={product.name}
          className="h-full w-full object-contain p-4 transition-transform duration-300 group-hover:scale-105 sm:p-5"
        />

        <button
          className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] text-[14px] text-[var(--color-ink)]"
          type="button"
          aria-label="Toggle wishlist"
          onClick={toggleWishlist}
        >
          <span aria-hidden="true">{wishlist.has(product.id) ? '\u2665' : '\u2661'}</span>
        </button>

        {product.discount_percent ? (
          <span className="absolute left-2 top-2 rounded-full bg-[var(--color-ink)] px-2 py-1 text-[10px] text-[var(--color-paper)]">
            {product.discount_percent}% off
          </span>
        ) : null}

        {/* Quick-add overlay */}
        <button
          onClick={handleAdd}
          className="absolute inset-x-0 bottom-0 flex h-9 items-center justify-center bg-[var(--color-ink)] text-[11px] font-[500] text-white opacity-100 transition-opacity duration-200 disabled:cursor-not-allowed disabled:bg-[var(--color-muted)] md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100"
          aria-label={`Add ${product.name} to cart`}
          disabled={!product.in_stock}
        >
          {product.in_stock ? 'Add to cart' : 'Out of stock'}
        </button>
      </div>

      {/* Info */}
      <div className="px-2.5 py-2.5 sm:px-3">
        <p className="line-clamp-2 min-h-7 text-[11px] font-[500] leading-tight text-[var(--color-ink)]">
          {product.name}
        </p>
        <RatingStars rating={product.rating} count={product.review_count} />
        <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
          <p
            className="price text-[11px] font-[500] text-[var(--color-accent)]"
            data-price={String(product.price)}
          >
            {money(product.price, product.currency)}
          </p>
          {product.original_price ? (
            <p className="text-[10px] text-[var(--color-muted)] line-through">{money(product.original_price, product.currency)}</p>
          ) : null}
        </div>
      </div>
    </Link>
  );
}
