export function RatingStars({ rating, count }: { rating?: number | null; count?: number | null }) {
  const value = Number(rating || 0);
  const reviews = Number(count || 0);
  // A product nobody has rated has no score to show. Rendering five empty stars
  // for it advertises the worst possible rating for a product that simply has no
  // reviews yet, so the unrated case shows the "New" badge and no star row.
  const hasEvidence = value > 0 && reviews > 0;
  const full = Math.round(value);

  return (
    <span
      className="rating inline-flex items-center gap-1 text-[12px] text-[var(--color-muted)]"
      data-rating={hasEvidence ? value.toFixed(1) : ''}
      data-review-count={String(reviews)}
    >
      {hasEvidence ? (
        <>
          <span className="text-[var(--color-accent)]" aria-label={`${value.toFixed(1)} out of 5`}>
            {'★'.repeat(Math.max(0, Math.min(5, full)))}
            {'☆'.repeat(Math.max(0, 5 - full))}
          </span>
          <span>{value.toFixed(1)}</span>
          <span>({reviews.toLocaleString('en-IN')})</span>
        </>
      ) : (
        <span aria-label="Not yet rated">New</span>
      )}
    </span>
  );
}
