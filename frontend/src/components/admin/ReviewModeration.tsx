import type { Review } from '../../lib/types';

export function ReviewModeration({
  reviews,
  onPublish,
  onDelete,
}: {
  reviews: Review[];
  onPublish: (reviewId: string, isPublished: boolean) => void;
  onDelete: (reviewId: string) => void;
}) {
  return (
    <section className="mt-6 rounded-[10px] border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
      <h2 className="text-[16px] text-[var(--color-ink)]">Reviews</h2>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-left text-[13px]">
          <thead className="text-[11px] uppercase tracking-[0.06em] text-[var(--color-muted)]">
            <tr><th className="py-2 pr-4">Product</th><th className="py-2 pr-4">Reviewer</th><th className="py-2 pr-4">Rating</th><th className="py-2 pr-4">Status</th><th className="py-2 text-right">Actions</th></tr>
          </thead>
          <tbody>
            {reviews.slice(0, 100).map((review) => (
              <tr key={review.id} className="border-t border-[var(--color-border)]">
                <td className="py-3 pr-4">{review.product_id}</td>
                <td className="py-3 pr-4">{review.reviewer_name}<p className="text-[11px] text-[var(--color-muted)]">{review.title}</p></td>
                <td className="py-3 pr-4">{review.rating}</td>
                <td className="py-3 pr-4">{review.is_published ? 'Published' : 'Hidden'}</td>
                <td className="py-3 text-right">
                  <button className="mr-3 text-[var(--color-muted)]" type="button" onClick={() => onPublish(review.id, !review.is_published)}>{review.is_published ? 'Hide' : 'Publish'}</button>
                  <button className="text-[var(--color-muted)]" type="button" onClick={() => onDelete(review.id)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
