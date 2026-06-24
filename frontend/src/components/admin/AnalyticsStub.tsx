export function AnalyticsStub() {
  const rows = [
    ['Orders today', '0'],
    ['Revenue today', 'Rs 0'],
    ['Top product views', 'Local events pending'],
    ['Traffic source', 'Direct 64%'],
  ];
  return (
    <section className="mt-6 rounded-[10px] border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
      <h2 className="text-[16px] text-[var(--color-ink)]">Analytics</h2>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {rows.map(([label, value]) => (
          <div key={label} className="rounded-[8px] border border-[var(--color-border)] p-4">
            <p className="text-[12px] text-[var(--color-muted)]">{label}</p>
            <p className="mt-2 text-[22px] font-[500] text-[var(--color-ink)]">{value}</p>
            <div className="mt-4 h-2 rounded-full bg-[var(--color-border)]"><span className="block h-2 w-2/3 rounded-full bg-[var(--color-accent)]" /></div>
          </div>
        ))}
      </div>
    </section>
  );
}
