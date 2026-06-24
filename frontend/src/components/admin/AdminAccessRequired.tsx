import { Link } from 'react-router-dom';

export function AdminAccessRequired({ message }: { message: string }) {
  return (
    <main className="max-w-[560px] mx-auto px-6 py-14">
      <section className="rounded-[10px] border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
        <h1 className="text-[22px] text-[var(--color-ink)]">Admin login required</h1>
        <p className="mt-3 text-[13px] text-[var(--color-muted)]">{message}</p>
        <Link className="mt-5 inline-block text-[var(--color-accent-dark)]" to="/login">Login as admin</Link>
      </section>
    </main>
  );
}
