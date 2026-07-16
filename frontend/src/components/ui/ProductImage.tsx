import { useEffect, useState, type ReactElement } from 'react';

interface ProductImageProps {
  src: string | null | undefined;
  alt: string;
  className?: string;
  loading?: 'eager' | 'lazy';
}

export function ProductImage({
  src,
  alt,
  className = '',
  loading = 'lazy',
}: ProductImageProps): ReactElement {
  const [failed, setFailed] = useState(!src);

  useEffect(() => {
    setFailed(!src);
  }, [src]);

  if (failed) {
    return (
      <div
        className={`${className} grid place-items-center bg-[var(--color-paper)] text-center text-[10px] text-[var(--color-muted)]`}
        role="img"
        aria-label={alt || 'Product image unavailable'}
      >
        <span>Image unavailable</span>
      </div>
    );
  }

  return (
    <img
      className={className}
      src={src ?? undefined}
      alt={alt}
      loading={loading}
      decoding="async"
      onError={() => setFailed(true)}
    />
  );
}
