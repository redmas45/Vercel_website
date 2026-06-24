export function SkeletonBlock({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-[8px] bg-[var(--color-border)] ${className}`} />;
}

export function ProductCardSkeleton() {
  return (
    <div className="rounded-[8px] border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
      <SkeletonBlock className="aspect-square" />
      <SkeletonBlock className="mt-3 h-3 w-3/4" />
      <SkeletonBlock className="mt-2 h-3 w-1/2" />
    </div>
  );
}
