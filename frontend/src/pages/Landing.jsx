import AppHeader from '../components/AppHeader.jsx';
import HeroVisual from '../components/landing/HeroVisual.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { CtaPair, ValueProps, HowItWorks, RatingExplainer, LiveScoringPreview, TournamentPreview, ProfilePreview, LeaderboardPreview, Testimonials, FinalCTA, Footer } from '../components/landing/sections.jsx';
import { Eyebrow } from '../components/ui/Section.jsx';

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
    <section className="relative overflow-hidden border-b border-border-default" aria-labelledby="hero-heading">
      <div className="court-lines pointer-events-none absolute inset-0" aria-hidden="true" />
      {/* Diagonal gold sideline, a nod to the court tape */}
      <div className="pointer-events-none absolute -right-24 top-0 hidden h-full w-40 -skew-x-12 bg-brand-500/10 lg:block" aria-hidden="true" />

      <div className="relative mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)] items-center gap-12 px-4 pb-16 pt-12 md:grid-cols-[1.1fr_1fr] md:pb-24 md:pt-20">
        <div className="min-w-0 motion-safe:animate-fade-up">
          <Eyebrow tone="accent">Scoring · Stats · Tournaments</Eyebrow>
          <h1 id="hero-heading" className="mt-4 font-display text-display-lg font-bold uppercase text-text-primary">
            Score the match.
            <br />
            <span className="text-brand-400">Build your volleyball identity.</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg text-text-secondary md:text-xl">Rally-by-rally scoring that turns every friendly, league night and tournament into real stats, an explainable rating and standings that update themselves.</p>
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
                <dd className="font-display text-3xl font-bold uppercase leading-none text-text-primary">{v}</dd>
                <dd className="eyebrow mt-1">{l}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="flex min-w-0 justify-center md:justify-end motion-safe:animate-fade-up motion-safe:[animation-delay:120ms]">
          <HeroVisual />
        </div>
      </div>
    </section>
  );
}

function AnchorNav() {
  return (
    <nav aria-label="Page sections" className="hidden border-b border-border-default bg-bg-surface/80 backdrop-blur md:block">
      <div className="mx-auto flex max-w-6xl gap-1 px-4">
        {ANCHORS.map(([label, href]) => (
          <a key={href} href={href} className="inline-flex min-h-11 items-center px-3 font-display text-sm font-bold uppercase tracking-wide text-text-secondary hover:text-text-primary">
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
      <main id="main">
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
