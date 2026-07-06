export type AdminTab = 'products' | 'reviews';

export function AdminTabs({ active, onChange }: { active: AdminTab; onChange: (tab: AdminTab) => void }) {
  const tabs: [AdminTab, string][] = [['products', 'Products'], ['reviews', 'Reviews']];
  return (
    <nav className="mt-6 flex flex-wrap gap-2">
      {tabs.map(([value, label]) => (
        <button key={value} className={`h-9 rounded-[8px] border px-4 text-[13px] ${active === value ? 'border-[var(--color-ink)] bg-[var(--color-ink)] text-[var(--color-paper)]' : 'border-[var(--color-border)]'}`} type="button" onClick={() => onChange(value)}>{label}</button>
      ))}
    </nav>
  );
}
