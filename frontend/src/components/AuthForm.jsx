import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import AppHeader from './AppHeader.jsx';
import Card from './Card.jsx';
import Button from './Button.jsx';

const field =
  'mt-1 w-full rounded-lg border border-border-default bg-bg-surface px-3 py-2 text-text-primary placeholder:text-text-muted focus:border-accent-500';

export default function AuthForm({ mode }) {
  const isRegister = mode === 'register';
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const user = isRegister ? await register(form) : await login(form);
      navigate(isRegister && !user.profile_complete ? '/onboarding' : '/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <AppHeader />
      <main className="mx-auto max-w-md px-4 py-12">
        <Card className="p-8">
          <h1 className="font-display text-2xl font-bold">
            {isRegister ? 'Join as Player' : 'Sign In'}
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            {isRegister
              ? 'Start building your volleyball reputation.'
              : 'Welcome back to GlobalVBC.'}
          </p>

          <form className="mt-6 space-y-4" onSubmit={onSubmit}>
            {isRegister && (
              <label className="block text-sm">
                <span className="text-text-secondary">Name</span>
                <input className={field} value={form.name} onChange={set('name')} required />
              </label>
            )}
            <label className="block text-sm">
              <span className="text-text-secondary">Email</span>
              <input
                type="email"
                className={field}
                value={form.email}
                onChange={set('email')}
                required
              />
            </label>
            <label className="block text-sm">
              <span className="text-text-secondary">Password</span>
              <input
                type="password"
                className={field}
                value={form.password}
                onChange={set('password')}
                minLength={8}
                required
              />
            </label>

            {error && <p className="text-sm text-status-danger">{error}</p>}

            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? 'Please wait…' : isRegister ? 'Create Account' : 'Sign In'}
            </Button>
          </form>

          <p className="mt-4 text-center text-sm text-text-secondary">
            {isRegister ? (
              <>
                Already a player?{' '}
                <Link to="/login" className="font-semibold text-accent-400 hover:underline">
                  Sign in
                </Link>
              </>
            ) : (
              <>
                New here?{' '}
                <Link to="/register" className="font-semibold text-accent-400 hover:underline">
                  Join as Player
                </Link>
              </>
            )}
          </p>
        </Card>
      </main>
    </>
  );
}
