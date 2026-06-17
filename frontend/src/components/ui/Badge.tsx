interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'accent';
}

export function Badge({ children, variant = 'default' }: BadgeProps) {
  const base =
    'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-[500] uppercase tracking-[0.06em]';
  const variants = {
    default: 'bg-[var(--color-border)] text-[var(--color-muted)]',
    accent: 'bg-[var(--color-accent-contrast)] text-[var(--color-accent-dark)]',
  };
  return <span className={`${base} ${variants[variant]}`}>{children}</span>;
}
