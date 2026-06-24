import { useState } from 'react';

export function SpecsAccordion({ specs }: { specs: Record<string, unknown> | null }) {
  const [open, setOpen] = useState(true);
  const entries = Object.entries(specs || {});
  if (!entries.length) return null;

  return (
    <section className="rounded-[8px] border border-[var(--color-border)] bg-[var(--color-surface)]">
      <button
        className="flex w-full items-center justify-between px-4 py-3 text-left text-[14px] font-[500] text-[var(--color-ink)]"
        type="button"
        onClick={() => setOpen((value) => !value)}
      >
        Specifications
        <span>{open ? '-' : '+'}</span>
      </button>
      {open ? (
        <div className="grid divide-y divide-[var(--color-border)] px-4 pb-3">
          {entries.map(([key, value]) => (
            <div key={key} className="grid gap-1 py-3 text-[13px] sm:grid-cols-[180px_1fr]">
              <span className="capitalize text-[var(--color-muted)]">{key.replace(/_/g, ' ')}</span>
              <span className="text-[var(--color-ink)]">{formatValue(value)}</span>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function formatValue(value: unknown): string {
  if (Array.isArray(value)) return value.join(', ');
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return String(value ?? '-');
}
