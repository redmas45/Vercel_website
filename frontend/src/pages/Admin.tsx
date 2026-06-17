import { type FormEvent, type InputHTMLAttributes, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  createAdminProduct,
  createAdminUser,
  deleteAdminProduct,
  deleteAdminUser,
  listAdminProducts,
  listAdminUsers,
} from '../lib/api';
import type { Product, User } from '../lib/types';

export function Admin() {
  const [users, setUsers] = useState<User[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    refresh();
  }, []);

  async function refresh() {
    setBusy(true);
    setError('');
    try {
      const [nextUsers, nextProducts] = await Promise.all([listAdminUsers(), listAdminProducts()]);
      setUsers(nextUsers);
      setProducts(nextProducts);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Admin data failed to load.');
    } finally {
      setBusy(false);
    }
  }

  async function submitUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    await runAdminAction(async () => {
      await createAdminUser({
        email: String(formData.get('email') || ''),
        password: String(formData.get('password') || ''),
        name: String(formData.get('name') || ''),
        role: String(formData.get('role') || 'customer') as 'admin' | 'customer',
      });
      form.reset();
      setNotice('User created.');
    });
  }

  async function submitProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    await runAdminAction(async () => {
      await createAdminProduct(formData);
      form.reset();
      setNotice('Product created.');
    });
  }

  async function removeUser(userId: number) {
    await runAdminAction(async () => {
      await deleteAdminUser(userId);
      setNotice('User deleted.');
    });
  }

  async function removeProduct(productId: string) {
    await runAdminAction(async () => {
      await deleteAdminProduct(productId);
      setNotice('Product deleted.');
    });
  }

  async function runAdminAction(action: () => Promise<void>) {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await action();
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Admin action failed.');
    } finally {
      setBusy(false);
    }
  }

  if (error.toLowerCase().includes('sign in') || error.toLowerCase().includes('admin access')) {
    return (
      <main className="max-w-[560px] mx-auto px-6 py-14">
        <section className="rounded-[10px] border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
          <h1 className="text-[22px] text-[var(--color-ink)]">Admin login required</h1>
          <p className="mt-3 text-[13px] text-[var(--color-muted)]">{error}</p>
          <Link className="mt-5 inline-block text-[var(--color-accent-dark)]" to="/login">Login as admin</Link>
        </section>
      </main>
    );
  }

  return (
    <main className="max-w-[1180px] mx-auto px-6 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.08em] text-[var(--color-muted)]">Store admin</p>
          <h1 className="mt-2 text-[26px] text-[var(--color-ink)]">AI-KART control panel</h1>
        </div>
        <button
          className="h-10 rounded-[8px] border border-[var(--color-border)] px-4 text-[13px]"
          type="button"
          onClick={refresh}
          disabled={busy}
        >
          Refresh
        </button>
      </div>

      {error ? <p className="mt-4 text-[13px] text-red-600">{error}</p> : null}
      {notice ? <p className="mt-4 text-[13px] text-green-700">{notice}</p> : null}

      <div className="mt-8 grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
        <section className="rounded-[10px] border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
          <h2 className="text-[16px] text-[var(--color-ink)]">Add product</h2>
          <form className="mt-5 grid gap-3" onSubmit={submitProduct}>
            <Field label="Name" name="name" required />
            <Field label="Price" name="price" type="number" step="0.01" required />
            <Field label="Category" name="category" />
            <Field label="Brand" name="brand" defaultValue="NOVA" />
            <Field label="Stock" name="stock" type="number" />
            <TextArea label="Description" name="description" />
            <Field label="Remote image URL" name="image_url" />
            <FileField label="Local product image" name="image" />
            <button className="h-10 rounded-[8px] bg-[var(--color-ink)] px-4 text-[13px] text-white" disabled={busy}>
              Add product
            </button>
          </form>
        </section>

        <section className="rounded-[10px] border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
          <h2 className="text-[16px] text-[var(--color-ink)]">Products</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead className="text-[11px] uppercase tracking-[0.06em] text-[var(--color-muted)]">
                <tr>
                  <th className="py-2 pr-4">Item</th>
                  <th className="py-2 pr-4">Category</th>
                  <th className="py-2 pr-4">Price</th>
                  <th className="py-2 pr-4">Stock</th>
                  <th className="py-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr key={product.id} className="border-t border-[var(--color-border)]">
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-3">
                        {product.image_url ? (
                          <img className="h-12 w-12 rounded-[8px] object-contain bg-[var(--color-paper)]" src={product.image_url} alt="" />
                        ) : null}
                        <div>
                          <p className="font-[500] text-[var(--color-ink)]">{product.name}</p>
                          <p className="text-[11px] text-[var(--color-muted)]">{product.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 pr-4">{product.category || '-'}</td>
                    <td className="py-3 pr-4">${product.price.toFixed(2)}</td>
                    <td className="py-3 pr-4">{product.stock ?? '-'}</td>
                    <td className="py-3 text-right">
                      <button className="text-red-600" type="button" onClick={() => removeProduct(product.id)}>
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
        <section className="rounded-[10px] border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
          <h2 className="text-[16px] text-[var(--color-ink)]">Add user</h2>
          <form className="mt-5 grid gap-3" onSubmit={submitUser}>
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

        <section className="rounded-[10px] border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
          <h2 className="text-[16px] text-[var(--color-ink)]">Users</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-t border-[var(--color-border)] first:border-t-0">
                    <td className="py-3 pr-4">
                      <p className="font-[500] text-[var(--color-ink)]">{user.name || user.email}</p>
                      <p className="text-[11px] text-[var(--color-muted)]">{user.email}</p>
                    </td>
                    <td className="py-3 pr-4">{user.role}</td>
                    <td className="py-3 text-right">
                      <button className="text-red-600" type="button" onClick={() => removeUser(user.id)}>
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}

function Field(props: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
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

function TextArea({ label, name }: { label: string; name: string }) {
  return (
    <label className="grid gap-1.5">
      <span className="text-[12px] font-[500] text-[var(--color-muted)]">{label}</span>
      <textarea
        className="min-h-24 rounded-[8px] border border-[var(--color-border)] bg-[var(--color-paper)] px-3 py-2 text-[13px] outline-none focus:border-[var(--color-muted)]"
        name={name}
      />
    </label>
  );
}

function FileField({ label, name }: { label: string; name: string }) {
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
