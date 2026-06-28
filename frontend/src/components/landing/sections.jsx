import { Link } from 'react-router-dom';
import Card from '../Card.jsx';
import StatCard from '../StatCard.jsx';

export function SocialProof() {
  const stats = [
    ['2,400+', 'Players joined'],
    ['18,000+', 'Matches tracked'],
    ['35', 'Communities'],
  ];
  const testimonials = [
    ['“My rating finally reflects how I actually play. Climbing the local board is addictive.”', 'Marcus, Outside Hitter'],
    ['“Recording matches takes 20 seconds and the badges keep my whole team motivated.”', 'Priya, Setter'],
    ['“I shared my profile with a tournament organizer and got invited to a higher division.”', 'Diego, Opposite'],
  ];
  return (
    <section className="border-y border-border-default bg-bg-surface py-14">
      <div className="mx-auto max-w-6xl px-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {stats.map(([v, l]) => (
            <div key={l} className="text-center">
              <div className="font-display text-4xl font-bold text-brand-400">{v}</div>
              <div className="mt-1 text-text-secondary">{l}</div>
            </div>
          ))}
        </div>
        <div className="mt-12 grid grid-cols-1 gap-4 md:grid-cols-3">
          {testimonials.map(([quote, who]) => (
            <Card key={who} className="p-5">
              <p className="text-text-secondary">{quote}</p>
              <p className="mt-3 text-sm font-semibold text-text-primary">{who}</p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

export function HowItWorks() {
  const steps = [
    ['1', 'Create Your Profile', '👤'],
    ['2', 'Track Matches', '🏐'],
    ['3', 'Get Rated', '⭐'],
    ['4', 'Earn Recognition', '🏅'],
    ['5', 'Climb the Leaderboard', '📈'],
  ];
  return (
    <section id="how-it-works" className="py-16">
      <div className="mx-auto max-w-6xl px-4">
        <h2 className="text-center font-display text-3xl font-bold">How It Works</h2>
        <div className="mt-10 grid grid-cols-2 gap-6 md:grid-cols-5">
          {steps.map(([n, label, icon]) => (
            <div key={n} className="flex flex-col items-center text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-accent-500/15 text-2xl">
                {icon}
              </div>
              <div className="mt-3 text-sm font-semibold text-accent-400">Step {n}</div>
              <div className="text-sm text-text-secondary">{label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function FeatureGrid() {
  const features = [
    ['Player Ratings', 'See where you stand locally.', '⭐'],
    ['Match History', 'Every match becomes part of your story.', '📜'],
    ['Performance Stats', 'Track wins, consistency, and growth.', '📊'],
    ['Recognition Badges', 'Unlock achievements and milestones.', '🏅'],
    ['Leaderboards', 'Compete with nearby players.', '🏆'],
    ['Shareable Profiles', 'Showcase your volleyball identity.', '🔗'],
  ];
  return (
    <section id="features" className="border-t border-border-default bg-bg-surface py-16">
      <div className="mx-auto max-w-6xl px-4">
        <h2 className="text-center font-display text-3xl font-bold">Everything you need to level up</h2>
        <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map(([title, copy, icon]) => (
            <Card key={title} className="p-6">
              <div className="text-3xl">{icon}</div>
              <h3 className="mt-3 font-display text-lg font-semibold">{title}</h3>
              <p className="mt-1 text-text-secondary">{copy}</p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

export function DashboardPreview() {
  return (
    <section id="rankings" className="py-16">
      <div className="mx-auto max-w-6xl px-4">
        <h2 className="text-center font-display text-3xl font-bold">Your Volleyball Identity</h2>
        <p className="mt-2 text-center text-text-secondary">
          Understand your rating, progress, and next milestone at a glance.
        </p>
        <div className="mt-10 grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatCard label="Rating" value="8.3" sublabel="↑ +0.4 this month" accent="gold" />
          <StatCard label="Local Rank" value="#14" sublabel="▲ up 2" accent="blue" />
          <StatCard label="Matches" value="48" accent="default" />
          <StatCard label="Win Rate" value="68%" accent="blue" />
        </div>
      </div>
    </section>
  );
}

export function FinalCTA() {
  return (
    <section className="bg-gradient-to-br from-accent-600 to-violet-600 py-16">
      <div className="mx-auto max-w-3xl px-4 text-center">
        <h2 className="font-display text-3xl font-bold text-white">
          Start Building Your Volleyball Reputation Today.
        </h2>
        <div className="mt-6 flex justify-center gap-3">
          <Link
            to="/register"
            className="rounded-lg bg-white px-6 py-3 font-semibold text-accent-600 hover:bg-white/90"
          >
            Join as Player
          </Link>
          <Link
            to="/p/sample"
            className="rounded-lg border border-white/70 px-6 py-3 font-semibold text-white hover:bg-white/10"
          >
            View Sample Profile
          </Link>
        </div>
      </div>
    </section>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-border-default py-10">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 sm:flex-row">
        <div className="flex items-center gap-2">
          <span className="text-xl">🏐</span>
          <span className="font-display font-bold text-brand-500">GlobalVBC</span>
        </div>
        <nav className="flex flex-wrap gap-5 text-sm text-text-secondary">
          {['About', 'Contact', 'Privacy', 'Terms'].map((l) => (
            <a key={l} href="#" className="hover:text-text-primary">
              {l}
            </a>
          ))}
        </nav>
        <div className="flex gap-3 text-text-muted">
          <a href="#" aria-label="Twitter">𝕏</a>
          <a href="#" aria-label="Instagram">📷</a>
        </div>
      </div>
    </footer>
  );
}
