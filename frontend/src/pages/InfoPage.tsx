import { Link } from 'react-router-dom';
import type { InfoPageContent } from '../lib/infoPages';

export function InfoPage({ content }: { content: InfoPageContent }) {
  return (
    <main className="mx-auto max-w-[860px] px-6 py-12">
      <p className="text-[11px] uppercase tracking-[0.08em] text-[var(--color-muted)]">AI-KART</p>
      <h1 className="mt-3 text-[32px] font-[500] text-[var(--color-ink)]">{content.title}</h1>
      <p className="mt-4 max-w-[680px] text-[14px] leading-6 text-[var(--color-muted)]">{content.summary}</p>
      <div className="mt-8 grid gap-4">
        {content.sections.map(([heading, body]) => (
          <section key={heading} className="rounded-[8px] border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
            <h2 className="text-[16px] font-[500] text-[var(--color-ink)]">{heading}</h2>
            <p className="mt-2 text-[13px] leading-6 text-[var(--color-muted)]">{body}</p>
          </section>
        ))}
      </div>
      <Link className="mt-8 inline-grid h-10 place-items-center rounded-[8px] bg-[var(--color-ink)] px-5 text-[13px] text-[var(--color-paper)]" to="/shop">
        Continue shopping
      </Link>
    </main>
  );
}
