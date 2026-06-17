import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { clearAuthToken, currentUser } from '../lib/api';
import type { User } from '../lib/types';

export function Account() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    currentUser()
      .then(setUser)
      .catch((err) => setError(err instanceof Error ? err.message : 'Sign in required.'));
  }, []);

  function logout() {
    clearAuthToken();
    if (window.ShopBotConfig) delete window.ShopBotConfig.sessionId;
    navigate('/');
  }

  if (error) {
    return (
      <main className="max-w-[520px] mx-auto px-6 py-14">
        <section className="rounded-[10px] border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
          <p className="text-[13px] text-[var(--color-muted)]">{error}</p>
          <Link className="mt-4 inline-block text-[var(--color-accent-dark)]" to="/login">Login</Link>
        </section>
      </main>
    );
  }

  return (
    <main className="max-w-[720px] mx-auto px-6 py-14">
      <section className="rounded-[10px] border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
        <p className="text-[11px] uppercase tracking-[0.08em] text-[var(--color-muted)]">Account</p>
        <h1 className="mt-2 text-[24px] text-[var(--color-ink)]">{user?.name || user?.email || 'Loading...'}</h1>
        {user ? (
          <div className="mt-5 grid gap-2 text-[13px] text-[var(--color-muted)]">
            <p>Email: <span className="text-[var(--color-ink)]">{user.email}</span></p>
            <p>Role: <span className="text-[var(--color-ink)]">{user.role}</span></p>
          </div>
        ) : null}
        <button
          className="mt-6 h-10 rounded-[8px] border border-[var(--color-border)] px-4 text-[13px] text-[var(--color-ink)]"
          type="button"
          onClick={logout}
        >
          Logout
        </button>
      </section>
    </main>
  );
}
