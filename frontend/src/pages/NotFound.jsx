import AppHeader from '../components/AppHeader.jsx';
import Button from '../components/Button.jsx';
import EmptyState from '../components/EmptyState.jsx';

export default function NotFound() {
  return (
    <>
      <AppHeader />
      <main id="main" className="mx-auto max-w-2xl px-4 py-20">
        <p className="mb-3 text-center font-display text-7xl font-bold text-text-muted" aria-hidden="true">
          404
        </p>
        <EmptyState
          icon="search"
          headline="Page not found"
          copy="The page you're looking for doesn't exist — it may have been moved or the link is out of date."
          ctaLabel="Back home"
          ctaTo="/"
          secondary={
            <Button variant="secondary" to="/tournaments">
              Browse tournaments
            </Button>
          }
        />
      </main>
    </>
  );
}
