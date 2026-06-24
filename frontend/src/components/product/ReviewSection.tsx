import { useEffect, useState } from 'react';
import { getReviews } from '../../lib/productApi';
import type { Review, ReviewListMeta } from '../../lib/types';
import { RatingStars } from '../ui/RatingStars';
import { SkeletonBlock } from '../ui/Skeleton';

export function ReviewSection({ productId }: { productId: string }) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [meta, setMeta] = useState<ReviewListMeta | null>(null);
  const [sort, setSort] = useState('helpful');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getReviews(productId, 1, sort)
      .then((response) => {
        setReviews(response.data);
        setMeta(response.meta);
      })
      .finally(() => setLoading(false));
  }, [productId, sort]);

  return (
    <section className="py-8">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-[16px] font-[500] text-[var(--color-ink)]">Customer reviews</h2>
        <select className="h-9 rounded-[8px] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-[12px]" value={sort} onChange={(event) => setSort(event.target.value)}>
          <option value="helpful">Top reviews</option>
          <option value="recent">Most recent</option>
          <option value="rating_high">Highest rating</option>
          <option value="rating_low">Lowest rating</option>
        </select>
      </div>
      {loading ? <SkeletonBlock className="h-40" /> : null}
      {!loading && meta ? (
        <div className="grid gap-5 md:grid-cols-[260px_1fr]">
          <aside className="rounded-[8px] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
            <RatingStars rating={meta.average_rating} count={meta.total} />
            <p className="mt-2 text-[13px] text-[var(--color-muted)]">{meta.average_rating} out of 5</p>
            <div className="mt-4 grid gap-2">
              {[5, 4, 3, 2, 1].map((star) => {
                const count = meta.rating_breakdown[String(star)] || 0;
                const width = meta.total ? Math.round((count / meta.total) * 100) : 0;
                return (
                  <div key={star} className="grid grid-cols-[40px_1fr_38px] items-center gap-2 text-[11px] text-[var(--color-muted)]">
                    <span>{star} star</span>
                    <span className="h-2 rounded-full bg-[var(--color-border)]"><span className="block h-2 rounded-full bg-[var(--color-accent)]" style={{ width: `${width}%` }} /></span>
                    <span>{width}%</span>
                  </div>
                );
              })}
            </div>
          </aside>
          <div className="grid gap-3">
            {reviews.map((review) => (
              <article key={review.id} className="rounded-[8px] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-[13px] font-[500] text-[var(--color-ink)]">{review.reviewer_name}</p>
                  <RatingStars rating={review.rating} />
                  {review.verified_purchase ? <span className="text-[11px] text-[var(--color-muted)]">Verified purchase</span> : null}
                </div>
                <h3 className="mt-2 text-[14px] font-[500] text-[var(--color-ink)]">{review.title}</h3>
                <p className="mt-1 text-[12px] text-[var(--color-muted)]">{review.created_at?.slice(0, 10)} {review.variant_purchased ? `| ${review.variant_purchased}` : ''}</p>
                <p className="mt-3 text-[13px] leading-6 text-[var(--color-ink)]">{review.body}</p>
                <button className="mt-3 text-[12px] text-[var(--color-muted)]" type="button">Helpful ({review.helpful_count})</button>
              </article>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
