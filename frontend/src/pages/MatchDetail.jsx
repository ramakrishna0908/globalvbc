import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import PageShell from '../components/ui/PageShell.jsx';
import { LoadingBlock, ErrorBlock } from '../components/ui/Loading.jsx';
import EmptyState from '../components/EmptyState.jsx';
import Card from '../components/Card.jsx';
import { MatchStatusPill } from '../components/tournament/MatchCard.jsx';
import { ACTION_LABELS } from '../components/scoring/QuickActionBar.jsx';
import { playerLabel } from '../components/scoring/PlayerGrid.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useScoredMatch, useBoxscore } from '../hooks/queries.js';
import { formatDateTime, signed, positionLabel } from '../lib/format.js';

const TEAM_TEXT = { A: 'text-team-a', B: 'text-team-b' };
const TEAM_DOT = { A: 'bg-team-a', B: 'bg-team-b' };

/** Mirrors backend canScore(): assigned scorer, creator (when unassigned), organizer or admin. */
export function canScoreMatch(match, user) {
  if (!user || !match) return false;
  if (user.role === 'admin') return true;
  const uid = Number(user.id);
  if (match.scorer_id && Number(match.scorer_id) === uid) return true;
  if (!match.scorer_id && match.created_by && Number(match.created_by) === uid) return true;
  if (match.organizer_id && Number(match.organizer_id) === uid) return true;
  return false;
}

const BOX_COLS = [
  { key: 'points', label: 'Pts', strong: true },
  { key: 'kills', label: 'K' },
  { key: 'attacks', label: 'Att' },
  { key: 'kill_pct', label: 'K%', derive: (b) => (b.attacks ? `${Math.round((b.kills / b.attacks) * 100)}%` : '–') },
  { key: 'aces', label: 'Ace' },
  { key: 'serve_errors', label: 'SE' },
  { key: 'blocks', label: 'Blk' },
  { key: 'block_assists', label: 'BA' },
  { key: 'digs', label: 'Dig' },
  { key: 'assists', label: 'Ast' },
  { key: 'errors', label: 'Err', danger: true },
];

function DeltaCell({ value }) {
  const n = Number(value) || 0;
  const cls = n > 0 ? 'text-status-success' : n < 0 ? 'text-status-danger' : 'text-text-muted';
  return <td className={`py-2 text-right font-mono font-bold tabular-nums ${cls}`}>{signed(n)}</td>;
}

