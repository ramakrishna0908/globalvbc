import { Routes, Route } from 'react-router-dom';
import ThemeToggle from './components/ThemeToggle.jsx';

function TokenGallery() {
  const brandRamp = ['bg-brand-300', 'bg-brand-400', 'bg-brand-500', 'bg-brand-600', 'bg-brand-700'];
  return (
    <main className="mx-auto max-w-3xl p-8">
      <header className="mb-8 flex items-center justify-between">
        <h1 className="text-4xl font-display text-brand-500">GlobalVBC</h1>
        <ThemeToggle />
      </header>
      <p className="mb-6 text-text-secondary">
        Build Your Volleyball Reputation. — hybrid design tokens
      </p>

      <section className="mb-8">
        <h2 className="mb-3 text-xl font-display">Brand (gold — ratings &amp; badges)</h2>
        <div className="flex gap-2">
          {brandRamp.map((cls) => (
            <div key={cls} className={`h-12 w-12 rounded-lg ${cls}`} title={cls} />
          ))}
        </div>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-xl font-display">Accent (electric blue — CTAs)</h2>
        <div className="flex gap-3">
          <button className="rounded-lg bg-accent-500 px-5 py-2.5 font-semibold text-white hover:bg-accent-400">
            Join as Player
          </button>
          <button className="rounded-lg border border-border-strong px-5 py-2.5 font-semibold text-text-primary">
            View Sample Profile
          </button>
        </div>
      </section>

      <section className="rounded-xl bg-bg-card p-6 shadow-card">
        <h2 className="mb-1 text-xl font-display">Card surface</h2>
        <p className="text-text-muted">bg-card / text-muted on the current theme.</p>
      </section>
    </main>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<TokenGallery />} />
    </Routes>
  );
}
