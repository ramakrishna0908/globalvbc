import { Link } from 'react-router-dom';
import ThemeToggle from './ThemeToggle.jsx';

export default function AppHeader({ right }) {
  return (
    <header className="sticky top-0 z-30 border-b border-border-default bg-bg-page/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link to="/" className="flex items-center gap-2">
          <span className="text-2xl" aria-hidden="true">🏐</span>
          <span className="font-display text-xl font-bold text-brand-500">GlobalVBC</span>
        </Link>
        <div className="flex items-center gap-3">
          {right}
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
