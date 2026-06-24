export function Pagination({ page, totalPages, onPage }: { page: number; totalPages: number; onPage: (page: number) => void }) {
  if (totalPages <= 1) return null;
  const pages = pageNumbers(page, totalPages);
  return (
    <nav className="mt-8 flex flex-wrap items-center justify-center gap-2">
      <button className="h-9 rounded-[8px] border border-[var(--color-border)] px-3 text-[12px]" disabled={page <= 1} type="button" onClick={() => onPage(page - 1)}>Prev</button>
      {pages.map((item) => (
        <button key={item} className={`h-9 min-w-9 rounded-[8px] border px-3 text-[12px] ${item === page ? 'border-[var(--color-ink)] bg-[var(--color-ink)] text-[var(--color-paper)]' : 'border-[var(--color-border)]'}`} type="button" onClick={() => onPage(item)}>
          {item}
        </button>
      ))}
      <button className="h-9 rounded-[8px] border border-[var(--color-border)] px-3 text-[12px]" disabled={page >= totalPages} type="button" onClick={() => onPage(page + 1)}>Next</button>
    </nav>
  );
}

function pageNumbers(page: number, total: number): number[] {
  const values = new Set([1, total, page - 1, page, page + 1, page + 2].filter((item) => item >= 1 && item <= total));
  return Array.from(values).sort((a, b) => a - b);
}
