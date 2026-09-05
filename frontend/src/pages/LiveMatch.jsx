import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { deriveStats } from '@engine/stats.js';
import { useLiveMatch } from '../scoring/useLiveMatch.js';
import PageShell from '../components/ui/PageShell.jsx';
import Tabs from '../components/ui/Tabs.jsx';
import { LoadingBlock, ErrorBlock } from '../components/ui/Loading.jsx';
import EmptyState from '../components/EmptyState.jsx';
import Scoreboard from '../components/scoring/Scoreboard.jsx';
import { ACTION_LABELS } from '../components/scoring/QuickActionBar.jsx';
import { playerLabel } from '../components/scoring/PlayerGrid.jsx';
import { formatTime } from '../lib/format.js';

const TEAM_TEXT = { A: 'text-team-a', B: 'text-team-b' };
const TEAM_DOT = { A: 'bg-team-a', B: 'bg-team-b' };

export function LiveStatusPill({ status }) {
  if (status === 'live') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-status-danger px-2.5 py-1 text-[11px] font-black uppercase tracking-wider text-white" data-testid="status-pill">
        <span className="h-2 w-2 rounded-full bg-white motion-safe:animate-pulse" aria-hidden="true" />
        Live
      </span>
    );
  }
  if (status === 'final') {
    return (
      <span className="rounded-full bg-status-success/20 px-2.5 py-1 text-[11px] font-black uppercase tracking-wider text-status-success" data-testid="status-pill">
        Final
      </span>
    );
  }
  return (
    <span className="rounded-full bg-bg-elevated px-2.5 py-1 text-[11px] font-black uppercase tracking-wider text-text-secondary" data-testid="status-pill">
      Waiting for scorer
    </span>
  );
}

