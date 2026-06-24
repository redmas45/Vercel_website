import { type FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Field } from '../components/ui/FormField';
import { login } from '../lib/authApi';

export function Login() {
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    const formData = new FormData(event.currentTarget);
    try {
      const response = await login(String(formData.get('email') || ''), String(formData.get('password') || ''));
      window.ShopBotConfig = { ...window.ShopBotConfig, sessionId: `user-${response.user.id}` };
      navigate(response.user.role === 'admin' ? '/admin' : '/account');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="max-w-[520px] mx-auto px-6 py-14">
      <section className="rounded-[10px] border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
        <p className="text-[11px] uppercase tracking-[0.08em] text-[var(--color-muted)]">Customer access</p>
        <h1 className="mt-2 text-[24px] text-[var(--color-ink)]">Login</h1>
        <form className="mt-6 grid gap-4" onSubmit={submit}>
          <Field label="Email" name="email" type="email" autoComplete="email" required />
          <Field label="Password" name="password" type="password" autoComplete="current-password" required />
          {error ? <p className="text-[13px] text-red-600">{error}</p> : null}
          <button
            className="h-11 rounded-[8px] bg-[var(--color-ink)] px-4 text-[13px] font-[500] text-white disabled:opacity-60"
            type="submit"
            disabled={busy}
          >
            {busy ? 'Checking...' : 'Login'}
          </button>
        </form>
        <p className="mt-4 text-[13px] text-[var(--color-muted)]">
          New here? <Link className="text-[var(--color-accent-dark)]" to="/signup">Create an account</Link>
        </p>
      </section>
    </main>
  );
}
