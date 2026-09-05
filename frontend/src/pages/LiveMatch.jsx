import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { deriveStats } from '@engine/stats.js';
import { useLiveMatch } from '../scoring/useLiveMatch.js';
import PageShell from '../components/ui/PageShell.jsx';
import Tabs, { TabPanel } from '../components/ui/Tabs.jsx';
import Alert from '../components/ui/Alert.jsx';
import Button from '../components/Button.jsx';
import Card from '../components/Card.jsx';
import Icon from '../components/ui/Icon.jsx';
import StatusBadge from '../components/ui/StatusBadge.jsx';
import { Eyebrow } from '../components/ui/Section.jsx';
import { Table, TableWrap, Th, Td } from '../components/ui/Table.jsx';
import { LoadingBlock, ErrorBlock } from '../components/ui/Loading.jsx';
import EmptyState from '../components/EmptyState.jsx';
import Scoreboard from '../components/scoring/Scoreboard.jsx';
import { ACTION_LABELS } from '../components/scoring/QuickActionBar.jsx';
import { playerLabel } from '../components/scoring/PlayerGrid.jsx';
import { formatTime } from '../lib/format.js';

const TEAM_TEXT = { A: 'text-team-a', B: 'text-team-b' };
const TEAM_BAR = { A: 'bg-team-a', B: 'bg-team-b' };

export function LiveStatusPill({ status }) {
  const map = { live: 'live', final: 'final' };
  return <StatusBadge status={map[status] || 'waiting'} data-testid="status-pill" />;
}

function SetStrip({ state, teams }) {
  if (!state?.sets?.length) return null;
  return (
    <TableWrap className="!border-0 !bg-transparent" label="Score by set">
      <Table caption="Score by set" className="text-center">
        <thead>
          <tr>
            <Th className="!bg-transparent">Team</Th>
            {state.sets.map((s) => (
              <Th key={s.number} className={`!bg-transparent !text-center ${s.number === state.currentSet && !s.winner ? '!text-text-primary' : ''}`}>
                Set {s.number}
              </Th>
            ))}
            <Th className="!bg-transparent !text-center">Sets</Th>
          </tr>
        </thead>
        <tbody>
          {['A', 'B'].map((side) => (
            <tr key={side}>
              <Td className="!text-left">
                <span className="inline-flex items-center gap-2 font-display text-base font-bold uppercase tracking-wide">
                  <span className={`h-5 w-1 rounded-full ${TEAM_BAR[side]}`} aria-hidden="true" />
                  {teams?.[side]?.name || `Team ${side}`}
                </span>
              </Td>
              {state.sets.map((s) => {
                const v = side === 'A' ? s.scoreA : s.scoreB;
                const won = s.winner === side;
                return (
                  <Td key={s.number} className={`!text-center font-display text-lg tabular-nums ${won ? 'font-bold text-text-primary' : s.winner ? 'text-text-muted' : 'font-semibold text-text-primary'}`}>
                    {v}
                  </Td>
                );
              })}
              <Td className="!text-center num-display text-2xl">{state.setsWon[side]}</Td>
            </tr>
          ))}
        </tbody>
      </Table>
    </TableWrap>
  );
}

function OnCourt({ side, teamName, state, getPlayer, timeouts, timeoutsPerSet }) {
  const rotation = state?.rotation?.[side] || [];
  const serving = state?.serving === side;
  return (
    <Card tone={side.toLowerCase()} className="p-3" data-testid={`on-court-${side}`}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className={`eyebrow ${side === 'A' ? '!text-team-a' : '!text-team-b'}`}>{teamName || `Team ${side}`}</h3>
        <div className="flex items-center gap-3 text-xs">
          {timeoutsPerSet ? (
            <span className="inline-flex items-center gap-1 text-text-muted" role="img" aria-label={`${timeouts} of ${timeoutsPerSet} timeouts used`}>
              <Icon name="timer" size={14} />
              {Array.from({ length: timeoutsPerSet }).map((_, i) => (
                <span key={i} className={`h-2 w-2 rounded-full ${i < timeouts ? 'bg-border-strong' : 'bg-status-success'}`} />
              ))}
            </span>
          ) : null}
          {serving ? (
            <span className={`inline-flex items-center gap-1 font-display font-bold uppercase tracking-wide ${TEAM_TEXT[side]}`} role="img" aria-label={`${teamName || `Team ${side}`} serving`}>
              <Icon name="ball" size={14} /> Serving
            </span>
          ) : null}
        </div>
      </div>
      {rotation.length ? (
        <ol className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
          {rotation.map((id, i) => {
            const p = getPlayer(id);
            return (
              <li key={`${id}-${i}`} className="flex min-h-11 items-center gap-2 rounded-md bg-bg-surface px-2 text-sm">
                <span className="w-5 shrink-0 font-display text-[10px] font-bold text-text-muted">P{i + 1}</span>
                <span className="font-display text-base font-bold tabular-nums text-text-secondary">{p?.jersey_number != null ? p.jersey_number : ''}</span>
                <span className="min-w-0 truncate font-semibold text-text-primary">{p?.name || `Player ${id}`}</span>
                {i === 0 && serving ? <Icon name="ball" size={12} className={`ml-auto ${TEAM_TEXT[side]}`} label="serving" /> : null}
              </li>
            );
          })}
        </ol>
      ) : (
        <p className="text-sm text-text-muted">Lineup not set yet.</p>
      )}
    </Card>
  );
}

