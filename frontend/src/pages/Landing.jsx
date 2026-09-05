import AppHeader from '../components/AppHeader.jsx';
import HeroVisual from '../components/landing/HeroVisual.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import {
  CtaPair,
  Eyebrow,
  ValueProps,
  HowItWorks,
  RatingExplainer,
  LiveScoringPreview,
  TournamentPreview,
  ProfilePreview,
  LeaderboardPreview,
  Testimonials,
  FinalCTA,
  Footer,
} from '../components/landing/sections.jsx';

const SCORING_ROLES = ['scorer', 'organizer', 'coach', 'admin'];

/** Where "Start Scoring" goes: straight to the scorer desk for scoring roles, else register as a scorer. */
export function startScoringHref(user) {
  return user && SCORING_ROLES.includes(user.role) ? '/score' : '/register?role=scorer';
}

const ANCHORS = [
  ['Product', '#product'],
  ['How it works', '#how-it-works'],
  ['Rating', '#rating'],
  ['Live scoring', '#live'],
  ['Tournaments', '#tournaments'],
];

function Hero({ startHref }) {
  return (
    <section className="relative overflow-hidden" aria-labelledby="hero-heading">
      {/* Court-line backdrop */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        aria-hidden="true"
        style={{
          backgroundImage:
            'linear-gradient(to right, rgb(var(--text-primary)) 1px, transparent 1px), linear-gradient(to bottom, rgb(var(--text-primary)) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
          maskImage: 'radial-gradient(ellipse at center, black 30%, transparent 75%)',
          WebkitMaskImage: 'radial-gradient(ellipse at center, black 30%, transparent 75%)',
        }}
      />
      <div className="pointer-events-none absolute -left-32 top-10 h-72 w-72 rounded-full bg-accent-500/20 blur-3xl" aria-hidden="true" />
      <div className="pointer-events-none absolute -right-24 bottom-0 h-72 w-72 rounded-full bg-brand-500/20 blur-3xl" aria-hidden="true" />

      <div className="relative mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)] items-center gap-12 px-4 pb-16 pt-14 md:grid-cols-[1.1fr_1fr] md:pb-24 md:pt-20">
        <div className="min-w-0">
          <Eyebrow tone="accent">Scoring · Stats · Tournaments</Eyebrow>
          <h1 id="hero-heading" className="mt-4 font-display text-4xl font-bold leading-[1.05] text-text-primary sm:text-5xl md:text-6xl">
            Score the match.
            <br />
            <span className="bg-gradient-to-r from-brand-300 to-brand-500 bg-clip-text text-transparent">Build your volleyball identity.</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg text-text-secondary md:text-xl">
            Rally-by-rally scoring that turns every friendly, league night and tournament into real stats, an explainable rating and standings that update themselves.
          </p>
          <div className="mt-8">
            <CtaPair startHref={startHref} />
          </div>
          <dl className="mt-10 grid max-w-md grid-cols-3 gap-4 border-t border-border-default pt-6">
            {[
              ['1 tap', 'per rally'],
              ['Offline', 'first scoring'],
              ['v2', 'versioned rating'],
            ].map(([v, l]) => (
              <div key={l}>
                <dt className="sr-only">{l}</dt>
                <dd className="font-display text-2xl font-bold text-text-primary">{v}</dd>
                <dd className="text-xs uppercase tracking-wider text-text-muted">{l}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="flex min-w-0 justify-center md:justify-end">
          <HeroVisual />
        </div>
      </div>
    </section>
  );
}

function AnchorNav() {
  return (
    <nav aria-label="Page sections" className="hidden border-b border-border-default bg-bg-page/80 backdrop-blur md:block">
      <div className="mx-auto flex max-w-6xl gap-1 px-4">
        {ANCHORS.map(([label, href]) => (
          <a key={href} href={href} className="inline-flex min-h-[44px] items-center px-3 text-sm font-semibold text-text-secondary hover:text-text-primary">
            {label}
          </a>
        ))}
      </div>
    </nav>
  );
}

export default function Landing() {
  const { user } = useAuth();
  const startHref = startScoringHref(user);
  return (
    <>
      <AppHeader />
      <AnchorNav />
      <main>
        <Hero startHref={startHref} />
        <ValueProps />
        <HowItWorks />
        <RatingExplainer />
        <LiveScoringPreview />
        <TournamentPreview />
        <ProfilePreview />
        <LeaderboardPreview />
        <Testimonials />
        <FinalCTA startHref={startHref} />
      </main>
      <Footer />
    </>
  );
}