function SetStrip({ state }) {
  if (!state?.sets?.length) return null;
  return (
    <div className="overflow-x-auto" aria-label="Set by set">
      <table className="w-full min-w-[260px] text-center text-sm">
        <thead>
          <tr className="text-[11px] uppercase tracking-wider text-text-muted">
            <th scope="col" className="py-1 text-left font-semibold">Team</th>
            {state.sets.map((s) => (
              <th key={s.number} scope="col" className="py-1 font-semibold">
                Set {s.number}
              </th>
            ))}
            <th scope="col" className="py-1 font-semibold">Sets</th>
          </tr>
        </thead>
        <tbody>
          {['A', 'B'].map((side) => (
            <tr key={side} className="border-t border-border-default">
              <td className={`py-1.5 text-left font-bold ${TEAM_TEXT[side]}`}>{side}</td>
              {state.sets.map((s) => {
                const v = side === 'A' ? s.scoreA : s.scoreB;
                const won = s.winner === side;
                return (
                  <td key={s.number} className={`py-1.5 font-mono tabular-nums ${won ? 'font-bold text-text-primary' : s.winner ? 'text-text-muted' : 'text-text-primary'}`}>
                    {v}
                  </td>
                );
              })}
              <td className="py-1.5 font-display font-black tabular-nums">{state.setsWon[side]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function OnCourt({ side, teamName, state, getPlayer }) {
  const rotation = state?.rotation?.[side] || [];
  const serving = state?.serving === side;
  return (
    <div className="rounded-xl border border-border-default bg-bg-card p-3" data-testid={`on-court-${side}`}>
      <div className="mb-2 flex items-center justify-between">
        <h3 className={`text-[11px] font-black uppercase tracking-[0.2em] ${TEAM_TEXT[side]}`}>{teamName || `Team ${side}`}</h3>
        {serving ? (
          <span className={`text-xs font-bold ${TEAM_TEXT[side]}`} aria-label={`${teamName || `Team ${side}`} serving`}>
            🏐 Serving
          </span>
        ) : null}
      </div>
      {rotation.length ? (
        <ol className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
          {rotation.map((id, i) => {
            const p = getPlayer(id);
            return (
              <li key={`${id}-${i}`} className="flex min-h-[44px] items-center gap-2 rounded-lg bg-bg-surface px-2 text-sm">
                <span className="w-5 shrink-0 text-[10px] font-bold text-text-muted">P{i + 1}</span>
                <span className="font-mono text-xs text-text-secondary">{p?.jersey_number != null ? `#${p.jersey_number}` : ''}</span>
                <span className="min-w-0 truncate font-semibold text-text-primary">{p?.name || `Player ${id}`}</span>
                {i === 0 && serving ? <span className="ml-auto text-[10px] uppercase tracking-wider text-text-muted">serve</span> : null}
              </li>
            );
          })}
        </ol>
      ) : (
        <p className="text-sm text-text-muted">Lineup not set yet.</p>
      )}
    </div>
  );
}

function RecentRallies({ state, playerName, teams }) {
  const set = state?.sets?.[state.currentSet - 1];
  const rows = [...(set?.rallies || [])].reverse().slice(0, 12);
  if (!rows.length) return <p className="text-sm text-text-muted">No rallies yet in this set.</p>;
  return (
    <ol className="divide-y divide-border-default" aria-label="Recent rallies" data-testid="recent-rallies">
      {rows.map((r) => (
        <li key={r.seq} className="flex min-h-[40px] items-center gap-3 py-1.5 text-sm">
          <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${TEAM_DOT[r.team]}`} aria-hidden="true" />
          <span className="w-12 shrink-0 font-mono text-xs tabular-nums text-text-primary">
            {r.scoreA}–{r.scoreB}
          </span>
          <span className="min-w-0 flex-1 truncate">
            <span className={`font-semibold ${TEAM_TEXT[r.team]}`}>{teams?.[r.team]?.name || `Team ${r.team}`}</span>
            {r.actionType ? (
              <span className="text-text-secondary">
                {' '}
                · {ACTION_LABELS[r.actionType] || r.actionType}
                {r.playerId != null ? ` ${playerName(r.playerId)}` : ''}
              </span>
            ) : null}
          </span>
          <span className="shrink-0 font-mono text-[11px] text-text-muted">{formatTime(r.ts)}</span>
        </li>
      ))}
    </ol>
  );
}

const BOX_COLS = [
  ['points', 'Pts'],
  ['kills', 'K'],
  ['aces', 'Ace'],
  ['blocks', 'Blk'],
  ['digs', 'Dig'],
  ['assists', 'Ast'],
  ['errors', 'Err'],
];

function BoxScoreTable({ boxes, side, getPlayer }) {
  const rows = boxes.filter((b) => b.team === side).sort((a, b) => b.points - a.points || b.kills - a.kills);
  if (!rows.length) return <p className="text-sm text-text-muted">No players in the lineup yet.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[420px] text-sm" data-testid={`box-${side}`}>
        <thead>
          <tr className="text-left text-[11px] uppercase tracking-wider text-text-muted">
            <th scope="col" className="py-2 font-semibold">Player</th>
            {BOX_COLS.map(([k, l]) => (
              <th key={k} scope="col" className="py-2 text-right font-semibold">
                {l}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((b) => {
            const p = getPlayer(b.playerId);
            return (
              <tr key={b.playerId} className="border-t border-border-default">
                <td className="py-2">
                  <span className="mr-1.5 font-mono text-xs text-text-muted">{p?.jersey_number != null ? `#${p.jersey_number}` : ''}</span>
                  <span className="font-semibold text-text-primary">{p?.name || `Player ${b.playerId}`}</span>
                </td>
                {BOX_COLS.map(([k]) => (
                  <td key={k} className={`py-2 text-right font-mono tabular-nums ${k === 'points' ? 'font-bold text-text-primary' : k === 'errors' ? 'text-status-danger' : 'text-text-secondary'}`}>
                    {b[k]}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function LiveMatch() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { match, teams, lineups, state, status, stale, error, refresh } = useLiveMatch(id);
  const [tab, setTab] = useState('A');

  const roster = useMemo(() => {
    const all = [...(lineups?.A?.players || []), ...(lineups?.B?.players || [])];
    const byId = new Map(all.map((p) => [String(p.id), p]));
    return {
      get: (pid) => byId.get(String(pid)),
      name: (pid) => (byId.has(String(pid)) ? playerLabel(byId.get(String(pid))) : `#${pid}`),
    };
  }, [lineups]);

  const boxes = useMemo(() => (state ? deriveStats(state) : []), [state]);

  if (status === 'loading') {
    return (
      <PageShell>
        <LoadingBlock label="Loading live match…" />
      </PageShell>
    );
  }
  if (status === 'error') {
    const notFound = error?.response?.status === 404;
    return (
      <PageShell>
        {notFound ? (
          <EmptyState icon="🔍" headline="Match not found" copy="This match doesn't exist or hasn't been scheduled yet." ctaLabel="Browse tournaments" onCta={() => navigate('/tournaments')} />
        ) : (
          <ErrorBlock error={error} retry={refresh} />
        )}
      </PageShell>
    );
  }

  const meta = [match?.tournament_name || 'Friendly match', match?.division_name, match?.court_name].filter(Boolean).join(' · ');
  const nameA = teams?.A?.name || 'Team A';
  const nameB = teams?.B?.name || 'Team B';
  const final = status === 'final';
  const winnerName = state?.winner ? (state.winner === 'A' ? nameA : nameB) : null;

  return (
    <PageShell wide>
      <div className="space-y-4">
        {/* ---------- header ---------- */}
        <header className="flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-text-secondary">{meta}</p>
            <h1 className="font-display text-xl font-bold md:text-2xl">
              <span className="text-team-a">{nameA}</span> <span className="text-text-muted">vs</span> <span className="text-team-b">{nameB}</span>
            </h1>
          </div>
          <LiveStatusPill status={status} />
        </header>

        {stale ? (
          <div role="alert" className="rounded-xl border border-status-warning/50 bg-status-warning/10 px-4 py-2.5 text-sm font-semibold text-status-warning" data-testid="stale-banner">
            Connection lost — showing last known score
          </div>
        ) : null}

        {/* ---------- scoreboard ---------- */}
        <section className="rounded-2xl border border-border-default bg-bg-card p-4 md:p-6">
          {state && state.status !== 'pending' ? (
            <Scoreboard state={state} teams={teams} />
          ) : (
            <div className="py-6 text-center">
              <div className="flex items-center justify-center gap-4 font-display text-2xl font-bold md:text-3xl">
                <span className="text-team-a">{nameA}</span>
                <span className="text-text-muted">–</span>
                <span className="text-team-b">{nameB}</span>
              </div>
              <p className="mt-3 text-sm text-text-secondary">The scorer hasn't started this match yet. This page updates automatically.</p>
            </div>
          )}
          {final ? (
            <div className="mt-4 flex flex-wrap items-center justify-center gap-3 border-t border-border-default pt-4 text-sm">
              <span className="font-display text-lg font-bold">Final{winnerName ? ` · ${winnerName} win` : ''}</span>
              <Link to={`/matches/${match.id}`} className="inline-flex min-h-[44px] items-center rounded-lg bg-accent-500 px-4 font-semibold text-white hover:bg-accent-400">
                Full box score
              </Link>
              {match.tournament_id ? (
                <Link to={`/tournaments/${match.tournament_id}`} className="inline-flex min-h-[44px] items-center rounded-lg border border-border-strong px-4 font-semibold hover:bg-bg-elevated">
                  Tournament
                </Link>
              ) : null}
            </div>
          ) : null}
        </section>

        {state && state.status !== 'pending' ? (
          <>
            <section className="rounded-2xl border border-border-default bg-bg-card p-3 md:p-4" aria-labelledby="sets-heading">
              <h2 id="sets-heading" className="mb-2 text-[11px] font-black uppercase tracking-[0.2em] text-text-muted">
                Set by set
              </h2>
              <SetStrip state={state} />
            </section>

            <section aria-labelledby="court-heading">
              <h2 id="court-heading" className="mb-2 text-[11px] font-black uppercase tracking-[0.2em] text-text-muted">
                On court
              </h2>
              <div className="grid gap-3 md:grid-cols-2">
                <OnCourt side="A" teamName={nameA} state={state} getPlayer={roster.get} />
                <OnCourt side="B" teamName={nameB} state={state} getPlayer={roster.get} />
              </div>
            </section>

            <div className="grid gap-4 lg:grid-cols-5">
              <section className="rounded-2xl border border-border-default bg-bg-card p-3 md:p-4 lg:col-span-2" aria-labelledby="rallies-heading">
                <h2 id="rallies-heading" className="mb-2 text-[11px] font-black uppercase tracking-[0.2em] text-text-muted">
                  Recent rallies · Set {state.currentSet || '–'}
                </h2>
                <RecentRallies state={state} playerName={roster.name} teams={teams} />
              </section>

              <section className="rounded-2xl border border-border-default bg-bg-card p-3 md:p-4 lg:col-span-3" aria-labelledby="stats-heading">
                <h2 id="stats-heading" className="sr-only">
                  Player statistics
                </h2>
                <Tabs
                  tabs={[
                    { key: 'A', label: `${nameA} stats` },
                    { key: 'B', label: `${nameB} stats` },
                  ]}
                  value={tab}
                  onChange={setTab}
                  className="mb-2"
                />
                <BoxScoreTable boxes={boxes} side={tab} getPlayer={roster.get} />
              </section>
            </div>
          </>
        ) : (
          <section aria-labelledby="lineups-heading">
            <h2 id="lineups-heading" className="mb-2 text-[11px] font-black uppercase tracking-[0.2em] text-text-muted">
              Rosters
            </h2>
            <div className="grid gap-3 md:grid-cols-2">
              {['A', 'B'].map((side) => {
                const players = lineups?.[side]?.players || [];
                return (
                  <div key={side} className="rounded-xl border border-border-default bg-bg-card p-3">
                    <h3 className={`mb-2 text-[11px] font-black uppercase tracking-[0.2em] ${TEAM_TEXT[side]}`}>{side === 'A' ? nameA : nameB}</h3>
                    {players.length ? (
                      <ul className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                        {players.map((p) => (
                          <li key={p.id} className="flex min-h-[44px] items-center gap-2 rounded-lg bg-bg-surface px-2 text-sm">
                            <span className="font-mono text-xs text-text-secondary">{p.jersey_number != null ? `#${p.jersey_number}` : ''}</span>
                            <span className="min-w-0 truncate font-semibold">{p.name}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-text-muted">Lineup not set yet.</p>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </PageShell>
  );
}
