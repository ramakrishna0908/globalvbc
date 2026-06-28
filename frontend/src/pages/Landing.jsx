import { Link } from 'react-router-dom';
import ThemeToggle from '../components/ThemeToggle.jsx';
import Button from '../components/Button.jsx';
import HeroVisual from '../components/landing/HeroVisual.jsx';
import {
  SocialProof,
  HowItWorks,
  FeatureGrid,
  DashboardPreview,
  FinalCTA,
  Footer,
} from '../components/landing/sections.jsx';

function Nav() {
  const links = [
    ['Features', '#features'],
    ['Rankings', '#rankings'],
    ['How It Works', '#how-it-works'],
  ];
  return (
    <header className="sticky top-0 z-30 border-b border-border-default bg-bg-page/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link to="/" className="flex items-center gap-2">
          <span className="text-2xl">🏐</span>
          <span className="font-display text-xl font-bold text-brand-500">GlobalVBC</span>
        </Link>
        <nav className="hidden gap-6 md:flex">
          {links.map(([label, href]) => (
            <a key={href} href={href} className="text-sm text-text-secondary hover:text-text-primary">
              {label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <Link to="/login" className="text-sm font-medium text-text-secondary hover:text-text-primary">
            Sign In
          </Link>
          <Link to="/register">
            <Button size="sm">Join as Player</Button>
          </Link>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 md:grid-cols-2 md:py-24">
      <div>
        <h1 className="font-display text-5xl font-bold leading-tight text-text-primary md:text-6xl">
          Build Your Volleyball Reputation.
        </h1>
        <p className="mt-5 max-w-lg text-lg text-text-secondary">
          Track matches, earn ratings, showcase achievements, and climb your local rankings.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link to="/register">
            <Button size="lg">Join as Player</Button>
          </Link>
          <Link to="/p/sample">
            <Button variant="secondary" size="lg">
              View Sample Profile
            </Button>
          </Link>
        </div>
      </div>
      <div className="flex justify-center md:justify-end">
        <HeroVisual />
      </div>
    </section>
  );
}

export default function Landing() {
  return (
    <>
      <Nav />
      <Hero />
      <SocialProof />
      <HowItWorks />
      <FeatureGrid />
      <DashboardPreview />
      <FinalCTA />
      <Footer />
    </>
  );
}