function RecentRallies({ state, playerName, teams }) {
  const set = state?.sets?.[state.currentSet - 1];
  const rows = [...(set?.rallies || [])].reverse().slice(0, 12);
  if (!rows.length) return <p className="text-sm text-text-muted">No rallies yet in this set.</p>;
  return (
    <ol className="divide-y divide-border-default" aria-label="Recent rallies" data-testid="recent-rallies">
      {rows.map((r) => (
        <li key={r.seq} className="flex min-h-10 items-center gap-3 py-1.5 text-sm">
          <span className={`h-5 w-1 shrink-0 rounded-full ${TEAM_BAR[r.team]}`} aria-hidden="true" />
          <span className="w-12 shrink-0 font-display text-base font-bold tabular-nums text-text-primary">
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
          <span className="shrink-0 font-mono text-2xs text-text-muted">{formatTime(r.ts)}</span>
        </li>
      ))}
    </ol>
  );
}

const BOX_COLS = [
  ['points', 'Pts', 'Points'],
  ['kills', 'K', 'Kills'],
  ['aces', 'Ace', 'Aces'],
  ['blocks', 'Blk', 'Blocks'],
  ['digs', 'Dig', 'Digs'],
  ['assists', 'Ast', 'Assists'],
  ['errors', 'Err', 'Errors'],
];

