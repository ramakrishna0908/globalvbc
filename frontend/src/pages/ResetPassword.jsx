import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import AppHeader from '../components/AppHeader.jsx';
import Card from '../components/Card.jsx';
import Button from '../components/Button.jsx';
import Field from '../components/ui/Field.jsx';
import Alert from '../components/ui/Alert.jsx';
import Icon from '../components/ui/Icon.jsx';
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
      <main id="main" className="mx-auto max-w-md px-4 py-10 md:py-14">
        <Card className="p-6 md:p-8">
          <h1 className="font-display text-display-sm font-bold uppercase">Choose a new password</h1>

          {!token ? (
            <div className="mt-6 space-y-4">
              <Alert tone="danger">This reset link is missing its token. Request a new one to continue.</Alert>
              <Link to="/forgot-password" className="link inline-flex min-h-11 items-center gap-1">
                Request a new reset link <Icon name="arrowRight" size={14} />
              </Link>
            </div>
          ) : (
            <form className="mt-6 space-y-4" onSubmit={onSubmit}>
              <Field label="New password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} autoComplete="new-password" hint="At least 8 characters." required />
              <Field label="Confirm password" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} minLength={8} autoComplete="new-password" error={mismatch ? 'Passwords do not match' : undefined} required />
              {error ? (
                <Alert tone="danger">
                  {error}{' '}
                  <Link to="/forgot-password" className="link">
                    Request a new link
                  </Link>
                </Alert>
              ) : null}
              <Button type="submit" size="lg" full disabled={busy || mismatch || password.length < 8}>
                {busy ? 'Please wait…' : 'Set new password'}
              </Button>
            </form>
          )}
        </Card>
      </main>
    </>
  );
}
