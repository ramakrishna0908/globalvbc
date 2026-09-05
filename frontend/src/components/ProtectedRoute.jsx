import { Navigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import AppHeader from './AppHeader.jsx';
import EmptyState from './EmptyState.jsx';
import { LoadingBlock } from './ui/Loading.jsx';
import { ROLE_LABELS } from '../lib/format.js';

/**
 * Requires a signed-in user. Pass `roles` to restrict further; admins always
 * pass. Wrong role renders a friendly 403 rather than bouncing the user around.
 */
export default function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingBlock label="Loading…" />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (roles && user.role !== 'admin' && !roles.includes(user.role)) {
    return (
      <>
        <AppHeader />
        <main id="main" className="mx-auto max-w-md px-4 py-16">
          <EmptyState
            icon="lock"
            headline={`This area is for ${roles.map((r) => ROLE_LABELS[r] || r).join(' / ')}s`}
            copy={
              <>
                Your account is a <b>{ROLE_LABELS[user.role] || user.role}</b>. You can change your role from{' '}
                <Link to="/onboarding" className="link">
                  your profile
                </Link>
                .
              </>
            }
            ctaLabel="Back home"
            ctaTo="/"
          />
        </main>
      </>
    );
  }
  return children;
}
