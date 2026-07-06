import { Link } from 'react-router-dom';

export function NotFound() {
  return (
    <main className="mx-auto max-w-[620px] px-6 py-16 text-center">
      <p className="text-[12px] uppercase tracking-[0.08em] text-[var(--color-muted)]">404</p>
      <h1 className="mt-3 text-[30px] font-[500] text-[var(--color-ink)]">Page not found</h1>
      <p className="mt-3 text-[13px] leading-6 text-[var(--color-muted)]">
        The page may have moved, or the link may no longer be available.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link className="rounded-[8px] bg-[var(--color-ink)] px-4 py-2 text-[13px] text-[var(--color-paper)]" to="/shop">Shop products</Link>
        <Link className="rounded-[8px] border border-[var(--color-border)] px-4 py-2 text-[13px]" to="/">Go home</Link>
      </div>
    </main>
  );
}
