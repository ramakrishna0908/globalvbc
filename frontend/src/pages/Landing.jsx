import { Link } from 'react-router-dom';
import AppHeader from '../components/AppHeader.jsx';
import Button from '../components/Button.jsx';

// Stub — full 8-section landing page lands in Epic F (#6).
export default function Landing() {
  return (
    <>
      <AppHeader
        right={
          <Link to="/login" className="text-sm font-medium text-text-secondary hover:text-text-primary">
            Sign In
          </Link>
        }
      />
      <main className="mx-auto max-w-3xl px-4 py-24 text-center">
        <h1 className="font-display text-5xl font-bold text-text-primary">
          Build Your Volleyball Reputation.
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-lg text-text-secondary">
          Track matches, earn ratings, showcase achievements, and climb your local rankings.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link to="/register">
            <Button size="lg">Join as Player</Button>
          </Link>
          <Link to="/p/sample">
            <Button variant="secondary" size="lg">
              View Sample Profile
            </Button>
          </Link>
        </div>
      </main>
    </>
  );
}
