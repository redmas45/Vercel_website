import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { addAddress, listAddresses, listOrders } from '../lib/accountApi';
import { clearAuthToken, currentUser } from '../lib/authApi';
import type { Address, User } from '../lib/types';

const NAV = [
  ['/account', 'Overview'],
  ['/account/orders', 'Orders'],
  ['/account/wishlist', 'Wishlist'],
  ['/account/profile', 'Profile'],
  ['/account/addresses', 'Addresses'],
] as const;

export function Account() {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<User | null>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [orders, setOrders] = useState<unknown[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    currentUser()
      .then(setUser)
      .catch(() => setError('Sign in required.'));
    listAddresses().then(setAddresses).catch(() => undefined);
    listOrders().then(setOrders).catch(() => undefined);
  }, []);

  function logout(): void {
    clearAuthToken();
    if (window.ShopBotConfig) delete window.ShopBotConfig.sessionId;
    navigate('/');
  }

  if (error) {
    return (
      <main className="mx-auto max-w-[520px] px-6 py-14">
        <section className="rounded-[8px] border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
          <p className="text-[13px] text-[var(--color-muted)]">{error}</p>
          <Link className="mt-4 inline-block text-[var(--color-accent)]" to="/login">Login</Link>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-[1040px] px-4 py-10 md:px-6">
      <div className="grid gap-6 md:grid-cols-[220px_1fr]">
        <aside className="rounded-[8px] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
          <p className="text-[11px] uppercase tracking-[0.08em] text-[var(--color-muted)]">Account</p>
          <h1 className="mt-2 text-[20px] font-[500] text-[var(--color-ink)]">{user?.name || user?.email || 'Loading...'}</h1>
          <nav className="mt-5 grid gap-1">
            {NAV.map(([href, label]) => (
              <Link key={href} className={`rounded-[8px] px-3 py-2 text-[13px] ${location.pathname === href ? 'bg-[var(--color-ink)] text-[var(--color-paper)]' : 'text-[var(--color-muted)]'}`} to={href}>{label}</Link>
            ))}
          </nav>
          <button className="mt-5 h-9 rounded-[8px] border border-[var(--color-border)] px-4 text-[12px]" type="button" onClick={logout}>Logout</button>
        </aside>
        <section className="rounded-[8px] border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
          {location.pathname.endsWith('/orders') ? <Orders orders={orders} /> : null}
          {location.pathname.endsWith('/profile') ? <Profile user={user} /> : null}
          {location.pathname.endsWith('/addresses') ? <Addresses addresses={addresses} onAdd={setAddresses} /> : null}
          {location.pathname === '/account' ? <Overview user={user} addresses={addresses} orders={orders} /> : null}
        </section>
      </div>
    </main>
  );
}

function Overview({ user, addresses, orders }: { user: User | null; addresses: Address[]; orders: unknown[] }) {
  return <div><h2 className="text-[18px] font-[500]">Overview</h2><p className="mt-3 text-[13px] text-[var(--color-muted)]">Email: {user?.email}</p><p className="text-[13px] text-[var(--color-muted)]">Saved addresses: {addresses.length}</p><p className="text-[13px] text-[var(--color-muted)]">Orders: {orders.length}</p></div>;
}

function Orders({ orders }: { orders: unknown[] }) {
  return <div><h2 className="text-[18px] font-[500]">Orders</h2><p className="mt-3 text-[13px] text-[var(--color-muted)]">{orders.length ? 'Orders are ready.' : 'No orders yet.'}</p></div>;
}

function Profile({ user }: { user: User | null }) {
  return <div><h2 className="text-[18px] font-[500]">Profile</h2><div className="mt-4 grid gap-3"><input className="h-10 rounded-[8px] border border-[var(--color-border)] px-3 text-[13px]" value={user?.name || ''} readOnly /><input className="h-10 rounded-[8px] border border-[var(--color-border)] px-3 text-[13px]" value={user?.email || ''} readOnly /></div></div>;
}

function Addresses({ addresses, onAdd }: { addresses: Address[]; onAdd: (addresses: Address[]) => void }) {
  async function submit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const address = await addAddress({
      name: String(data.get('name') || ''),
      phone: String(data.get('phone') || ''),
      line1: String(data.get('line1') || ''),
      line2: String(data.get('line2') || ''),
      city: String(data.get('city') || ''),
      state: String(data.get('state') || ''),
      pincode: String(data.get('pincode') || ''),
      is_default: addresses.length === 0,
    });
    onAdd([address, ...addresses]);
    form.reset();
  }

  return (
    <div>
      <h2 className="text-[18px] font-[500]">Addresses</h2>
      <div className="mt-4 grid gap-3">{addresses.map((item) => <article key={item.id} className="rounded-[8px] border border-[var(--color-border)] p-3 text-[13px] text-[var(--color-muted)]">{item.name}, {item.line1}, {item.city} {item.pincode}</article>)}</div>
      <form className="mt-5 grid gap-3 md:grid-cols-2" onSubmit={submit}>
        {['name', 'phone', 'line1', 'line2', 'city', 'state', 'pincode'].map((name) => <input key={name} className="h-10 rounded-[8px] border border-[var(--color-border)] px-3 text-[13px]" name={name} placeholder={name} required={name !== 'line2'} />)}
        <button className="h-10 rounded-[8px] bg-[var(--color-ink)] px-4 text-[13px] text-[var(--color-paper)]" type="submit">Save address</button>
      </form>
    </div>
  );
}
