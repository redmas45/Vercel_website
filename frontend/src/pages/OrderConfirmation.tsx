import { Link, useSearchParams } from 'react-router-dom';
import { money } from '../lib/format';

export function OrderConfirmation() {
  const [params] = useSearchParams();
  const order = params.get('order') || 'AK-2026-00847';
  const total = Number(params.get('total') || 0);
  return (
    <main className="mx-auto max-w-[680px] px-6 py-16 text-center">
      <section className="rounded-[8px] border border-[var(--color-border)] bg-[var(--color-surface)] p-8">
        <p className="text-[13px] uppercase tracking-[0.08em] text-[var(--color-muted)]">Order placed</p>
        <h1 className="mt-3 text-[28px] font-[500] text-[var(--color-ink)]">Order placed successfully</h1>
        <p className="mt-3 text-[13px] text-[var(--color-muted)]">Order #{order}</p>
        <p className="mt-1 text-[13px] text-[var(--color-muted)]">Total {money(total)}</p>
        <p className="mt-1 text-[13px] text-[var(--color-muted)]">Expected delivery: Friday, Jun 26</p>
        <div className="mt-6 flex justify-center gap-3">
          <Link className="rounded-[8px] bg-[var(--color-ink)] px-4 py-2 text-[13px] text-[var(--color-paper)]" to="/shop">Continue shopping</Link>
          <Link className="rounded-[8px] border border-[var(--color-border)] px-4 py-2 text-[13px]" to="/account/orders">View orders</Link>
        </div>
      </section>
    </main>
  );
}
