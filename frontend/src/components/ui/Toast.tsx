import { useToast } from '../../hooks/useToast';

export function ToastContainer() {
  const { toasts, dismissToast } = useToast();
  return (
    <div className="fixed right-4 top-16 z-[80] grid w-[min(360px,calc(100vw-32px))] gap-2">
      {toasts.map((toast) => (
        <button
          key={toast.id}
          type="button"
          className="rounded-[8px] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-left text-[13px] text-[var(--color-ink)] shadow-lg"
          onClick={() => dismissToast(toast.id)}
        >
          {toast.message}
        </button>
      ))}
    </div>
  );
}
