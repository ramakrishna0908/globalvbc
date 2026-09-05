import { Navigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

/**
 * Requires a signed-in user. Pass `roles` to restrict further; admins always
 * pass. Wrong role renders a friendly 403 rather than bouncing the user around.
 */
export default function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) {
    return <div className="flex min-h-screen items-center justify-center text-text-muted">Loading…</div>;
  }
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (roles && user.role !== 'admin' && !roles.includes(user.role)) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <div className="text-4xl" aria-hidden="true">🔒</div>
        <h1 className="mt-3 font-display text-2xl font-bold">This area is for {roles.join(' / ')}s</h1>
        <p className="mt-2 text-text-secondary">
          Your account is a <b>{user.role}</b>. You can change your role from{' '}
          <Link to="/onboarding" className="font-semibold text-accent-400 hover:underline">
            your profile
          </Link>
          .
        </p>
        <Link to="/" className="mt-6 inline-block font-semibold text-accent-400 hover:underline">
          ← Back home
        </Link>
      </div>
    );
  }
  return children;
}
