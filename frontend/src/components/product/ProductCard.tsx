import { Link } from 'react-router-dom';
import type { Product } from '../../lib/types';
import { useCart } from '../../hooks/useCart';

interface ProductCardProps {
  product: Product;
}

const IMAGE_BG = ['bg-[#f5f0eb]', 'bg-[var(--color-accent-contrast)]', 'bg-[#eff0eb]'];

export function ProductCard({ product }: ProductCardProps) {
  const { addItem, openCart } = useCart();
  // Alternate image backgrounds by product id hash for visual variety
  const bgIndex = product.id.charCodeAt(0) % IMAGE_BG.length;

  function handleAdd(e: React.MouseEvent) {
    e.preventDefault();
    addItem(product);
    openCart();
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
            className="w-full h-full object-contain p-5 mix-blend-multiply transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[var(--color-muted)] text-xs">
            No image
          </div>
        )}

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
        <p className="text-[11px] font-[500] text-[var(--color-accent-dark)] mt-0.5">
          ${product.price.toFixed(2)} USD
        </p>
      </div>
    </Link>
  );
}
