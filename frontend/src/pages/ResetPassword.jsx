import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import AppHeader from '../components/AppHeader.jsx';
import Card from '../components/Card.jsx';
import Button from '../components/Button.jsx';
import Field from '../components/ui/Field.jsx';
import { authApi } from '../api/endpoints.js';
import { setToken } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const mismatch = confirm.length > 0 && confirm !== password;

  async function onSubmit(e) {
    e.preventDefault();
    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }
    setError('');
    setBusy(true);
    try {
      const data = await authApi.reset({ token, password });
      setToken(data.token);
      setUser(data.user);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || 'Reset link is invalid or has expired');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <AppHeader />
      <main className="mx-auto max-w-md px-4 py-10 md:py-12">
        <Card className="p-6 md:p-8">
          <h1 className="font-display text-2xl font-bold">Choose a new password</h1>

          {!token ? (
            <div className="mt-6 space-y-4">
              <p role="alert" className="rounded-xl border border-status-danger/50 bg-status-danger/10 p-4 text-sm text-text-primary">
                This reset link is missing its token. Request a new one to continue.
              </p>
              <Link to="/forgot-password" className="inline-flex min-h-[44px] items-center font-semibold text-accent-400 hover:underline">
                Request a new reset link →
              </Link>
            </div>
          ) : (
            <form className="mt-6 space-y-4" onSubmit={onSubmit}>
              <Field label="New password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} autoComplete="new-password" hint="At least 8 characters." required />
              <Field
                label="Confirm password"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                minLength={8}
                autoComplete="new-password"
                error={mismatch ? 'Passwords do not match' : undefined}
                required
              />
              {error ? (
                <div role="alert" className="rounded-xl border border-status-danger/50 bg-status-danger/10 p-3 text-sm text-text-primary">
                  {error}{' '}
                  <Link to="/forgot-password" className="font-semibold text-accent-400 hover:underline">
                    Request a new link
                  </Link>
                </div>
              ) : null}
              <Button type="submit" size="lg" className="min-h-[48px] w-full" disabled={busy || mismatch || password.length < 8}>
                {busy ? 'Please wait…' : 'Set new password'}
              </Button>
            </form>
          )}
        </Card>
      </main>
    </>
  );
}
