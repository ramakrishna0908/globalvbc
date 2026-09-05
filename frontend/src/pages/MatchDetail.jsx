import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import PageShell from '../components/ui/PageShell.jsx';
import { LoadingBlock, ErrorBlock } from '../components/ui/Loading.jsx';
import EmptyState from '../components/EmptyState.jsx';
import Card from '../components/Card.jsx';
import Button from '../components/Button.jsx';
import Alert from '../components/ui/Alert.jsx';
import Icon from '../components/ui/Icon.jsx';
import StatusBadge from '../components/ui/StatusBadge.jsx';
import { SectionHeader } from '../components/ui/Section.jsx';
import { Table, TableWrap, Th, Td } from '../components/ui/Table.jsx';
import { MatchStatusPill } from '../components/tournament/MatchCard.jsx';
import { ACTION_LABELS } from '../components/scoring/QuickActionBar.jsx';
import { playerLabel } from '../components/scoring/PlayerGrid.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useScoredMatch, useBoxscore } from '../hooks/queries.js';
import { formatDateTime, signed, positionLabel } from '../lib/format.js';

const TEAM_TEXT = { A: 'text-team-a', B: 'text-team-b' };
const TEAM_BAR = { A: 'bg-team-a', B: 'bg-team-b' };

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
  { key: 'points', label: 'Pts', title: 'Points', strong: true },
  { key: 'kills', label: 'K', title: 'Kills' },
  { key: 'attacks', label: 'Att', title: 'Attack attempts' },
  { key: 'kill_pct', label: 'K%', title: 'Kill percentage', derive: (b) => (b.attacks ? `${Math.round((b.kills / b.attacks) * 100)}%` : '–') },
  { key: 'aces', label: 'Ace', title: 'Aces' },
  { key: 'serve_errors', label: 'SE', title: 'Serve errors' },
  { key: 'blocks', label: 'Blk', title: 'Blocks' },
  { key: 'block_assists', label: 'BA', title: 'Block assists' },
  { key: 'digs', label: 'Dig', title: 'Digs' },
  { key: 'assists', label: 'Ast', title: 'Assists' },
  { key: 'errors', label: 'Err', title: 'Errors', danger: true },
];

