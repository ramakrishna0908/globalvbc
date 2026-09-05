import { useState } from 'react';
import { useNavigate, Link, useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import AppHeader from './AppHeader.jsx';
import Card from './Card.jsx';
import Button from './Button.jsx';
import Field from './ui/Field.jsx';

/** Self-service roles. Admin is granted by an existing admin, never picked here. */
export const ROLE_OPTIONS = [
  { key: 'player', icon: '🏐', label: 'Player', copy: 'Build your profile, stats and rating from scored matches.' },
  { key: 'scorer', icon: '📋', label: 'Scorer', copy: 'Score matches rally-by-rally from the table.' },
  { key: 'coach', icon: '🧠', label: 'Coach', copy: 'Manage rosters and read the boxscores.' },
  { key: 'organizer', icon: '🏆', label: 'Organizer', copy: 'Run tournaments: pools, brackets, courts.' },
];
const ROLE_KEYS = ROLE_OPTIONS.map((r) => r.key);

/** Landing spot right after account creation. */
export function postRegisterPath(user) {
  switch (user?.role) {
    case 'scorer':
      return '/score';
    case 'organizer':
      return '/tournaments/new';
    case 'coach':
      return '/teams?mine=1';
    default:
      return user?.profile_complete ? '/dashboard' : '/onboarding';
  }
}

/** Landing spot after sign in: honour the page that bounced us here, else go by role. */
export function postLoginPath(user, from) {
  if (from) return from;
  switch (user?.role) {
    case 'scorer':
      return '/score';
    case 'organizer':
      return '/tournaments?mine=1';
    case 'admin':
      return '/admin';
    case 'coach':
      return '/teams?mine=1';
    default:
      return '/dashboard';
  }
}

function RolePicker({ value, onChange }) {
  return (
    <fieldset>
      <legend className="text-sm font-semibold text-text-secondary">I am joining as a…</legend>
      <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2" role="group" aria-label="Account role">
        {ROLE_OPTIONS.map((r) => {
          const selected = value === r.key;
          return (
            <button
              key={r.key}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange(r.key)}
              data-testid={`role-${r.key}`}
              className={`flex min-h-[56px] items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors ${
                selected ? 'border-accent-500 bg-accent-500/10 ring-2 ring-accent-500/30' : 'border-border-default bg-bg-surface hover:border-border-strong hover:bg-bg-elevated'
              }`}
            >
              <span className="text-2xl" aria-hidden="true">
                {r.icon}
              </span>
              <span className="min-w-0">
                <span className={`block text-sm font-bold ${selected ? 'text-accent-400' : 'text-text-primary'}`}>{r.label}</span>
                <span className="block text-xs leading-snug text-text-muted">{r.copy}</span>
              </span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

export default function AuthForm({ mode }) {
  const isRegister = mode === 'register';
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const requestedRole = params.get('role');
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: ROLE_KEYS.includes(requestedRole) ? requestedRole : 'player',
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      if (isRegister) {
        const user = await register({ name: form.name, email: form.email, password: form.password, role: form.role });
        navigate(postRegisterPath(user), { replace: true });
      } else {
        const user = await login({ email: form.email, password: form.password });
        navigate(postLoginPath(user, location.state?.from), { replace: true });
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong');
    } finally {
      setBusy(false);
    }
  }

  const selectedRole = ROLE_OPTIONS.find((r) => r.key === form.role);

  return (
    <>
      <AppHeader />
      <main className="mx-auto max-w-lg px-4 py-10 md:py-12">
        <Card className="p-6 md:p-8">
          <h1 className="font-display text-2xl font-bold">{isRegister ? 'Create your account' : 'Sign in'}</h1>
          <p className="mt-1 text-sm text-text-secondary">
            {isRegister ? 'Score matches, run tournaments, or build your player identity.' : 'Welcome back to GlobalVBC.'}
          </p>

          <form className="mt-6 space-y-4" onSubmit={onSubmit} noValidate={false}>
            {isRegister ? <RolePicker value={form.role} onChange={(role) => setForm((f) => ({ ...f, role }))} /> : null}

            {isRegister ? <Field label="Name" value={form.name} onChange={set('name')} autoComplete="name" required /> : null}
            <Field label="Email" type="email" value={form.email} onChange={set('email')} autoComplete="email" required />
            <Field
              label="Password"
              type="password"
              value={form.password}
              onChange={set('password')}
              minLength={8}
              autoComplete={isRegister ? 'new-password' : 'current-password'}
              hint={isRegister ? 'At least 8 characters.' : undefined}
              required
            />

            {!isRegister ? (
              <div className="text-right text-sm">
                <Link to="/forgot-password" className="inline-flex min-h-[44px] items-center font-semibold text-accent-400 hover:underline">
                  Forgot password?
                </Link>
              </div>
            ) : null}

            {error ? (
              <p role="alert" className="text-sm text-status-danger">
                {error}
              </p>
            ) : null}

            <Button type="submit" size="lg" className="min-h-[48px] w-full" disabled={busy}>
              {busy ? 'Please wait…' : isRegister ? `Create ${selectedRole?.label || ''} account` : 'Sign in'}
            </Button>
          </form>

          <p className="mt-4 text-center text-sm text-text-secondary">
            {isRegister ? (
              <>
                Already have an account?{' '}
                <Link to="/login" className="font-semibold text-accent-400 hover:underline">
                  Sign in
                </Link>
              </>
            ) : (
              <>
                New here?{' '}
                <Link to="/register" className="font-semibold text-accent-400 hover:underline">
                  Create an account
                </Link>
              </>
            )}
          </p>
        </Card>
      </main>
    </>
  );
}
