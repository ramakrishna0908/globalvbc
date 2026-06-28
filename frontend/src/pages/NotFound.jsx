import { Link } from 'react-router-dom';
import AppHeader from '../components/AppHeader.jsx';
import EmptyState from '../components/EmptyState.jsx';

export default function NotFound() {
  return (
    <>
      <AppHeader />
      <main className="mx-auto max-w-2xl px-4 py-20">
        <EmptyState
          icon="🤔"
          headline="Page not found"
          copy="The page you're looking for doesn't exist."
        />
        <div className="mt-6 text-center">
          <Link to="/" className="font-semibold text-accent-400 hover:underline">
            Back home
          </Link>
        </div>
      </main>
    </>
  );
}