function BoxScoreTable({ boxes, side, getPlayer }) {
  const rows = boxes.filter((b) => b.team === side).sort((a, b) => b.points - a.points || b.kills - a.kills);
  if (!rows.length) return <p className="text-sm text-text-muted">No players in the lineup yet.</p>;
  return (
    <TableWrap>
      <Table caption={`Live box score, team ${side}`} data-testid={`box-${side}`}>
        <thead>
          <tr>
            <Th sticky>Player</Th>
            {BOX_COLS.map(([k, l, title]) => (
              <Th key={k} num title={title}>
                {l}
              </Th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((b) => {
            const p = getPlayer(b.playerId);
            return (
              <tr key={b.playerId}>
                <Td sticky>
                  <span className="mr-1.5 font-display text-sm font-bold tabular-nums text-text-muted">{p?.jersey_number != null ? `#${p.jersey_number}` : ''}</span>
                  <span className="font-semibold text-text-primary">{p?.name || `Player ${b.playerId}`}</span>
                </Td>
                {BOX_COLS.map(([k]) => (
                  <Td key={k} num className={k === 'points' ? 'font-bold text-text-primary' : k === 'errors' ? 'text-status-danger' : 'text-text-secondary'}>
                    {b[k]}
                  </Td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </Table>
    </TableWrap>
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
        {notFound ? <EmptyState icon="search" headline="Match not found" copy="This match doesn't exist or hasn't been scheduled yet." ctaLabel="Browse tournaments" onCta={() => navigate('/tournaments')} /> : <ErrorBlock error={error} retry={refresh} />}
      </PageShell>
    );
  }

  const meta = [match?.tournament_name || 'Friendly match', match?.division_name, match?.court_name].filter(Boolean).join(' · ');
  const nameA = teams?.A?.name || 'Team A';
  const nameB = teams?.B?.name || 'Team B';
  const final = status === 'final';
  const winnerName = state?.winner ? (state.winner === 'A' ? nameA : nameB) : null;
  const started = state && state.status !== 'pending';
  const set = state?.sets?.[state.currentSet - 1];
  const tabsId = 'live-stats';

  return (
    <PageShell wide>
      <div className="space-y-4">
        <header className="flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-text-secondary">{meta}</p>
            <h1 className="font-display text-2xl font-bold uppercase md:text-3xl">
              <span className="text-team-a">{nameA}</span> <span className="text-base text-text-muted">vs</span> <span className="text-team-b">{nameB}</span>
            </h1>
          </div>
          <div className="flex items-center gap-2">
            {match?.tournament_id ? (
              <Button to={`/tournaments/${match.tournament_id}`} variant="ghost" size="sm">
                <Icon name="trophy" size={16} /> Tournament
              </Button>
            ) : null}
            <LiveStatusPill status={status} />
          </div>
        </header>

        {stale ? (
          <Alert tone="warning" title="Connection lost — showing last known score" data-testid="stale-banner">
            We keep retrying automatically.
          </Alert>
        ) : null}

        <Card className="p-4 md:p-6">
          {started ? (
            <Scoreboard state={state} teams={teams} />
          ) : (
            <div className="py-6 text-center">
              <div className="flex items-center justify-center gap-4 font-display text-3xl font-bold uppercase md:text-4xl">
                <span className="text-team-a">{nameA}</span>
                <span className="text-text-muted">–</span>
                <span className="text-team-b">{nameB}</span>
              </div>
              <p className="mt-3 text-sm text-text-secondary">The scorer hasn't started this match yet. This page updates automatically.</p>
            </div>
          )}
          {started && !final && state.format ? (
            <p className="mt-3 text-center text-xs text-text-muted">
              To {state.format.setPoints}
              {state.format.winByTwo ? ', win by 2' : ''}
              {state.format.pointCap ? `, cap ${state.format.pointCap}` : ''} · deciding set to {state.format.decidingSetPoints}
            </p>
          ) : null}
          {final ? (
            <div className="mt-4 flex flex-wrap items-center justify-center gap-3 border-t border-border-default pt-4">
              <span className="inline-flex items-center gap-2 font-display text-xl font-bold uppercase">
                <StatusBadge status="final" />
                {winnerName ? (
                  <>
                    <Icon name="trophy" size={18} className="text-brand-400" /> {winnerName} win
                  </>
                ) : null}
              </span>
              <Button to={`/matches/${match.id}`}>Full box score</Button>
            </div>
          ) : null}
        </Card>

        {started ? (
          <>
            <Card className="p-3 md:p-4" aria-labelledby="sets-heading">
              <Eyebrow as="h2" id="sets-heading" className="mb-2">
                Set by set
              </Eyebrow>
              <SetStrip state={state} teams={teams} />
            </Card>

            <section aria-labelledby="court-heading">
              <Eyebrow as="h2" id="court-heading" className="mb-2">
                On court
              </Eyebrow>
              <div className="grid gap-3 md:grid-cols-2">
                <OnCourt side="A" teamName={nameA} state={state} getPlayer={roster.get} timeouts={set?.timeouts?.A ?? 0} timeoutsPerSet={state.format?.timeoutsPerSet} />
                <OnCourt side="B" teamName={nameB} state={state} getPlayer={roster.get} timeouts={set?.timeouts?.B ?? 0} timeoutsPerSet={state.format?.timeoutsPerSet} />
              </div>
            </section>

            <div className="grid gap-4 lg:grid-cols-5">
              <Card className="p-3 md:p-4 lg:col-span-2" aria-labelledby="rallies-heading">
                <Eyebrow as="h2" id="rallies-heading" className="mb-2">
                  Recent rallies · Set {state.currentSet || '–'}
                </Eyebrow>
                <RecentRallies state={state} playerName={roster.name} teams={teams} />
              </Card>

              <Card className="p-3 md:p-4 lg:col-span-3" aria-labelledby="stats-heading">
                <h2 id="stats-heading" className="sr-only">
                  Player statistics
                </h2>
                <Tabs
                  id={tabsId}
                  label="Team statistics"
                  tabs={[
                    { key: 'A', label: `${nameA} stats` },
                    { key: 'B', label: `${nameB} stats` },
                  ]}
                  value={tab}
                  onChange={setTab}
                  className="mb-3"
                />
                <TabPanel id={tabsId} value={tab}>
                  <BoxScoreTable boxes={boxes} side={tab} getPlayer={roster.get} />
                </TabPanel>
              </Card>
            </div>
          </>
        ) : (
          <section aria-labelledby="lineups-heading">
            <Eyebrow as="h2" id="lineups-heading" className="mb-2">
              Rosters
            </Eyebrow>
            <div className="grid gap-3 md:grid-cols-2">
              {['A', 'B'].map((side) => {
                const players = lineups?.[side]?.players || [];
                return (
                  <Card key={side} tone={side.toLowerCase()} className="p-3">
                    <h3 className={`eyebrow mb-2 ${side === 'A' ? '!text-team-a' : '!text-team-b'}`}>{side === 'A' ? nameA : nameB}</h3>
                    {players.length ? (
                      <ul className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                        {players.map((p) => (
                          <li key={p.id} className="flex min-h-11 items-center gap-2 rounded-md bg-bg-surface px-2 text-sm">
                            <span className="font-display text-base font-bold tabular-nums text-text-secondary">{p.jersey_number != null ? p.jersey_number : ''}</span>
                            <span className="min-w-0 truncate font-semibold">{p.name}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-text-muted">Lineup not set yet.</p>
                    )}
                  </Card>
                );
              })}
            </div>
          </section>
        )}
        {match?.tournament_id ? (
          <p className="text-center text-sm text-text-muted">
            <Link to={`/tournaments/${match.tournament_id}`} className="link">
              View standings and bracket
            </Link>
          </p>
        ) : null}
      </div>
    </PageShell>
  );
}
