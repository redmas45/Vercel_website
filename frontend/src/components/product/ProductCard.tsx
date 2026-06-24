import { Link } from 'react-router-dom';
import type { Product } from '../../lib/types';
import { useCart } from '../../hooks/useCart';
import { useToast } from '../../hooks/useToast';
import { useWishlist } from '../../hooks/useWishlist';
import { money } from '../../lib/format';
import { RatingStars } from '../ui/RatingStars';

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
      to={`/product/${product.id}`}
      className="group block rounded-[10px] bg-[var(--color-surface)] border border-[var(--color-border)] overflow-hidden hover:border-[var(--color-muted)] transition-colors duration-200"
    >
      {/* Image area */}
      <div className={`relative aspect-square ${IMAGE_BG[bgIndex]} overflow-hidden`}>
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            className="w-full h-full object-contain p-5 transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[var(--color-muted)] text-xs">
            No image
          </div>
        )}

        <button
          className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] text-[14px] text-[var(--color-ink)]"
          type="button"
          aria-label="Toggle wishlist"
          onClick={toggleWishlist}
        >
          {wishlist.has(product.id) ? '♥' : '♡'}
        </button>

        {product.discount_percent ? (
          <span className="absolute left-2 top-2 rounded-full bg-[var(--color-ink)] px-2 py-1 text-[10px] text-[var(--color-paper)]">
            {product.discount_percent}% off
          </span>
        ) : null}

        {/* Quick-add overlay */}
        <button
          onClick={handleAdd}
          className="absolute bottom-0 left-0 right-0 h-9 bg-[var(--color-ink)] text-white text-[11px] font-[500] opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center"
          aria-label={`Add ${product.name} to cart`}
        >
          Add to cart
        </button>
      </div>

      {/* Info */}
      <div className="px-3 py-2.5">
        <p className="text-[11px] font-[500] text-[var(--color-ink)] truncate leading-tight">
          {product.name}
        </p>
        <RatingStars rating={product.rating} count={product.review_count} />
        <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
          <p className="text-[11px] font-[500] text-[var(--color-accent)]">{money(product.price, product.currency)}</p>
          {product.original_price ? (
            <p className="text-[10px] text-[var(--color-muted)] line-through">{money(product.original_price, product.currency)}</p>
          ) : null}
        </div>
      </div>
    </Link>
  );
}
