import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import Card from '../Card.jsx';
import Avatar from '../Avatar.jsx';
import { DemoTag } from './sections.jsx';

// Marketing showcase: a player identity card stacked with a rating ledger
// entry. Static aspirational data — clearly labelled as a demo.
const TREND = [702, 708, 705, 717, 724, 721, 733, 742, 742, 751];

export default function HeroVisual() {
  return (
    <div className="relative w-full max-w-md" aria-label="Product preview: player card with rating history">
      <div className="pointer-events-none absolute -inset-6 rounded-[2rem] bg-gradient-to-br from-accent-500/25 via-transparent to-brand-500/25 blur-2xl" aria-hidden="true" />

      <Card className="relative overflow-hidden p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <Avatar name="Maya Okafor" size="lg" />
            <div>
              <div className="font-display text-xl font-bold text-text-primary">Maya Okafor</div>
              <div className="text-sm text-text-muted">Outside Hitter · Harbour Kings</div>
              <div className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-bg-elevated px-2.5 py-0.5 text-xs font-semibold text-text-primary">
                <span className="text-text-muted">#</span>1 <span className="text-status-success" aria-label="moved up">▲ 2</span>
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-400">Rating</div>
            <div className="font-display text-4xl font-black tabular-nums leading-none text-brand-400">751</div>
          </div>
        </div>

        <div className="mt-5 h-20" aria-hidden="true">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={TREND.map((v) => ({ v }))} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="hero-trend" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="rgb(212 162 62)" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="rgb(212 162 62)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area type="monotone" dataKey="v" stroke="rgb(212 162 62)" strokeWidth={2.5} fill="url(#hero-trend)" dot={false} isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-4 grid grid-cols-4 gap-2 text-center">
          {[
            ['14', 'Pts'],
            ['11', 'Kills'],
            ['3', 'Aces'],
            ['2', 'Blocks'],
          ].map(([v, l]) => (
            <div key={l} className="rounded-lg bg-bg-surface py-2">
              <div className="font-display text-lg font-bold tabular-nums text-text-primary">{v}</div>
              <div className="text-[11px] uppercase tracking-wider text-text-muted">{l}</div>
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-center justify-between text-xs text-text-muted">
          <span>Last match · vs Northside Spike · W 2–1</span>
          <DemoTag />
        </div>
      </Card>

      <div className="relative -mt-4 ml-6 mr-[-0.5rem] rounded-xl border border-status-success/40 bg-bg-card p-3 shadow-elevated sm:ml-10 sm:mr-[-1.5rem]">
        <div className="flex items-center gap-3">
          <span className="rounded-lg bg-status-success/15 px-2.5 py-1 font-mono text-lg font-bold text-status-success">+9</span>
          <div className="min-w-0 text-sm">
            <div className="font-semibold text-text-primary">742 → 751 · Rating event v2</div>
            <div className="truncate text-xs text-text-muted">Won vs stronger opponent; above-team-average performance</div>
          </div>
        </div>
      </div>
    </div>
  );
}
