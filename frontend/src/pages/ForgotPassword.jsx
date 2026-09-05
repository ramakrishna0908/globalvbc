import { useState } from 'react';
import { Link } from 'react-router-dom';
import AppHeader from '../components/AppHeader.jsx';
import Card from '../components/Card.jsx';
import Button from '../components/Button.jsx';
import Field from '../components/ui/Field.jsx';
import { authApi } from '../api/endpoints.js';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null); // { ok, devResetToken? }

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      setResult(await authApi.forgot(email.trim()));
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong');
    } finally {
      setBusy(false);
    }
  }

  const resetHref = result?.devResetToken ? `/reset-password?token=${encodeURIComponent(result.devResetToken)}` : null;

  return (
    <>
      <AppHeader />
      <main className="mx-auto max-w-md px-4 py-10 md:py-12">
        <Card className="p-6 md:p-8">
          <h1 className="font-display text-2xl font-bold">Reset your password</h1>
          <p className="mt-1 text-sm text-text-secondary">Enter the email you signed up with and we will create a reset link.</p>

          {result ? (
            <div className="mt-6 space-y-4" role="status">
              <div className="rounded-xl border border-status-success/40 bg-status-success/10 p-4 text-sm text-text-primary">
                If an account exists, a reset link has been created.
              </div>
              {resetHref ? (
                <div className="rounded-xl border border-status-warning/50 bg-status-warning/10 p-4 text-sm">
                  <p className="font-semibold text-text-primary">Development shortcut</p>
                  <p className="mt-1 text-text-secondary">Email delivery is not configured in this environment, so here is your reset link directly:</p>
                  <Link to={resetHref} className="mt-3 inline-flex min-h-[44px] items-center font-semibold text-accent-400 hover:underline" data-testid="dev-reset-link">
                    Open reset link →
                  </Link>
                </div>
              ) : (
                <p className="text-sm text-text-muted">Check your inbox for the link. It expires in one hour.</p>
              )}
              <Link to="/login" className="inline-flex min-h-[44px] items-center text-sm font-semibold text-accent-400 hover:underline">
                ← Back to sign in
              </Link>
            </div>
          ) : (
            <form className="mt-6 space-y-4" onSubmit={onSubmit}>
              <Field label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
              {error ? (
                <p role="alert" className="text-sm text-status-danger">
                  {error}
                </p>
              ) : null}
              <Button type="submit" size="lg" className="min-h-[48px] w-full" disabled={busy || !email}>
                {busy ? 'Please wait…' : 'Create reset link'}
              </Button>
              <p className="text-center text-sm text-text-secondary">
                Remembered it?{' '}
                <Link to="/login" className="font-semibold text-accent-400 hover:underline">
                  Sign in
                </Link>
              </p>
            </form>
          )}
        </Card>
      </main>
    </>
  );
}
