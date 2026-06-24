import type { FormEvent } from 'react';
import { Field } from '../ui/FormField';

export function UserForm({
  busy,
  onSubmit,
}: {
  busy: boolean;
  onSubmit: (formData: FormData, form: HTMLFormElement) => Promise<void>;
}) {
  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    await onSubmit(new FormData(event.currentTarget), event.currentTarget);
  }

  return (
    <section className="rounded-[10px] border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
      <h2 className="text-[16px] text-[var(--color-ink)]">Add user</h2>
      <form className="mt-5 grid gap-3" onSubmit={submit}>
        <Field label="Name" name="name" />
        <Field label="Email" name="email" type="email" required />
        <Field label="Password" name="password" type="password" required minLength={6} />
        <label className="grid gap-1.5">
          <span className="text-[12px] font-[500] text-[var(--color-muted)]">Role</span>
          <select className="h-10 rounded-[8px] border border-[var(--color-border)] bg-[var(--color-paper)] px-3 text-[13px]" name="role">
            <option value="customer">customer</option>
            <option value="admin">admin</option>
          </select>
        </label>
        <button className="h-10 rounded-[8px] bg-[var(--color-ink)] px-4 text-[13px] text-white" disabled={busy}>
          Add user
        </button>
      </form>
    </section>
  );
}
