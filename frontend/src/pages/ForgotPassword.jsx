import { useState } from 'react';
import { Link } from 'react-router-dom';
import AppHeader from '../components/AppHeader.jsx';
import Card from '../components/Card.jsx';
import Button from '../components/Button.jsx';
import Field from '../components/ui/Field.jsx';
import Alert from '../components/ui/Alert.jsx';
import Icon from '../components/ui/Icon.jsx';
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
      <main id="main" className="mx-auto max-w-md px-4 py-10 md:py-14">
        <Card className="p-6 md:p-8">
          <h1 className="font-display text-display-sm font-bold uppercase">Reset your password</h1>
          <p className="mt-1 text-sm text-text-secondary">Enter the email you signed up with and we will create a reset link.</p>

          {result ? (
            <div className="mt-6 space-y-4" role="status">
              <Alert tone="success">If an account exists, a reset link has been created.</Alert>
              {resetHref ? (
                <Alert tone="warning" title="Development shortcut">
                  <p>Email delivery is not configured in this environment, so here is your reset link directly:</p>
                  <Link to={resetHref} className="link mt-2 inline-flex min-h-11 items-center gap-1" data-testid="dev-reset-link">
                    Open reset link <Icon name="arrowRight" size={14} />
                  </Link>
                </Alert>
              ) : (
                <p className="text-sm text-text-muted">Check your inbox for the link. It expires in one hour.</p>
              )}
              <Link to="/login" className="link inline-flex min-h-11 items-center gap-1 text-sm">
                <Icon name="arrowLeft" size={14} /> Back to sign in
              </Link>
            </div>
          ) : (
            <form className="mt-6 space-y-4" onSubmit={onSubmit}>
              <Field label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" inputMode="email" required />
              {error ? <Alert tone="danger">{error}</Alert> : null}
              <Button type="submit" size="lg" full disabled={busy || !email}>
                {busy ? 'Please wait…' : 'Create reset link'}
              </Button>
              <p className="text-center text-sm text-text-secondary">
                Remembered it?{' '}
                <Link to="/login" className="link">
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
