import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { deriveState, FORMAT_PRESETS } from '@engine/match.js';
import Card from '../Card.jsx';
import Avatar from '../Avatar.jsx';
import ProgressBar from '../ProgressBar.jsx';
import Scoreboard from '../scoring/Scoreboard.jsx';
import StandingsTable from '../tournament/StandingsTable.jsx';

/* ----------------------------------------------------------------------------
 * Shared section primitives
 * -------------------------------------------------------------------------- */

export function Eyebrow({ children, tone = 'muted' }) {
  const cls = tone === 'accent' ? 'text-accent-400' : tone === 'gold' ? 'text-brand-400' : 'text-text-muted';
  return <p className={`text-xs font-black uppercase tracking-[0.25em] ${cls}`}>{children}</p>;
}

export function SectionHeading({ eyebrow, title, copy, align = 'center', tone }) {
  const alignCls = align === 'center' ? 'mx-auto text-center' : '';
  return (
    <div className={`max-w-2xl ${alignCls}`}>
      {eyebrow ? <Eyebrow tone={tone}>{eyebrow}</Eyebrow> : null}
      <h2 className="mt-3 font-display text-3xl font-bold leading-tight text-text-primary md:text-4xl">{title}</h2>
      {copy ? <p className="mt-3 text-base text-text-secondary md:text-lg">{copy}</p> : null}
    </div>
  );
}

export function DemoTag({ children = 'Demo' }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-brand-500/40 bg-brand-500/10 px-2.5 py-0.5 text-[11px] font-black uppercase tracking-wider text-brand-400">
      <span aria-hidden="true">●</span> {children}
    </span>
  );
}

/** CTA pair used in the hero and the closing band. */
export function CtaPair({ startHref, size = 'lg', invert = false }) {
  const base = `inline-flex min-h-[52px] items-center justify-center gap-2 rounded-xl px-6 font-semibold transition-colors ${size === 'lg' ? 'text-base md:text-lg' : 'text-sm'}`;
  const primary = invert ? 'bg-white text-accent-600 hover:bg-white/90' : 'bg-accent-500 text-white shadow-[0_10px_30px_-10px_rgb(37_99_235/0.8)] hover:bg-accent-400';
  const secondary = invert ? 'border border-white/60 text-white hover:bg-white/10' : 'border border-border-strong bg-bg-surface text-text-primary hover:bg-bg-elevated';
  return (
    <div className="flex flex-wrap gap-3">
      <Link to={startHref} className={`${base} ${primary}`}>
        <span aria-hidden="true">▶</span> Start Scoring
      </Link>
      <Link to="/leaderboard" className={`${base} ${secondary}`}>
        Explore Players
      </Link>
    </div>
  );
}

/* ----------------------------------------------------------------------------
 * 2. Value proposition
 * -------------------------------------------------------------------------- */

const VALUE_PROPS = [
  {
    icon: '⚡',
    title: 'Score any match in one tap',
    copy: 'Rally-by-rally scoring with side-outs, rotations, timeouts and undo handled by the engine. Works offline; syncs the moment you are back.',
    tone: 'text-accent-400',
    ring: 'from-accent-500/25 to-transparent',
  },
  {
    icon: '📈',
    title: 'Real player stats & ratings',
    copy: 'Every scored rally feeds a boxscore. Kills, aces, blocks, digs, assists and a versioned rating that moves for what actually happened on court.',
    tone: 'text-brand-400',
    ring: 'from-brand-500/25 to-transparent',
  },
  {
    icon: '🏆',
    title: 'Run tournaments end to end',
    copy: 'Registration, pools, brackets, courts and schedules. Standings and tie-breakers update live as scorers submit results.',
    tone: 'text-violet-400',
    ring: 'from-violet-500/25 to-transparent',
  },
];

export function ValueProps() {
  return (
    <section id="product" className="mx-auto max-w-6xl px-4 py-16 md:py-24" aria-labelledby="value-heading">
      <SectionHeading eyebrow="The platform" title={<span id="value-heading">One app for the whole match day</span>} copy="Built for the scorer's table first, then for everyone who wants to know what happened." />
      <div className="mt-12 grid gap-5 md:grid-cols-3">
        {VALUE_PROPS.map((v) => (
          <Card key={v.title} className="relative overflow-hidden p-6 md:p-7">
            <div className={`pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-gradient-to-bl blur-2xl ${v.ring}`} aria-hidden="true" />
            <div className={`text-3xl ${v.tone}`} aria-hidden="true">
              {v.icon}
            </div>
            <h3 className="mt-4 font-display text-xl font-bold text-text-primary">{v.title}</h3>
            <p className="mt-2 text-text-secondary">{v.copy}</p>
          </Card>
        ))}
      </div>
    </section>
  );
}

