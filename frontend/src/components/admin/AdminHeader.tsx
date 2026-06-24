export function AdminHeader({ busy, onRefresh }: { busy: boolean; onRefresh: () => void }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="text-[11px] uppercase tracking-[0.08em] text-[var(--color-muted)]">Store admin</p>
        <h1 className="mt-2 text-[26px] text-[var(--color-ink)]">AI-KART control panel</h1>
      </div>
      <button
        className="h-10 rounded-[8px] border border-[var(--color-border)] px-4 text-[13px]"
        type="button"
        onClick={onRefresh}
        disabled={busy}
      >
        Refresh
      </button>
    </div>
  );
}
