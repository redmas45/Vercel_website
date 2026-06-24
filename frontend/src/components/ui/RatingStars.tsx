export function RatingStars({ rating, count }: { rating?: number | null; count?: number | null }) {
  const value = Number(rating || 0);
  const full = Math.round(value);
  return (
    <span className="inline-flex items-center gap-1 text-[12px] text-[var(--color-muted)]">
      <span className="text-[var(--color-accent)]" aria-label={`${value.toFixed(1)} out of 5`}>
        {'★'.repeat(Math.max(0, Math.min(5, full)))}{'☆'.repeat(Math.max(0, 5 - full))}
      </span>
      <span>{value ? value.toFixed(1) : 'New'}</span>
      {count ? <span>({count.toLocaleString('en-IN')})</span> : null}
    </span>
  );
}