function BoxScoreTable({ rows, side, teamName }) {
  const list = rows.filter((r) => r.side === side).sort((a, b) => b.points - a.points || b.kills - a.kills);
  return (
    <Card className="p-3 md:p-4">
      <h3 className={`mb-2 text-[11px] font-black uppercase tracking-[0.2em] ${TEAM_TEXT[side]}`}>{teamName || `Team ${side}`}</h3>
      {list.length ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm" data-testid={`boxscore-${side}`}>
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wider text-text-muted">
                <th scope="col" className="py-2 font-semibold">Player</th>
                {BOX_COLS.map((c) => (
                  <th key={c.key} scope="col" className="py-2 text-right font-semibold">
                    {c.label}
                  </th>
                ))}
                <th scope="col" className="py-2 text-right font-semibold">Rating Δ</th>
              </tr>
            </thead>
            <tbody>
              {list.map((r) => (
                <tr key={r.user_id} className="border-t border-border-default">
                  <td className="py-2">
                    <Link to={`/p/${r.user_id}`} className="inline-flex min-h-[32px] items-center gap-1.5 font-semibold text-text-primary hover:text-accent-400">
                      <span className="font-mono text-xs text-text-muted">{r.jersey_number != null ? `#${r.jersey_number}` : ''}</span>
                      {r.name}
                    </Link>
                  </td>
                  {BOX_COLS.map((c) => (
                    <td key={c.key} className={`py-2 text-right font-mono tabular-nums ${c.strong ? 'font-bold text-text-primary' : c.danger ? 'text-status-danger' : 'text-text-secondary'}`}>
                      {c.derive ? c.derive(r) : r[c.key] ?? 0}
                    </td>
                  ))}
                  <DeltaCell value={r.rating_delta} />
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-sm text-text-muted">No player statistics recorded.</p>
      )}
    </Card>
  );
}

function RallyTimeline({ state, teams, playerName }) {
  if (!state?.sets?.length) return <p className="text-sm text-text-muted">No rallies were recorded.</p>;
  return (
    <div className="space-y-2" data-testid="rally-timeline">
      {state.sets.map((s, i) => (
        <details key={s.number} open={i === state.sets.length - 1} className="group rounded-xl border border-border-default bg-bg-card">
          <summary className="flex min-h-[44px] cursor-pointer list-none items-center justify-between gap-3 px-4 py-2 font-semibold [&::-webkit-details-marker]:hidden">
            <span>
              Set {s.number}
              <span className="ml-2 font-mono tabular-nums text-text-secondary">
                {s.scoreA}–{s.scoreB}
              </span>
              {s.winner ? <span className={`ml-2 text-xs ${TEAM_TEXT[s.winner]}`}>{teams?.[s.winner]?.name || `Team ${s.winner}`} won</span> : null}
            </span>
            <span className="text-xs text-text-muted">
              {s.rallies.length} rallies <span aria-hidden="true" className="inline-block transition-transform group-open:rotate-180">▾</span>
            </span>
          </summary>
          <ol className="divide-y divide-border-default border-t border-border-default px-4">
            {s.rallies.map((r) => (
              <li key={r.seq} className="flex min-h-[36px] items-center gap-3 py-1 text-sm">
                <span className={`h-2 w-2 shrink-0 rounded-full ${TEAM_DOT[r.team]}`} aria-hidden="true" />
                <span className="w-12 shrink-0 font-mono text-xs tabular-nums">
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
              </li>
            ))}
            {!s.rallies.length ? <li className="py-2 text-sm text-text-muted">No rallies in this set.</li> : null}
          </ol>
        </details>
      ))}
    </div>
  );
}

function LineupList({ side, teamName, lineup }) {
  const players = lineup?.players || [];
  return (
    <Card className="p-3 md:p-4">
      <h3 className={`mb-2 text-[11px] font-black uppercase tracking-[0.2em] ${TEAM_TEXT[side]}`}>{teamName || `Team ${side}`}</h3>
      {players.length ? (
        <ul className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
          {players.map((p) => (
            <li key={p.id} className="flex min-h-[44px] items-center gap-2 rounded-lg bg-bg-surface px-2 text-sm">
              <span className="w-8 font-mono text-xs text-text-secondary">{p.jersey_number != null ? `#${p.jersey_number}` : ''}</span>
              <Link to={`/p/${p.id}`} className="min-w-0 flex-1 truncate font-semibold text-text-primary hover:text-accent-400">
                {p.name}
              </Link>
              <span className="text-xs text-text-muted">{p.rotation_slot ? `P${p.rotation_slot}` : 'Bench'}</span>
              {p.position ? <span className="hidden text-xs text-text-muted sm:inline">{positionLabel(p.position)}</span> : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-text-muted">Lineup not submitted yet.</p>
      )}
    </Card>
  );
}

export default function MatchDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const matchQ = useScoredMatch(id);
  const match = matchQ.data;
  const submitted = match?.status === 'submitted';
  const boxQ = useBoxscore(submitted ? id : null);

  const roster = useMemo(() => {
    const all = [...(match?.lineups?.A?.players || []), ...(match?.lineups?.B?.players || [])];
    const byId = new Map(all.map((p) => [String(p.id), p]));
    return (pid) => (byId.has(String(pid)) ? playerLabel(byId.get(String(pid))) : `#${pid}`);
  }, [match]);

  if (matchQ.isLoading) {
    return (
      <PageShell>
        <LoadingBlock label="Loading match…" />
      </PageShell>
    );
  }
  if (matchQ.isError || !match) {
    const notFound = matchQ.error?.response?.status === 404 || (!matchQ.isError && !match);
    return (
      <PageShell>
        {notFound ? <EmptyState icon="🔍" headline="Match not found" copy="This match doesn't exist or was removed." /> : <ErrorBlock error={matchQ.error} retry={() => matchQ.refetch()} />}
      </PageShell>
    );
  }

  const teams = match.teams || {};
  const nameA = teams.A?.name || match.team_a_name || 'Team A';
  const nameB = teams.B?.name || match.team_b_name || 'Team B';
  const state = match.state;
  const live = match.status === 'live';
  const scheduled = match.status === 'scheduled';
  const finished = submitted || match.status === 'completed';
  const playedSets = (state?.sets || []).filter((s) => s.winner || live);
  const setsLine = playedSets.map((s) => `${s.scoreA}–${s.scoreB}`).join(', ');
  const setsA = finished ? match.sets_a ?? state?.setsWon?.A ?? 0 : state?.setsWon?.A ?? 0;
  const setsB = finished ? match.sets_b ?? state?.setsWon?.B ?? 0 : state?.setsWon?.B ?? 0;
  const winnerSide = state?.winner || (match.winner_team_id ? (match.winner_team_id === match.team_a_id ? 'A' : match.winner_team_id === match.team_b_id ? 'B' : null) : null);
  const winnerName = winnerSide === 'A' ? nameA : winnerSide === 'B' ? nameB : null;
  const meta = [match.division_name, match.court_name, match.pool_name ? `Pool ${match.pool_name}` : null].filter(Boolean).join(' · ');
  const when = match.completed_at || match.started_at || match.scheduled_at;

  return (
    <PageShell wide>
      <div className="space-y-4">
        <header className="space-y-2">
          <div className="flex flex-wrap items-center gap-2 text-sm text-text-secondary">
            <MatchStatusPill status={match.status} />
            {match.tournament_id ? (
              <Link to={`/tournaments/${match.tournament_id}`} className="font-semibold text-accent-400 hover:underline">
                {match.tournament_name || 'Tournament'}
              </Link>
            ) : (
              <span>Friendly match</span>
            )}
            {meta ? <span>· {meta}</span> : null}
            {when ? <span>· {formatDateTime(when)}</span> : null}
          </div>
          <h1 className="font-display text-2xl font-bold md:text-3xl">
            <span className={winnerSide === 'B' ? 'text-text-secondary' : 'text-team-a'}>{nameA}</span> <span className="text-text-muted">vs</span>{' '}
            <span className={winnerSide === 'A' ? 'text-text-secondary' : 'text-team-b'}>{nameB}</span>
          </h1>
        </header>

        {/* ---------- result ---------- */}
        <Card className="p-4 md:p-6">
          <div className="flex flex-col items-center gap-3 text-center sm:flex-row sm:justify-between sm:text-left">
            <div>
              {finished || live ? (
                <>
                  <div className="font-display text-4xl font-black tabular-nums">
                    <span className="text-team-a">{setsA}</span>
                    <span className="mx-2 text-text-muted">–</span>
                    <span className="text-team-b">{setsB}</span>
                    <span className="ml-2 text-base font-semibold text-text-muted">sets</span>
                  </div>
                  {setsLine ? (
                    <div className="mt-1 font-mono text-sm tabular-nums text-text-secondary" data-testid="sets-line">
                      {setsLine}
                    </div>
                  ) : null}
                  {winnerName ? (
                    <div className="mt-1 text-sm font-semibold">
                      Winner: <span className={TEAM_TEXT[winnerSide]}>{winnerName}</span>
                      {state?.endReason && state.endReason !== 'played' ? <span className="text-text-muted"> ({state.endReason})</span> : null}
                    </div>
                  ) : live ? (
                    <div className="mt-1 text-sm text-text-secondary">
                      Set {state?.currentSet} in progress · {state?.sets?.[state.currentSet - 1]?.scoreA ?? 0}–{state?.sets?.[state.currentSet - 1]?.scoreB ?? 0}
                    </div>
                  ) : null}
                  {match.status === 'completed' ? <p className="mt-1 text-xs text-status-warning">Awaiting the scorer's submission — stats and ratings update once submitted.</p> : null}
                </>
              ) : (
                <>
                  <div className="font-display text-xl font-bold">{scheduled ? 'Scheduled' : 'Cancelled'}</div>
                  <div className="mt-1 text-sm text-text-secondary">
                    {match.scheduled_at ? formatDateTime(match.scheduled_at) : 'Time to be announced'}
                    {match.court_name ? ` · ${match.court_name}` : ''}
                  </div>
                  {match.scorer_name ? <div className="mt-1 text-xs text-text-muted">Scorer: {match.scorer_name}</div> : null}
                </>
              )}
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {live ? (
                <Link to={`/live/${match.id}`} className="inline-flex min-h-[48px] items-center gap-2 rounded-lg bg-status-danger px-5 font-bold text-white hover:opacity-90" data-testid="watch-live">
                  <span className="h-2 w-2 rounded-full bg-white motion-safe:animate-pulse" aria-hidden="true" />
                  Watch live
                </Link>
              ) : null}
              {(scheduled || live || match.status === 'completed') && canScoreMatch(match, user) ? (
                <Link to={`/score/${match.id}`} className="inline-flex min-h-[48px] items-center rounded-lg bg-accent-500 px-5 font-bold text-white hover:bg-accent-400" data-testid="score-match">
                  {live || match.status === 'completed' ? 'Open scoring' : 'Score this match'}
                </Link>
              ) : null}
            </div>
          </div>
        </Card>

        {/* ---------- submitted: box score + timeline ---------- */}
        {submitted ? (
          <>
            <section aria-labelledby="box-heading" className="space-y-3">
              <h2 id="box-heading" className="font-display text-xl font-bold">
                Box score
              </h2>
              {boxQ.isLoading ? (
                <LoadingBlock label="Loading box score…" />
              ) : boxQ.isError ? (
                <ErrorBlock error={boxQ.error} retry={() => boxQ.refetch()} />
              ) : (
                <div className="grid gap-3">
                  <BoxScoreTable rows={boxQ.data || []} side="A" teamName={nameA} />
                  <BoxScoreTable rows={boxQ.data || []} side="B" teamName={nameB} />
                </div>
              )}
            </section>
            <section aria-labelledby="timeline-heading" className="space-y-3">
              <h2 id="timeline-heading" className="font-display text-xl font-bold">
                Rally timeline
              </h2>
              <RallyTimeline state={state} teams={teams} playerName={roster} />
            </section>
          </>
        ) : null}

        {/* ---------- live / awaiting submit: derived timeline ---------- */}
        {!submitted && (live || match.status === 'completed') ? (
          <section aria-labelledby="timeline-heading" className="space-y-3">
            <h2 id="timeline-heading" className="font-display text-xl font-bold">
              Rally timeline
            </h2>
            <RallyTimeline state={state} teams={teams} playerName={roster} />
          </section>
        ) : null}

        {/* ---------- scheduled: lineups ---------- */}
        {scheduled || match.status === 'cancelled' ? (
          <section aria-labelledby="lineups-heading" className="space-y-3">
            <h2 id="lineups-heading" className="font-display text-xl font-bold">
              Lineups
            </h2>
            <div className="grid gap-3 md:grid-cols-2">
              <LineupList side="A" teamName={nameA} lineup={match.lineups?.A} />
              <LineupList side="B" teamName={nameB} lineup={match.lineups?.B} />
            </div>
          </section>
        ) : null}
      </div>
    </PageShell>
  );
}