/* ----------------------------------------------------------------------------
 * 3. How it works
 * -------------------------------------------------------------------------- */

const STEPS = [
  { n: 1, label: 'Create teams', copy: 'Add rosters, jersey numbers and positions.', icon: '👥' },
  { n: 2, label: 'Start a match', copy: 'Pick a format, set lineups, choose who serves.', icon: '🏐' },
  { n: 3, label: 'Score rally-by-rally', copy: 'Tap the winning side, tag the action, undo anything.', icon: '⚡' },
  { n: 4, label: 'Submit', copy: 'Lock the result. The audit trail keeps every event.', icon: '✅' },
  { n: 5, label: 'Ratings & standings update', copy: 'Boxscores, ratings, pools and brackets refresh instantly.', icon: '📊' },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="border-y border-border-default bg-bg-surface py-16 md:py-24" aria-labelledby="how-heading">
      <div className="mx-auto max-w-6xl px-4">
        <SectionHeading eyebrow="How it works" title={<span id="how-heading">From first serve to final standings</span>} copy="Five steps. No spreadsheets, no WhatsApp scores, no arguments about who won set two." />
        <ol className="relative mt-12 grid gap-6 md:grid-cols-5 md:gap-4">
          <div className="pointer-events-none absolute left-7 top-0 hidden h-full w-px bg-border-strong md:left-0 md:top-7 md:block md:h-px md:w-full" aria-hidden="true" />
          {STEPS.map((s) => (
            <li key={s.n} className="relative flex gap-4 md:flex-col md:gap-3">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-border-strong bg-bg-card text-2xl shadow-card" aria-hidden="true">
                {s.icon}
              </div>
              <div>
                <div className="text-xs font-black uppercase tracking-[0.2em] text-accent-400">Step {s.n}</div>
                <h3 className="mt-1 font-display text-lg font-bold text-text-primary">{s.label}</h3>
                <p className="mt-1 text-sm text-text-secondary">{s.copy}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/* ----------------------------------------------------------------------------
 * 4. Rating explanation
 * -------------------------------------------------------------------------- */

const RATING_FACTORS = [
  { title: 'Result vs expected', copy: 'Beating a team you were expected to lose to earns more than a routine win. Losing to a stronger side costs less.', icon: '🎯' },
  { title: 'Opponent strength', copy: 'Every rating move is scaled by the gap between the two rosters on the day.', icon: '⚖️' },
  { title: 'Individual performance', copy: 'Your boxscore against your team average nudges the delta up or down. Carry the team, get paid for it.', icon: '🔥' },
  { title: 'Tournament level', copy: 'Friendly, local, regional and national matches carry different weights so ratings travel between communities.', icon: '🏟️' },
];

export function RatingExplainer() {
  return (
    <section id="rating" className="mx-auto max-w-6xl px-4 py-16 md:py-24" aria-labelledby="rating-heading">
      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-10 lg:grid-cols-[1.1fr_1fr]">
        <div>
          <SectionHeading align="left" eyebrow="Player rating" tone="gold" title={<span id="rating-heading">A rating that explains itself</span>} copy="Every change is versioned and stored with the factors that produced it, so a player can always see exactly why their number moved." />
          <ul className="mt-8 grid gap-4 sm:grid-cols-2">
            {RATING_FACTORS.map((f) => (
              <li key={f.title} className="rounded-xl border border-border-default bg-bg-card p-4">
                <div className="text-2xl" aria-hidden="true">
                  {f.icon}
                </div>
                <h3 className="mt-2 font-semibold text-text-primary">{f.title}</h3>
                <p className="mt-1 text-sm text-text-secondary">{f.copy}</p>
              </li>
            ))}
          </ul>
        </div>

        <Card className="relative overflow-hidden p-6 md:p-8">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-brand-500 via-brand-300 to-transparent" aria-hidden="true" />
          <div className="flex items-center justify-between">
            <Eyebrow tone="gold">Rating event · v2</Eyebrow>
            <DemoTag>Example</DemoTag>
          </div>
          <div className="mt-6 flex flex-wrap items-end gap-x-4 gap-y-2">
            <span className="font-display text-5xl font-black tabular-nums text-text-muted line-through decoration-2">742</span>
            <span className="font-display text-3xl text-text-muted" aria-hidden="true">
              →
            </span>
            <span className="font-display text-6xl font-black tabular-nums text-brand-400">751</span>
            <span className="rounded-full bg-status-success/15 px-3 py-1 font-mono text-lg font-bold text-status-success">+9</span>
          </div>
          <p className="mt-4 font-mono text-sm text-text-secondary" data-testid="rating-example">
            742 → 751 · +9 · Won vs stronger opponent; above-team-average performance
          </p>
          <dl className="mt-6 divide-y divide-border-default border-t border-border-default text-sm">
            {[
              ['Result vs expected', 'Win · expected 38%', '+6.1'],
              ['Opponent strength', 'Opp. avg 781 vs 742', '+1.4'],
              ['Individual performance', '14 pts · 1.3× team avg', '+2.0'],
              ['Tournament level', 'Regional · ×1.1', '−0.5'],
            ].map(([k, v, d]) => (
              <div key={k} className="flex items-center justify-between gap-3 py-2.5">
                <dt className="text-text-secondary">
                  {k}
                  <span className="ml-2 hidden text-xs text-text-muted sm:inline">{v}</span>
                </dt>
                <dd className={`font-mono font-semibold tabular-nums ${d.startsWith('−') ? 'text-status-danger' : 'text-status-success'}`}>{d}</dd>
              </div>
            ))}
          </dl>
        </Card>
      </div>
    </section>
  );
}

/* ----------------------------------------------------------------------------
 * 5. Live scoring preview (real Scoreboard + real engine)
 * -------------------------------------------------------------------------- */

const DEMO_TEAMS = { A: { name: 'Harbour Kings' }, B: { name: 'Northside Spike' } };

/** Scripted event log: a tight first set and the opening of set two. */
function buildDemoEvents() {
  const ev = [{ type: 'MATCH_START', payload: { servingTeam: 'A' } }];
  const rally = (team, actionType) => ev.push({ type: 'RALLY_WON', payload: { team, actionType } });
  const pattern = ['A', 'B', 'A', 'A', 'B', 'B', 'A', 'B', 'A', 'B', 'B', 'A', 'A', 'B', 'A', 'B', 'A', 'A', 'B', 'B', 'A', 'B', 'A', 'B', 'A', 'B', 'B', 'A', 'B', 'A', 'A', 'B', 'A', 'B', 'B', 'A', 'B', 'A', 'B', 'A'];
  const actions = ['kill', 'ace', null, 'block', 'kill', null, 'kill', 'attack_error', 'kill', 'kill'];
  pattern.forEach((t, i) => rally(t, actions[i % actions.length])); // 20–20
  ['A', 'B', 'B', 'A', 'A', 'B', 'A', 'A'].forEach((t, i) => rally(t, i % 2 ? 'kill' : 'block')); // 25–23 A
  ev.push({ type: 'SET_START', payload: {} });
  ['B', 'A', 'B', 'B', 'A', 'B', 'A', 'A', 'B', 'A', 'A'].forEach((t, i) => rally(t, i % 3 ? 'kill' : 'ace')); // set 2: 6–5
  return ev;
}

const DEMO_EVENTS = buildDemoEvents();
const DEMO_FORMAT = FORMAT_PRESETS.best_of_3;
/** Where the loop starts: deep into set one so the preview opens on a tense score. */
const DEMO_START = 38;
/** Frozen frame for reduced-motion users: set point at 24–23. */
const DEMO_FROZEN = 48;

function prefersReducedMotion() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

const ACTION_LABEL = { kill: 'Kill', ace: 'Ace', block: 'Block', attack_error: 'Attack error' };

export function LiveScoringPreview() {
  const reduced = useMemo(prefersReducedMotion, []);
  const [idx, setIdx] = useState(reduced ? DEMO_FROZEN : DEMO_START);
  const timer = useRef(null);

  useEffect(() => {
    if (reduced) return undefined;
    timer.current = setInterval(() => {
      setIdx((i) => (i >= DEMO_EVENTS.length ? DEMO_START : i + 1));
    }, 1500);
    return () => clearInterval(timer.current);
  }, [reduced]);

  const state = useMemo(() => deriveState(DEMO_FORMAT, DEMO_EVENTS.slice(0, idx), { lenient: true }), [idx]);
  const set = state.sets[state.currentSet - 1];
  const recent = (set?.rallies || []).slice(-3).reverse();

  return (
    <section id="live" className="border-y border-border-default bg-bg-surface py-16 md:py-24" aria-labelledby="live-heading">
      <div className="mx-auto max-w-6xl px-4">
        <div className="grid grid-cols-[minmax(0,1fr)] items-center gap-10 lg:grid-cols-[1fr_1.2fr]">
          <div>
            <SectionHeading align="left" eyebrow="Live scoring" tone="accent" title={<span id="live-heading">Big numbers. Zero ambiguity.</span>} copy="The scoreboard you see here is the real component the scorer uses, driven by the real match engine over a scripted rally log. Set point, match point, serving side and set history are all derived — never typed." />
            <ul className="mt-6 space-y-2 text-text-secondary">
              {['Two thumbs, one tap per rally', 'Undo is an event, so the log stays honest', 'Spectators follow along at /live/:id'].map((t) => (
                <li key={t} className="flex items-start gap-2">
                  <span className="mt-1 text-accent-400" aria-hidden="true">
                    ✓
                  </span>
                  {t}
                </li>
              ))}
            </ul>
          </div>

          <Card className="relative overflow-hidden p-5 md:p-7" data-testid="live-preview">
            <div className="mb-4 flex items-center justify-between">
              <span className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-status-danger">
                <span className={`h-2 w-2 rounded-full bg-status-danger ${reduced ? '' : 'motion-safe:animate-pulse'}`} aria-hidden="true" />
                Live · Court 2
              </span>
              <DemoTag />
            </div>
            <Scoreboard state={state} teams={DEMO_TEAMS} compact />
            <ol className="mt-5 space-y-1.5 border-t border-border-default pt-4 text-sm" aria-label="Recent rallies">
              {recent.map((r) => (
                <li key={r.seq} className="flex items-center justify-between gap-2 text-text-secondary">
                  <span className={r.team === 'A' ? 'text-team-a' : 'text-team-b'}>
                    {r.team === 'A' ? DEMO_TEAMS.A.name : DEMO_TEAMS.B.name}
                    <span className="ml-2 text-text-muted">{ACTION_LABEL[r.actionType] || 'Rally'}</span>
                  </span>
                  <span className="font-mono tabular-nums text-text-primary">
                    {r.scoreA}–{r.scoreB}
                  </span>
                </li>
              ))}
              {!recent.length ? <li className="text-text-muted">New set — first serve pending…</li> : null}
            </ol>
          </Card>
        </div>
      </div>
    </section>
  );
}

/* ----------------------------------------------------------------------------
 * 6. Tournament preview
 * -------------------------------------------------------------------------- */

const DEMO_STANDINGS = [
  { rank: 1, teamId: 1, team: { name: 'Harbour Kings' }, played: 3, wins: 3, losses: 0, setsWon: 6, setsLost: 1, setRatio: 6, pointRatio: 1.21 },
  { rank: 2, teamId: 2, team: { name: 'Northside Spike' }, played: 3, wins: 2, losses: 1, setsWon: 5, setsLost: 3, setRatio: 1.67, pointRatio: 1.08 },
  { rank: 3, teamId: 3, team: { name: 'Riverside VC' }, played: 3, wins: 1, losses: 2, setsWon: 3, setsLost: 4, setRatio: 0.75, pointRatio: 0.96 },
  { rank: 4, teamId: 4, team: { name: 'Summit Setters' }, played: 3, wins: 0, losses: 3, setsWon: 0, setsLost: 6, setRatio: 0, pointRatio: 0.79 },
];

const DEMO_BRACKET = [
  { round: 'Semi-finals', matches: [{ a: 'Harbour Kings', b: 'Summit Setters', sa: 2, sb: 0 }, { a: 'Northside Spike', b: 'Riverside VC', sa: 2, sb: 1 }] },
  { round: 'Final', matches: [{ a: 'Harbour Kings', b: 'Northside Spike', sa: null, sb: null, live: true }] },
];

function BracketMatch({ m }) {
  const decided = m.sa != null;
  const Row = ({ name, sets, won }) => (
    <div className={`flex items-center justify-between gap-2 px-3 py-1.5 ${won ? 'font-bold text-text-primary' : 'text-text-secondary'}`}>
      <span className="truncate">{name}</span>
      <span className="font-mono tabular-nums">{sets ?? '–'}</span>
    </div>
  );
  return (
    <div className={`w-full rounded-lg border bg-bg-card text-sm shadow-card ${m.live ? 'border-status-danger/60' : 'border-border-default'}`}>
      {m.live ? <div className="border-b border-border-default px-3 py-1 text-[10px] font-black uppercase tracking-wider text-status-danger">Live now</div> : null}
      <Row name={m.a} sets={m.sa} won={decided && m.sa > m.sb} />
      <div className="mx-3 h-px bg-border-default" />
      <Row name={m.b} sets={m.sb} won={decided && m.sb > m.sa} />
    </div>
  );
}

export function TournamentPreview() {
  return (
    <section id="tournaments" className="mx-auto max-w-6xl px-4 py-16 md:py-24" aria-labelledby="tournament-heading">
      <SectionHeading eyebrow="Tournaments" tone="accent" title={<span id="tournament-heading">Pools, brackets and standings that run themselves</span>} copy="Organizers publish a schedule; scorers submit results; standings, tie-breakers and the knockout tree update the moment a match closes." />
      <div className="mt-12 grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[1.3fr_1fr]">
        <Card className="p-4 md:p-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-display text-lg font-bold">Pool A · Spring Open</h3>
            <DemoTag />
          </div>
          <StandingsTable rows={DEMO_STANDINGS} champion={1} />
          <p className="mt-2 text-xs text-text-muted">Ranked by wins, then set ratio, then point ratio.</p>
        </Card>
        <Card className="p-4 md:p-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-display text-lg font-bold">Knockout</h3>
            <DemoTag />
          </div>
          <div className="grid grid-cols-2 gap-3">
            {DEMO_BRACKET.map((r) => (
              <div key={r.round} className="flex flex-col justify-around gap-3">
                <div className="text-[11px] font-black uppercase tracking-wider text-text-muted">{r.round}</div>
                {r.matches.map((m) => (
                  <BracketMatch key={m.a + m.b} m={m} />
                ))}
              </div>
            ))}
          </div>
        </Card>
      </div>
    </section>
  );
}

/* ----------------------------------------------------------------------------
 * 7. Player profile preview
 * -------------------------------------------------------------------------- */

const DEMO_SKILLS = [
  ['Serve', 78, 'gold'],
  ['Receive', 64, 'blue'],
  ['Set', 52, 'blue'],
  ['Attack', 86, 'gold'],
  ['Block', 71, 'violet'],
  ['Dig', 69, 'blue'],
];

const DEMO_BADGES = ['🔥 Hot streak', '🎯 Serve specialist', '💪 MVP · Spring Open', '🧱 Wall'];

export function ProfilePreview() {
  return (
    <section id="profile" className="border-y border-border-default bg-bg-surface py-16 md:py-24" aria-labelledby="profile-heading">
      <div className="mx-auto max-w-6xl px-4">
        <div className="grid grid-cols-[minmax(0,1fr)] items-center gap-10 lg:grid-cols-[1fr_1.1fr]">
          <Card className="relative overflow-hidden p-6 md:p-8">
            <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-brand-500/10 blur-2xl" aria-hidden="true" />
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-4">
                <Avatar name="Maya Okafor" size="lg" />
                <div>
                  <div className="font-display text-2xl font-bold text-text-primary">Maya Okafor</div>
                  <div className="text-sm text-text-secondary">Outside Hitter · #7 · Harbour Kings</div>
                  <div className="mt-1 flex gap-1" aria-label="Recent form: W W L W W">
                    {['W', 'W', 'L', 'W', 'W'].map((f, i) => (
                      <span key={i} className={`flex h-6 w-6 items-center justify-center rounded-md text-[11px] font-black ${f === 'W' ? 'bg-status-success/20 text-status-success' : 'bg-status-danger/20 text-status-danger'}`}>
                        {f}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              <DemoTag />
            </div>

            <div className="mt-6 grid grid-cols-3 gap-2">
              <div className="col-span-1 rounded-xl bg-gradient-to-br from-brand-500/20 to-brand-500/5 p-3">
                <div className="text-[11px] font-black uppercase tracking-wider text-brand-400">Rating</div>
                <div className="font-display text-3xl font-black tabular-nums text-brand-400">751</div>
                <div className="text-xs text-status-success">+9 last match</div>
              </div>
              {[
                ['Matches', '42'],
                ['Win rate', '67%'],
              ].map(([l, v]) => (
                <div key={l} className="rounded-xl bg-bg-elevated/60 p-3">
                  <div className="text-[11px] font-black uppercase tracking-wider text-text-muted">{l}</div>
                  <div className="font-display text-3xl font-black tabular-nums text-text-primary">{v}</div>
                </div>
              ))}
            </div>

            <div className="mt-6 space-y-3">
              {DEMO_SKILLS.map(([label, value, accent]) => (
                <ProgressBar key={label} label={label} value={value} accent={accent} />
              ))}
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              {DEMO_BADGES.map((b) => (
                <span key={b} className="rounded-full border border-brand-500/40 bg-brand-500/10 px-3 py-1 text-xs font-semibold text-brand-300">
                  {b}
                </span>
              ))}
            </div>
          </Card>

          <div>
            <SectionHeading align="left" eyebrow="Player profile" tone="gold" title={<span id="profile-heading">Your volleyball identity, backed by data</span>} copy="A public profile built from scored matches — not self-reported. Skill bars come straight from the boxscore, badges are earned in the engine, and the rating history is a ledger you can audit." />
            <ul className="mt-6 space-y-2 text-text-secondary">
              {['Skills from real actions: serve, receive, set, attack, block, dig', 'Rating trend with a reason for every move', 'Share /p/you with coaches and organizers'].map((t) => (
                <li key={t} className="flex items-start gap-2">
                  <span className="mt-1 text-brand-400" aria-hidden="true">
                    ✓
                  </span>
                  {t}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ----------------------------------------------------------------------------
 * 8. Leaderboard preview
 * -------------------------------------------------------------------------- */

const DEMO_LEADERS = [
  { rank: 1, name: 'Maya Okafor', team: 'Harbour Kings', position: 'Outside Hitter', rating: 751, matches: 42, delta: '+9' },
  { rank: 2, name: 'Diego Ferrer', team: 'Northside Spike', position: 'Opposite', rating: 738, matches: 39, delta: '+4' },
  { rank: 3, name: 'Priya Raman', team: 'Riverside VC', position: 'Setter', rating: 726, matches: 51, delta: '−3' },
  { rank: 4, name: 'Jonas Lindqvist', team: 'Harbour Kings', position: 'Middle Blocker', rating: 719, matches: 30, delta: '+11' },
  { rank: 5, name: 'Sofia Baptiste', team: 'Summit Setters', position: 'Libero', rating: 704, matches: 44, delta: '+2' },
];

export function LeaderboardPreview() {
  return (
    <section id="leaderboard" className="mx-auto max-w-6xl px-4 py-16 md:py-24" aria-labelledby="leaderboard-heading">
      <SectionHeading eyebrow="Leaderboards" title={<span id="leaderboard-heading">See who is actually playing well</span>} copy="Overall rating, top scorers, best servers, best blockers — filtered by tournament, team, position, community or season." />
      <Card className="mx-auto mt-10 max-w-3xl overflow-hidden">
        <div className="flex items-center justify-between border-b border-border-default bg-bg-surface px-4 py-3">
          <span className="text-xs font-black uppercase tracking-[0.2em] text-text-muted">Overall rating · All communities</span>
          <DemoTag />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-sm">
            <thead className="text-left text-[11px] uppercase tracking-wider text-text-muted">
              <tr>
                <th className="px-4 py-2">#</th>
                <th className="px-4 py-2">Player</th>
                <th className="px-4 py-2">Team</th>
                <th className="px-4 py-2 text-right">Rating</th>
                <th className="px-4 py-2 text-right">Matches</th>
              </tr>
            </thead>
            <tbody>
              {DEMO_LEADERS.map((p) => (
                <tr key={p.rank} className="border-t border-border-default">
                  <td className="px-4 py-3 font-bold tabular-nums text-text-secondary">{p.rank}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar name={p.name} size="sm" />
                      <div>
                        <div className="font-semibold text-text-primary">{p.name}</div>
                        <div className="text-xs text-text-muted">{p.position}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-text-secondary">{p.team}</td>
                  <td className="px-4 py-3 text-right">
                    <span className="font-display text-lg font-black tabular-nums text-brand-400">{p.rating}</span>
                    <span className={`ml-2 font-mono text-xs ${p.delta.startsWith('−') ? 'text-status-danger' : 'text-status-success'}`}>{p.delta}</span>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-text-secondary">{p.matches}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="border-t border-border-default px-4 py-3 text-center">
          <Link to="/leaderboard" className="inline-flex min-h-[44px] items-center font-semibold text-accent-400 hover:underline">
            Open the live leaderboard →
          </Link>
        </div>
      </Card>
    </section>
  );
}

/* ----------------------------------------------------------------------------
 * 9. Testimonials
 * -------------------------------------------------------------------------- */

const TESTIMONIALS = [
  {
    quote: 'I scored a full weekend of pool play on my phone with one hand. Undo saved me twice and nobody at the table noticed.',
    who: 'Lena',
    role: 'Scorer · regional league',
    icon: '📋',
  },
  {
    quote: 'The boxscore after each match is what I used to spend Sunday night building by hand. Now I coach from the data instead of the memory.',
    who: 'Coach Adebayo',
    role: 'Coach · Harbour Kings',
    icon: '🧠',
  },
  {
    quote: 'Sixteen teams, three courts, two divisions. Standings and the bracket updated themselves while I dealt with the parking situation.',
    who: 'Marcus',
    role: 'Organizer · Spring Open',
    icon: '🏆',
  },
];

export function Testimonials() {
  return (
    <section className="border-t border-border-default bg-bg-surface py-16 md:py-24" aria-labelledby="testimonials-heading">
      <div className="mx-auto max-w-6xl px-4">
        <SectionHeading eyebrow="From the table" title={<span id="testimonials-heading">Built with scorers, coaches and organizers</span>} />
        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {TESTIMONIALS.map((t) => (
            <figure key={t.who} className="flex flex-col rounded-xl border border-border-default bg-bg-card p-6 shadow-card">
              <div className="text-2xl" aria-hidden="true">
                {t.icon}
              </div>
              <blockquote className="mt-3 flex-1 text-text-secondary">“{t.quote}”</blockquote>
              <figcaption className="mt-4">
                <div className="font-semibold text-text-primary">{t.who}</div>
                <div className="text-xs uppercase tracking-wider text-text-muted">{t.role}</div>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ----------------------------------------------------------------------------
 * 10. Final CTA + footer
 * -------------------------------------------------------------------------- */

export function FinalCTA({ startHref }) {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-accent-600 via-accent-500 to-violet-600 py-16 md:py-24" aria-labelledby="final-heading">
      <div className="pointer-events-none absolute inset-0 opacity-20" aria-hidden="true" style={{ backgroundImage: 'radial-gradient(circle at 20% 20%, white 0, transparent 40%), radial-gradient(circle at 80% 80%, white 0, transparent 40%)' }} />
      <div className="relative mx-auto max-w-3xl px-4 text-center">
        <Eyebrow tone="accent">
          <span className="text-white/80">Free for every community</span>
        </Eyebrow>
        <h2 id="final-heading" className="mt-3 font-display text-3xl font-bold text-white md:text-5xl">
          Score the next match. Build your identity.
        </h2>
        <p className="mt-4 text-white/85 md:text-lg">One tap per rally is all it takes to turn a friendly into a rated match.</p>
        <div className="mt-8 flex justify-center">
          <CtaPair startHref={startHref} invert />
        </div>
      </div>
    </section>
  );
}

export function Footer() {
  const links = [
    ['Tournaments', '/tournaments'],
    ['Teams', '/teams'],
    ['Leaderboard', '/leaderboard'],
    ['Sign in', '/login'],
  ];
  return (
    <footer className="border-t border-border-default py-10">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 sm:flex-row">
        <div className="flex items-center gap-2">
          <span className="text-xl" aria-hidden="true">
            🏐
          </span>
          <span className="font-display font-bold text-brand-500">GlobalVBC</span>
          <span className="ml-2 text-xs text-text-muted">© {new Date().getFullYear()}</span>
        </div>
        <nav className="flex flex-wrap gap-5 text-sm text-text-secondary" aria-label="Footer">
          {links.map(([l, to]) => (
            <Link key={to} to={to} className="inline-flex min-h-[44px] items-center hover:text-text-primary">
              {l}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
