import { useEffect, useState } from 'react';
import { AdminAccessRequired } from '../components/admin/AdminAccessRequired';
import { AdminHeader } from '../components/admin/AdminHeader';
import { AdminMessages } from '../components/admin/AdminMessages';
import { AdminTabs, type AdminTab } from '../components/admin/AdminTabs';
import { ProductForm } from '../components/admin/ProductForm';
import { ProductTable } from '../components/admin/ProductTable';
import { ReviewModeration } from '../components/admin/ReviewModeration';
import { UserForm } from '../components/admin/UserForm';
import { UserTable } from '../components/admin/UserTable';
import {
  createAdminProduct,
  createAdminUser,
  deleteAdminProduct,
  deleteAdminReview,
  deleteAdminUser,
  listAdminProducts,
  listAdminReviews,
  listAdminUsers,
  updateAdminReview,
} from '../lib/adminApi';
import type { Product, Review, User } from '../lib/types';

export function Admin() {
  const [users, setUsers] = useState<User[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [activeTab, setActiveTab] = useState<AdminTab>('products');

  useEffect(() => {
    refresh();
  }, []);

  async function refresh(): Promise<void> {
    setBusy(true);
    setError('');
    try {
      const [nextUsers, nextProducts, nextReviews] = await Promise.all([
        listAdminUsers(),
        listAdminProducts(),
        listAdminReviews().catch(() => []),
      ]);
      setUsers(nextUsers);
      setProducts(nextProducts);
      setReviews(nextReviews);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Admin data failed to load.');
    } finally {
      setBusy(false);
    }
  }

  async function submitUser(formData: FormData, form: HTMLFormElement): Promise<void> {
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

  async function submitProduct(formData: FormData, form: HTMLFormElement): Promise<void> {
    await runAdminAction(async () => {
      await createAdminProduct(formData);
      form.reset();
      setNotice('Product created.');
    });
  }

  async function removeUser(userId: number): Promise<void> {
    await runAdminAction(async () => {
      await deleteAdminUser(userId);
      setNotice('User deleted.');
    });
  }

  async function removeProduct(productId: string): Promise<void> {
    await runAdminAction(async () => {
      await deleteAdminProduct(productId);
      setNotice('Product deleted.');
    });
  }

  async function toggleReview(reviewId: string, isPublished: boolean): Promise<void> {
    await runAdminAction(async () => {
      await updateAdminReview(reviewId, isPublished);
      setNotice('Review updated.');
    });
  }

  async function removeReview(reviewId: string): Promise<void> {
    await runAdminAction(async () => {
      await deleteAdminReview(reviewId);
      setNotice('Review deleted.');
    });
  }

  async function runAdminAction(action: () => Promise<void>): Promise<void> {
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
    return <AdminAccessRequired message={error} />;
  }

  return (
    <main className="max-w-[1180px] mx-auto px-6 py-10">
      <AdminHeader busy={busy} onRefresh={refresh} />
      <AdminMessages error={error} notice={notice} />
      <AdminTabs active={activeTab} onChange={setActiveTab} />

      {activeTab === 'products' ? (
        <>
          <div className="mt-8 grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
            <ProductForm busy={busy} onSubmit={submitProduct} />
            <ProductTable products={products} onDelete={removeProduct} />
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
            <UserForm busy={busy} onSubmit={submitUser} />
            <UserTable users={users} onDelete={removeUser} />
          </div>
        </>
      ) : null}

      {activeTab === 'reviews' ? <ReviewModeration reviews={reviews} onPublish={toggleReview} onDelete={removeReview} /> : null}
    </main>
  );
}
