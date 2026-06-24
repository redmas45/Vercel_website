import type { FormEvent } from 'react';
import { Field, FileField, TextArea } from '../ui/FormField';

export function ProductForm({
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
      <h2 className="text-[16px] text-[var(--color-ink)]">Add product</h2>
      <form className="mt-5 grid gap-3" onSubmit={submit}>
        <Field label="Name" name="name" required />
        <Field label="Price" name="price" type="number" step="0.01" required />
        <Field label="Category" name="category" />
        <Field label="Brand" name="brand" defaultValue="NOVA" />
        <Field label="Stock" name="stock" type="number" />
        <TextArea label="Description" name="description" />
        <Field label="Remote image URL" name="image_url" />
        <TextArea label="Gallery image URLs" name="images" placeholder="One URL per line or comma separated" />
        <FileField label="Local product image" name="image" />
        <TextArea label="Specs JSON" name="specs" placeholder='{"fabric":"100% Cotton"}' />
        <TextArea label="Variants JSON" name="variants" placeholder='[{"type":"size","name":"M","in_stock":true}]' />
        <TextArea label="Highlights" name="highlights" placeholder="One highlight per line" />
        <label className="flex items-center gap-2 text-[12px] text-[var(--color-muted)]"><input name="is_featured" type="checkbox" /> Featured</label>
        <label className="flex items-center gap-2 text-[12px] text-[var(--color-muted)]"><input name="is_new_arrival" type="checkbox" /> New arrival</label>
        <label className="flex items-center gap-2 text-[12px] text-[var(--color-muted)]"><input name="is_bestseller" type="checkbox" /> Bestseller</label>
        <button className="h-10 rounded-[8px] bg-[var(--color-ink)] px-4 text-[13px] text-white" disabled={busy}>
          Add product
        </button>
      </form>
    </section>
  );
}
