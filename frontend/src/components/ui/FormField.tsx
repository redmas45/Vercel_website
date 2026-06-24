import type { InputHTMLAttributes, TextareaHTMLAttributes } from 'react';

export function Field(props: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  const { label, ...inputProps } = props;
  return (
    <label className="grid gap-1.5">
      <span className="text-[12px] font-[500] text-[var(--color-muted)]">{label}</span>
      <input
        {...inputProps}
        className="h-10 rounded-[8px] border border-[var(--color-border)] bg-[var(--color-paper)] px-3 text-[13px] outline-none focus:border-[var(--color-muted)]"
      />
    </label>
  );
}

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string }) {
  const { label, ...textareaProps } = props;
  return (
    <label className="grid gap-1.5">
      <span className="text-[12px] font-[500] text-[var(--color-muted)]">{label}</span>
      <textarea
        {...textareaProps}
        className="min-h-24 rounded-[8px] border border-[var(--color-border)] bg-[var(--color-paper)] px-3 py-2 text-[13px] outline-none focus:border-[var(--color-muted)]"
      />
    </label>
  );
}

export function FileField({ label, name }: { label: string; name: string }) {
  return (
    <label className="grid gap-1.5">
      <span className="text-[12px] font-[500] text-[var(--color-muted)]">{label}</span>
      <input
        className="rounded-[8px] border border-dashed border-[var(--color-border)] bg-[var(--color-paper)] px-3 py-2 text-[13px]"
        name={name}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
      />
    </label>
  );
}