function BoxScoreTable({ rows, side, teamName }) {
  const list = rows.filter((r) => r.side === side).sort((a, b) => b.points - a.points || b.kills - a.kills);
  return (
    <Card tone={side.toLowerCase()} className="min-w-0 overflow-hidden">
      <h3 className={`eyebrow px-3 pb-1 pt-3 md:px-4 ${side === 'A' ? '!text-team-a' : '!text-team-b'}`}>{teamName || `Team ${side}`}</h3>
      {list.length ? (
        <div className="overflow-x-auto" tabIndex={0} role="region" aria-label={`Box score — ${teamName || `Team ${side}`}`}>
          <Table caption={`Box score — ${teamName || `Team ${side}`}`} minWidth={760} data-testid={`boxscore-${side}`}>
            <thead>
              <tr>
                <Th sticky>Player</Th>
                {BOX_COLS.map((c) => (
                  <Th key={c.key} num title={c.title}>
                    {c.label}
                  </Th>
                ))}
                <Th num>Rating Δ</Th>
              </tr>
            </thead>
            <tbody>
              {list.map((r) => {
                const d = Number(r.rating_delta) || 0;
                return (
                  <tr key={r.user_id}>
                    <Td sticky>
                      <Link to={`/p/${r.user_id}`} className="inline-flex min-h-8 items-center gap-1.5 font-semibold text-text-primary hover:text-accent-400">
                        <span className="font-display text-sm font-bold tabular-nums text-text-muted">{r.jersey_number != null ? `#${r.jersey_number}` : ''}</span>
                        {r.name}
                      </Link>
                    </Td>
                    {BOX_COLS.map((c) => (
                      <Td key={c.key} num className={c.strong ? 'font-bold text-text-primary' : c.danger ? 'text-status-danger' : 'text-text-secondary'}>
                        {c.derive ? c.derive(r) : r[c.key] ?? 0}
                      </Td>
                    ))}
                    <Td num className={`font-bold ${d > 0 ? 'text-status-success' : d < 0 ? 'text-status-danger' : 'text-text-muted'}`}>
                      {signed(d)}
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        </div>
      ) : (
        <p className="px-4 pb-4 text-sm text-text-muted">No player statistics recorded.</p>
      )}
    </Card>
  );
}

function RallyTimeline({ state, teams, playerName }) {
  if (!state?.sets?.length) return <p className="text-sm text-text-muted">No rallies were recorded.</p>;
  return (
    <div className="space-y-2" data-testid="rally-timeline">
      {state.sets.map((s, i) => (
        <details key={s.number} open={i === state.sets.length - 1} className="group rounded-lg border border-border-default bg-bg-card">
          <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 py-2 font-semibold [&::-webkit-details-marker]:hidden">
            <span className="flex items-center gap-3">
              <span className="font-display text-base font-bold uppercase tracking-wide">Set {s.number}</span>
              <span className="num-display text-xl text-text-primary">
                {s.scoreA}–{s.scoreB}
              </span>
              {s.winner ? <span className={`text-xs font-semibold ${TEAM_TEXT[s.winner]}`}>{teams?.[s.winner]?.name || `Team ${s.winner}`} won</span> : null}
            </span>
            <span className="flex items-center gap-2 text-xs text-text-muted">
              {s.rallies.length} rallies <Icon name="chevronDown" size={16} className="transition-transform group-open:rotate-180" />
            </span>
          </summary>
          <ol className="divide-y divide-border-default border-t border-border-default px-4">
            {s.rallies.map((r) => (
              <li key={r.seq} className="flex min-h-9 items-center gap-3 py-1 text-sm">
                <span className={`h-4 w-1 shrink-0 rounded-full ${TEAM_BAR[r.team]}`} aria-hidden="true" />
                <span className="w-12 shrink-0 font-display text-sm font-bold tabular-nums">
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
    <Card tone={side.toLowerCase()} className="p-3 md:p-4">
      <h3 className={`eyebrow mb-2 ${side === 'A' ? '!text-team-a' : '!text-team-b'}`}>{teamName || `Team ${side}`}</h3>
      {players.length ? (
        <ul className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
          {players.map((p) => (
            <li key={p.id} className="flex min-h-11 items-center gap-2 rounded-md bg-bg-surface px-2 text-sm">
              <span className="w-8 font-display text-base font-bold tabular-nums text-text-secondary">{p.jersey_number != null ? p.jersey_number : ''}</span>
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

function ResultTeam({ side, name, sets, winner, loser }) {
  return (
    <div className={`flex min-w-0 flex-1 items-center gap-3 ${side === 'B' ? 'flex-row-reverse text-right' : ''}`}>
      <span className={`h-12 w-1.5 shrink-0 rounded-full ${TEAM_BAR[side]}`} aria-hidden="true" />
      <div className="min-w-0">
        <div className={`truncate font-display text-xl font-bold uppercase tracking-wide md:text-2xl ${loser ? 'text-text-muted' : 'text-text-primary'}`}>{name}</div>
        {winner ? (
          <div className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-status-success">
            <Icon name="check" size={12} /> Winner
          </div>
        ) : null}
      </div>
      <span className={`ml-auto num-display text-5xl md:text-6xl ${loser ? 'text-text-muted' : 'text-text-primary'} ${side === 'B' ? 'mr-auto ml-0' : ''}`}>{sets}</span>
    </div>
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
        {notFound ? <EmptyState icon="search" headline="Match not found" copy="This match doesn't exist or was removed." ctaLabel="Browse tournaments" ctaTo="/tournaments" /> : <ErrorBlock error={matchQ.error} retry={() => matchQ.refetch()} />}
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
  const meta = [match.division_name, match.pool_name ? `Pool ${match.pool_name}` : null].filter(Boolean).join(' · ');
  const when = match.completed_at || match.started_at || match.scheduled_at;
  const canScore = (scheduled || live || match.status === 'completed') && canScoreMatch(match, user);

  return (
    <PageShell wide back={match.tournament_id ? { to: `/tournaments/${match.tournament_id}`, label: match.tournament_name || 'Tournament' } : { to: '/tournaments', label: 'Tournaments' }}>
      <div className="space-y-5">
        <header className="space-y-2">
          <div className="flex flex-wrap items-center gap-2 text-sm text-text-secondary">
            <MatchStatusPill status={match.status} size="md" />
            {match.tournament_id ? (
              <Link to={`/tournaments/${match.tournament_id}`} className="link">
                {match.tournament_name || 'Tournament'}
              </Link>
            ) : (
              <span>Friendly match</span>
            )}
            {meta ? <span>· {meta}</span> : null}
            {match.court_name ? (
              <span className="inline-flex items-center gap-1">
                · <Icon name="court" size={14} /> {match.court_name}
              </span>
            ) : null}
            {when ? (
              <span className="inline-flex items-center gap-1">
                · <Icon name="clock" size={14} /> {formatDateTime(when)}
              </span>
            ) : null}
            {match.scorer_name ? (
              <span className="inline-flex items-center gap-1 text-text-muted">
                · <Icon name="whistle" size={14} /> Scorer {match.scorer_name}
              </span>
            ) : null}
          </div>
          <h1 className="font-display text-display-sm font-bold uppercase md:text-display-md">
            <span className={winnerSide === 'B' ? 'text-text-muted' : 'text-team-a'}>{nameA}</span> <span className="text-lg text-text-muted">vs</span> <span className={winnerSide === 'A' ? 'text-text-muted' : 'text-team-b'}>{nameB}</span>
          </h1>
        </header>

        {/* ---------- result ---------- */}
        <Card className="p-4 md:p-6">
          {finished || live ? (
            <>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-6">
                <ResultTeam side="A" name={nameA} sets={setsA} winner={winnerSide === 'A'} loser={winnerSide === 'B'} />
                <span className="hidden text-center font-display text-sm font-bold uppercase tracking-widest text-text-muted sm:block">Sets</span>
                <ResultTeam side="B" name={nameB} sets={setsB} winner={winnerSide === 'B'} loser={winnerSide === 'A'} />
              </div>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border-default pt-4">
                <div className="text-sm">
                  {setsLine ? (
                    <span className="font-display text-base font-semibold tabular-nums text-text-secondary" data-testid="sets-line">
                      {setsLine}
                    </span>
                  ) : null}
                  {winnerName ? (
                    <span className="ml-3 inline-flex items-center gap-1.5 font-semibold">
                      <Icon name="trophy" size={16} className="text-brand-400" />
                      Winner: <span className={TEAM_TEXT[winnerSide]}>{winnerName}</span>
                      {state?.endReason && state.endReason !== 'played' ? <StatusBadge status={state.endReason} size="sm" /> : null}
                    </span>
                  ) : live ? (
                    <span className="ml-3 text-text-secondary">
                      Set {state?.currentSet} in progress · {state?.sets?.[state.currentSet - 1]?.scoreA ?? 0}–{state?.sets?.[state.currentSet - 1]?.scoreB ?? 0}
                    </span>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  {live ? (
                    <Button to={`/live/${match.id}`} variant="live" data-testid="watch-live">
                      <span className="h-2 w-2 rounded-full bg-white motion-safe:animate-pulse" aria-hidden="true" />
                      Watch live
                    </Button>
                  ) : null}
                  {canScore ? (
                    <Button to={`/score/${match.id}`} data-testid="score-match">
                      {live || match.status === 'completed' ? 'Open scoring' : 'Score this match'}
                    </Button>
                  ) : null}
                </div>
              </div>
              {match.status === 'completed' ? (
                <Alert tone="warning" className="mt-4">
                  Awaiting the scorer's submission — stats and ratings update once submitted.
                </Alert>
              ) : null}
            </>
          ) : (
            <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="font-display text-2xl font-bold uppercase">{scheduled ? 'Scheduled' : 'Cancelled'}</div>
                <div className="mt-1 text-sm text-text-secondary">
                  {match.scheduled_at ? formatDateTime(match.scheduled_at) : 'Time to be announced'}
                  {match.court_name ? ` · ${match.court_name}` : ''}
                </div>
                {match.scorer_name ? <div className="mt-1 text-xs text-text-muted">Scorer: {match.scorer_name}</div> : null}
              </div>
              {canScore ? (
                <Button to={`/score/${match.id}`} data-testid="score-match">
                  <Icon name="play" size={16} /> Score this match
                </Button>
              ) : null}
            </div>
          )}
        </Card>

        {/* ---------- submitted: box score + timeline ---------- */}
        {submitted ? (
          <>
            <section aria-labelledby="box-heading">
              <SectionHeader id="box-heading" title="Box score" />
              {boxQ.isLoading ? (
                <LoadingBlock label="Loading box score…" variant="table" />
              ) : boxQ.isError ? (
                <ErrorBlock error={boxQ.error} retry={() => boxQ.refetch()} />
              ) : (
                <div className="grid gap-3">
                  <BoxScoreTable rows={boxQ.data || []} side="A" teamName={nameA} />
                  <BoxScoreTable rows={boxQ.data || []} side="B" teamName={nameB} />
                </div>
              )}
            </section>
            <section aria-labelledby="timeline-heading">
              <SectionHeader id="timeline-heading" title="Rally timeline" />
              <RallyTimeline state={state} teams={teams} playerName={roster} />
            </section>
          </>
        ) : null}

        {/* ---------- live / awaiting submit: derived timeline ---------- */}
        {!submitted && (live || match.status === 'completed') ? (
          <section aria-labelledby="timeline-heading">
            <SectionHeader id="timeline-heading" title="Rally timeline" />
            <RallyTimeline state={state} teams={teams} playerName={roster} />
          </section>
        ) : null}

        {/* ---------- scheduled: lineups ---------- */}
        {scheduled || match.status === 'cancelled' ? (
          <section aria-labelledby="lineups-heading">
            <SectionHeader id="lineups-heading" title="Lineups" />
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
