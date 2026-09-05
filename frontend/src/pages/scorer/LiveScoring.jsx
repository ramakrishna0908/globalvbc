import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { deriveStats, leaders } from '@engine/stats.js';
import { useMatchSession } from '../../scoring/useMatchSession.js';
import { matchesApi } from '../../api/endpoints.js';
import { useToast } from '../../components/ui/ToastProvider.jsx';
import Scoreboard from '../../components/scoring/Scoreboard.jsx';
import PointButton from '../../components/scoring/PointButton.jsx';
import QuickActionBar, { ACTION_LABELS, ActionButton } from '../../components/scoring/QuickActionBar.jsx';
import PlayerGrid, { playerLabel } from '../../components/scoring/PlayerGrid.jsx';
import RallyTimeline from '../../components/scoring/RallyTimeline.jsx';
import ConnectionStatus from '../../components/scoring/ConnectionStatus.jsx';
import UndoControl from '../../components/scoring/UndoControl.jsx';
import ThemeToggle from '../../components/ThemeToggle.jsx';
import Button from '../../components/Button.jsx';
import Card from '../../components/Card.jsx';
import Alert from '../../components/ui/Alert.jsx';
import Icon from '../../components/ui/Icon.jsx';
import StatusBadge from '../../components/ui/StatusBadge.jsx';
import { Eyebrow } from '../../components/ui/Section.jsx';
import { Table, TableWrap, Th, Td } from '../../components/ui/Table.jsx';
import { LoadingBlock, ErrorBlock } from '../../components/ui/Loading.jsx';
import { useInvalidate } from '../../hooks/queries.js';

const CONTEXT_ACTIONS = [
  { key: 'kill', label: 'Kill', abbr: 'K' },
  { key: 'block', label: 'Block', abbr: 'B' },
  { key: 'ace', label: 'Ace', abbr: 'A' },
];
const MODE_KEY = 'gvbc-scoring-mode';
const TEAM_TEXT = { A: 'text-team-a', B: 'text-team-b' };

function usePlayers(match) {
  return useMemo(() => {
    const A = match?.lineups?.A?.players || [];
    const B = match?.lineups?.B?.players || [];
    const byId = new Map([...A, ...B].map((p) => [String(p.id), p]));
    return { A, B, name: (id) => playerLabel(byId.get(String(id))) || `#${id}`, get: (id) => byId.get(String(id)) };
  }, [match]);
}

export default function LiveScoring() {
  const { id } = useParams();
  const session = useMatchSession(id);
  const { match, state, events, connection, pending, loading, error, lastError, clearLastError, dispatch, undoLast, undoSeq, canUndo, syncNow, refresh } = session;
  const { toast } = useToast();
  const players = usePlayers(match);
  const invalidate = useInvalidate();

  const [picker, setPicker] = useState(null); // { action, team?, source: 'bar'|'context' }
  const [selectedPlayer, setSelectedPlayer] = useState(null); // player-first mode
  const [context, setContext] = useState(null); // { team } after a rally without attribution
  const [showMore, setShowMore] = useState(false);
  const [showAllHistory, setShowAllHistory] = useState(false);
  const [sub, setSub] = useState(null); // { team, out? }
  const [mode, setMode] = useState(() => {
    try {
      return localStorage.getItem(MODE_KEY) || 'action-first';
    } catch {
      return 'action-first';
    }
  });
  const toggleMode = () => {
    const next = mode === 'action-first' ? 'player-first' : 'action-first';
    setMode(next);
    setPicker(null);
    setSelectedPlayer(null);
    try {
      localStorage.setItem(MODE_KEY, next);
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    if (lastError) {
      toast(lastError, { tone: 'error', duration: 3500 });
      clearLastError();
    }
  }, [lastError, toast, clearLastError]);

  const live = state?.status === 'live';

  // ---- rally
  const point = useCallback(
    (team) => {
      const res = dispatch('RALLY_WON', { team });
      if (res.ok) {
        setContext({ team });
        setPicker(null);
      }
    },
    [dispatch]
  );

  // ---- player actions
  const recordAction = useCallback(
    (player, team, actionType) => {
      const res = dispatch('PLAYER_ACTION', { team, playerId: player.id, actionType });
      if (res.ok) {
        toast(`✓ ${playerLabel(player)} — ${ACTION_LABELS[actionType] || actionType} recorded`, { icon: null });
        setPicker(null);
        setSelectedPlayer(null);
        setContext(null);
      }
    },
    [dispatch, toast]
  );

  const onPickAction = (actionKey) => {
    if (mode === 'player-first' && selectedPlayer) {
      recordAction(selectedPlayer.player, selectedPlayer.team, actionKey);
      return;
    }
    setPicker((p) => (p?.action === actionKey && p.source === 'bar' ? null : { action: actionKey, source: 'bar' }));
  };

  const onPickPlayer = (player, team) => {
    if (picker) {
      if (picker.team && picker.team !== team) return;
      recordAction(player, team, picker.action);
      return;
    }
    if (mode === 'player-first') setSelectedPlayer((s) => (s?.player.id === player.id ? null : { player, team }));
  };

  // ---- keyboard shortcuts (desktop scorers)
  useEffect(() => {
    const onKey = (e) => {
      if (e.target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;
      if (!live) return;
      if (e.key === 'a' || e.key === 'A') point('A');
      else if (e.key === 'b' || e.key === 'B') point('B');
      else if (e.key === 'z' || e.key === 'Z') undoLast();
      else if (e.key === 'Escape') {
        setPicker(null);
        setSelectedPlayer(null);
        setContext(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [live, point, undoLast]);

  if (loading && !state) return <LoadingBlock label="Loading match…" />;
  if (error && !state)
    return (
      <div className="p-6">
        <ErrorBlock error={{ message: error }} retry={refresh} />
      </div>
    );
  if (!state || !match) return <LoadingBlock label="Preparing scoreboard…" />;

  const teams = match.teams || {};
  const set = state.sets[state.currentSet - 1];
  const rotationA = state.rotation.A;
  const rotationB = state.rotation.B;
  const pickerTeams = picker?.team ? [picker.team] : ['A', 'B'];
  const showGrids = Boolean(picker) || mode === 'player-first';
  const phase = state.status === 'complete' ? 'final' : state.status === 'set_complete' ? 'neutral' : live ? 'live' : 'waiting';
  const phaseLabel = state.status === 'complete' ? 'Match complete' : state.status === 'set_complete' ? 'Set complete' : live ? undefined : 'Not started';

  return (
    <div className="scoring-surface min-h-screen bg-bg-page text-text-primary">
      {/* ---------- top bar ---------- */}
      <header className="sticky top-0 z-30 border-b border-border-default bg-bg-page/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-2 px-3">
          <div className="flex min-w-0 items-center gap-2">
            <Link to="/score" className="flex min-h-11 min-w-11 items-center justify-center rounded-md text-text-secondary hover:bg-bg-elevated hover:text-text-primary" aria-label="Back to scorer dashboard">
              <Icon name="arrowLeft" size={20} />
            </Link>
            <div className="min-w-0">
              <div className="truncate font-display text-base font-bold uppercase tracking-wide">
                {match.tournament_name || 'Friendly match'}
                {match.court_name ? <span className="text-text-muted"> · {match.court_name}</span> : null}
              </div>
              <div className="flex items-center gap-2 text-xs text-text-muted">
                {match.division_name ? <span className="truncate">{match.division_name}</span> : null}
                <StatusBadge status={phase} label={phaseLabel} size="sm" pulse={false} />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ConnectionStatus connection={connection} pending={pending} />
            <UndoControl onUndo={undoLast} disabled={!canUndo} />
            <ThemeToggle className="hidden sm:inline-flex" />
          </div>
        </div>
      </header>

      <main id="main" className="mx-auto max-w-7xl space-y-4 px-3 py-4">
        <Card className="p-3 md:p-5">
          <Scoreboard state={state} teams={teams} />
          {live ? (
            <div className="mt-3 flex flex-wrap items-center justify-center gap-x-5 gap-y-1.5 border-t border-border-default pt-3 text-xs text-text-secondary" role="group" aria-label="Rally status">
              <span className="inline-flex items-center gap-1.5">
                <Icon name="ball" size={14} className={TEAM_TEXT[state.serving]} />
                Serving <b className={TEAM_TEXT[state.serving]}>{state.serving === 'A' ? teams.A?.name || 'Team A' : teams.B?.name || 'Team B'}</b>
                {state.rotation[state.serving]?.[0] != null ? <span className="text-text-muted">· {players.name(state.rotation[state.serving][0])}</span> : null}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Icon name="timer" size={14} className="text-text-muted" />
                Timeouts <span className={TEAM_TEXT.A}>A</span> <Dots used={set?.timeouts.A} total={state.format.timeoutsPerSet} /> <span className={TEAM_TEXT.B}>B</span> <Dots used={set?.timeouts.B} total={state.format.timeoutsPerSet} />
              </span>
              <span className="text-text-muted">
                To {state.format.setPoints}
                {state.format.winByTwo ? ', win by 2' : ''}
                {state.format.pointCap ? `, cap ${state.format.pointCap}` : ''}
              </span>
              <span className="hidden text-text-muted md:inline">
                Keys: <kbd className="rounded bg-bg-elevated px-1 font-mono">A</kbd> / <kbd className="rounded bg-bg-elevated px-1 font-mono">B</kbd> point · <kbd className="rounded bg-bg-elevated px-1 font-mono">Z</kbd> undo
              </span>
            </div>
          ) : null}
        </Card>

        {/* ---------- pre-match ---------- */}
        {state.status === 'pending' ? <StartPanel match={match} dispatch={dispatch} players={players} /> : null}

        {/* ---------- point buttons ---------- */}
        {live ? (
          <div className="grid grid-cols-2 gap-3 md:gap-6">
            <PointButton side="A" label={teams.A?.name} onPoint={point} />
            <PointButton side="B" label={teams.B?.name} onPoint={point} />
          </div>
        ) : null}

        {/* ---------- context strip: who made the play? ---------- */}
        {live && context && !picker ? (
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border-default bg-bg-surface p-2" data-testid="context-strip">
            <span className="eyebrow px-1">
              Who made the play for <span className={TEAM_TEXT[context.team]}>{context.team === 'A' ? teams.A?.name || 'A' : teams.B?.name || 'B'}</span>?
            </span>
            {CONTEXT_ACTIONS.map((a) => (
              <ActionButton key={a.key} action={a} onSelect={(k) => setPicker({ action: k, team: context.team, source: 'context' })} />
            ))}
            <Button variant="ghost" size="sm" onClick={() => setContext(null)}>
              Skip
            </Button>
          </div>
        ) : null}

        {/* ---------- set complete ---------- */}
        {state.status === 'set_complete' ? <SetCompletePanel state={state} teams={teams} players={players} dispatch={dispatch} undoLast={undoLast} /> : null}

        {/* ---------- match complete / submit ---------- */}
        {state.status === 'complete' ? (
          <MatchCompletePanel match={match} state={state} teams={teams} players={players} syncNow={syncNow} pending={pending} connection={connection} refresh={refresh} invalidate={invalidate} undoLast={undoLast} canUndo={canUndo} />
        ) : null}

        {/* ---------- quick stats + player grids ---------- */}
        {live ? (
          <Card className="p-3 md:p-4">
            <QuickActionBar selected={picker?.action || null} onSelect={onPickAction} showMore={showMore} onToggleMore={() => setShowMore((v) => !v)} />
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-text-muted">
              {picker ? (
                <span className="inline-flex items-center gap-1.5 font-semibold text-text-primary" data-testid="picker-prompt">
                  {ACTION_LABELS[picker.action] || picker.action} <Icon name="arrowRight" size={14} /> tap the player
                </span>
              ) : mode === 'player-first' ? (
                <span>{selectedPlayer ? `${playerLabel(selectedPlayer.player)} selected → tap an action` : 'Tap a player, then an action'}</span>
              ) : (
                <span>Tap an action, then the player</span>
              )}
              <div className="flex items-center gap-2">
                {picker ? (
                  <Button variant="ghost" size="sm" onClick={() => setPicker(null)}>
                    Cancel
                  </Button>
                ) : null}
                <button type="button" onClick={toggleMode} className="inline-flex min-h-11 items-center gap-1 rounded-md px-2 font-bold uppercase tracking-wide text-accent-400 hover:bg-bg-elevated" aria-label="Toggle entry mode">
                  <Icon name="swap" size={14} /> {mode === 'action-first' ? 'Action → Player' : 'Player → Action'}
                </button>
              </div>
            </div>
            {showGrids ? (
              <div className="mt-3 grid gap-4 md:grid-cols-2">
                {pickerTeams.includes('A') ? <PlayerGrid side="A" teamName={teams.A?.name} players={players.A} rotation={rotationA} onPick={onPickPlayer} highlightIds={selectedPlayer?.team === 'A' ? [selectedPlayer.player.id] : []} /> : null}
                {pickerTeams.includes('B') ? <PlayerGrid side="B" teamName={teams.B?.name} players={players.B} rotation={rotationB} onPick={onPickPlayer} highlightIds={selectedPlayer?.team === 'B' ? [selectedPlayer.player.id] : []} /> : null}
              </div>
            ) : null}
          </Card>
        ) : null}

        {/* ---------- secondary controls ---------- */}
        {live ? (
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
            {['A', 'B'].map((t) => (
              <Button key={`to-${t}`} variant="secondary" onClick={() => dispatch('TIMEOUT', { team: t }).ok && toast(`Timeout ${teams[t]?.name || t}`)} disabled={(set?.timeouts[t] ?? 0) >= state.format.timeoutsPerSet}>
                <Icon name="timer" size={16} className={TEAM_TEXT[t]} /> Timeout {t}
              </Button>
            ))}
            {['A', 'B'].map((t) => (
              <Button key={`sub-${t}`} variant="secondary" onClick={() => setSub({ team: t })}>
                <Icon name="swap" size={16} className={TEAM_TEXT[t]} /> Sub {t}
              </Button>
            ))}
          </div>
        ) : null}

        {sub ? <SubstitutionPanel sub={sub} setSub={setSub} state={state} players={players} teams={teams} dispatch={dispatch} toast={toast} /> : null}

        {/* ---------- timeline ---------- */}
        <Card className="p-3 md:p-4">
          <div className="mb-2 flex items-center justify-between">
            <Eyebrow as="h2">Rally timeline · Set {state.currentSet || '–'}</Eyebrow>
            <button type="button" onClick={() => setShowAllHistory((v) => !v)} className="min-h-11 px-2 text-xs font-bold uppercase tracking-wide text-accent-400 hover:underline">
              {showAllHistory ? 'Show recent' : 'Show all'}
            </button>
          </div>
          <RallyTimeline events={events} state={state} playerName={players.name} onUndo={(seq) => undoSeq(seq)} limit={showAllHistory ? 500 : 8} canUndo={state.status !== 'complete' || true} />
        </Card>
      </main>
    </div>
  );
}

function Dots({ used = 0, total = 2 }) {
  return (
    <span className="inline-flex items-center gap-0.5" role="img" aria-label={`${used} of ${total} used`}>
      {Array.from({ length: total }).map((_, i) => (
        <span key={i} className={`inline-block h-2 w-2 rounded-full ${i < used ? 'bg-border-strong' : 'bg-status-success'}`} />
      ))}
    </span>
  );
}

function StartPanel({ match, dispatch, players }) {
  const [serving, setServing] = useState('A');
  const ready = players.A.length > 0 && players.B.length > 0;
  return (
    <Card className="p-5 text-center" data-testid="start-panel">
      <Eyebrow>Pre-match</Eyebrow>
      <h2 className="mt-1 font-display text-3xl font-bold uppercase">Ready to start</h2>
      {!ready ? (
        <p className="mt-2 text-sm text-text-secondary">
          Lineups are missing.{' '}
          <Link to={`/score/${match.id}/setup`} className="link">
            Set lineups
          </Link>{' '}
          first.
        </p>
      ) : (
        <>
          <p className="mt-2 text-sm text-text-secondary">Who serves first?</p>
          <div className="mx-auto mt-3 grid max-w-md grid-cols-2 gap-3" role="group" aria-label="First serve">
            {['A', 'B'].map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setServing(t)}
                aria-pressed={serving === t}
                className={`inline-flex min-h-14 items-center justify-center gap-2 rounded-lg border-2 font-display text-lg font-bold uppercase tracking-wide ${serving === t ? (t === 'A' ? 'border-team-a bg-team-a/15' : 'border-team-b bg-team-b/15') : 'border-border-default'}`}
              >
                {serving === t ? <Icon name="ball" size={18} className={TEAM_TEXT[t]} /> : null}
                {match.teams?.[t]?.name || `Team ${t}`}
              </button>
            ))}
          </div>
          <Button
            size="xl"
            className="mt-4 w-full max-w-md"
            data-testid="start-match"
            onClick={() => dispatch('MATCH_START', { servingTeam: serving, lineups: { A: { starters: match.lineups.A.starters, bench: match.lineups.A.bench }, B: { starters: match.lineups.B.starters, bench: match.lineups.B.bench } } })}
          >
            <Icon name="play" size={20} /> Start match
          </Button>
          <p className="mt-2 text-xs text-text-muted">
            Wrong lineup?{' '}
            <Link to={`/score/${match.id}/setup`} className="link">
              Edit
            </Link>
          </p>
        </>
      )}
    </Card>
  );
}

function LeaderRow({ label, entry, players }) {
  if (!entry) return null;
  return (
    <div className="flex items-center justify-between rounded-md bg-bg-surface px-3 py-2 text-sm">
      <span className="text-text-muted">{label}</span>
      <span className="font-semibold">
        <span className={entry.team === 'A' ? 'text-team-a' : 'text-team-b'}>{players.name(entry.playerId)}</span> · <span className="font-display text-base font-bold">{entry.value}</span>
      </span>
    </div>
  );
}

function SetCompletePanel({ state, teams, players, dispatch, undoLast }) {
  const done = state.sets[state.currentSet - 1];
  const boxes = deriveStats(state, { setNumber: done.number });
  const top = leaders(boxes);
  const next = done.number + 1;
  return (
    <Card tone="accent" className="border-2 p-5" data-testid="set-complete" aria-live="polite">
      <div className="text-center">
        <Eyebrow tone="accent">Set {done.number} complete</Eyebrow>
        <div className="mt-1 font-display text-3xl font-bold uppercase md:text-4xl">
          <span className="text-team-a">
            {teams.A?.name || 'A'} {done.scoreA}
          </span>
          <span className="text-text-muted"> – </span>
          <span className="text-team-b">
            {done.scoreB} {teams.B?.name || 'B'}
          </span>
        </div>
        <div className="mt-1 text-sm text-text-secondary">
          Sets {state.setsWon.A}–{state.setsWon.B}
        </div>
      </div>
      <div className="mx-auto mt-4 grid max-w-2xl gap-2 sm:grid-cols-2">
        <LeaderRow label="Top scorer" entry={top.topScorer} players={players} />
        <LeaderRow label="Top attacker" entry={top.topAttacker} players={players} />
        <LeaderRow label="Most digs" entry={top.mostDigs} players={players} />
        <LeaderRow label="Most assists" entry={top.mostAssists} players={players} />
        <LeaderRow label="Aces" entry={top.mostAces} players={players} />
        <LeaderRow label="Blocks" entry={top.mostBlocks} players={players} />
        {!Object.values(top).some(Boolean) ? <p className="col-span-full text-center text-sm text-text-muted">No player actions recorded this set.</p> : null}
      </div>
      <div className="mx-auto mt-5 flex max-w-md flex-col gap-2">
        <Button size="xl" data-testid="start-next-set" onClick={() => dispatch('SET_START', {})}>
          <Icon name="play" size={20} /> Start set {next}
        </Button>
        <Button variant="ghost" size="sm" onClick={undoLast}>
          <Icon name="undo" size={14} /> Undo last rally
        </Button>
      </div>
    </Card>
  );
}

function MatchCompletePanel({ match, state, teams, players, syncNow, pending, connection, refresh, invalidate, undoLast, canUndo }) {
  const boxes = useMemo(() => deriveStats(state), [state]);
  const [busy, setBusy] = useState(false);
  const [warnings, setWarnings] = useState(null);
  const [errors, setErrors] = useState(null);
  const [result, setResult] = useState(null);
  const submitted = match.status === 'submitted' || Boolean(result);
  const winnerName = state.winner === 'A' ? teams.A?.name || 'Team A' : teams.B?.name || 'Team B';

  const submit = async (confirmWarnings = false) => {
    setBusy(true);
    setErrors(null);
    try {
      if (pending > 0) {
        await syncNow();
        if (pending > 0 && connection === 'offline') {
          setErrors(['You are offline. Scoring is saved locally — submit again once the connection is back.']);
          return;
        }
      }
      const res = await matchesApi.submit(match.id, { confirmWarnings });
      setResult(res);
      setWarnings(null);
      invalidate('matches', 'match', 'tournament', 'standings', 'bracket', 'player-stats', 'player-leaderboard', 'teams', 'team');
      refresh();
    } catch (err) {
      const d = err.response?.data?.details;
      if (err.response?.status === 409 && d?.needsConfirmation) setWarnings(d.warnings);
      else if (d?.errors?.length) setErrors(d.errors);
      else setErrors([err.response?.data?.error || 'Submission failed. Your data is safe locally — try again.']);
    } finally {
      setBusy(false);
    }
  };

  const ratingBy = new Map((result?.ratings || []).map((r) => [String(r.playerId), r]));

  return (
    <Card tone="success" className="border-2 p-5" data-testid="match-complete" aria-live="polite">
      <div className="text-center">
        <StatusBadge status="final" label={submitted ? 'Match submitted' : 'Match complete'} />
        <div className="mt-2 font-display text-3xl font-bold uppercase md:text-4xl">
          <span className="text-team-a">
            {teams.A?.name || 'A'} {state.setsWon.A}
          </span>
          <span className="text-text-muted"> – </span>
          <span className="text-team-b">
            {state.setsWon.B} {teams.B?.name || 'B'}
          </span>
        </div>
        <div className="mt-1 inline-flex items-center gap-1.5 text-sm text-text-secondary">
          <Icon name="trophy" size={14} className="text-brand-400" /> {winnerName} wins{state.endReason && state.endReason !== 'played' ? ` (${state.endReason})` : ''} · {state.sets.map((s) => `${s.scoreA}–${s.scoreB}`).join(', ')}
        </div>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {['A', 'B'].map((side) => (
          <TableWrap key={side}>
            <div className={`eyebrow px-3 py-1.5 ${side === 'A' ? '!text-team-a' : '!text-team-b'}`}>{teams[side]?.name || `Team ${side}`}</div>
            <Table caption={`Box score — ${teams[side]?.name || `Team ${side}`}`} className="!text-xs" minWidth={420}>
              <thead>
                <tr>
                  <Th sticky>Player</Th>
                  <Th num>Pts</Th>
                  <Th num>K</Th>
                  <Th num>Ace</Th>
                  <Th num>Blk</Th>
                  <Th num>Dig</Th>
                  <Th num>Ast</Th>
                  <Th num>Err</Th>
                  <Th num>Rating</Th>
                </tr>
              </thead>
              <tbody>
                {boxes
                  .filter((b) => b.team === side)
                  .sort((a, b) => b.points - a.points)
                  .map((b) => {
                    const r = ratingBy.get(String(b.playerId));
                    return (
                      <tr key={b.playerId}>
                        <Td sticky className="font-semibold">
                          {players.name(b.playerId)}
                        </Td>
                        <Td num strong>
                          {b.points}
                        </Td>
                        <Td num>{b.kills}</Td>
                        <Td num>{b.aces}</Td>
                        <Td num>{b.blocks}</Td>
                        <Td num>{b.digs}</Td>
                        <Td num>{b.assists}</Td>
                        <Td num className="text-status-danger">
                          {b.errors}
                        </Td>
                        <Td num className={`font-bold ${r ? (r.delta >= 0 ? 'text-status-success' : 'text-status-danger') : 'text-text-muted'}`} title={r?.reason}>
                          {r ? (r.delta >= 0 ? `+${r.delta}` : r.delta) : submitted ? '' : '—'}
                        </Td>
                      </tr>
                    );
                  })}
              </tbody>
            </Table>
          </TableWrap>
        ))}
      </div>

      {warnings ? (
        <Alert tone="warning" title="Please review before submitting:" className="mt-4">
          <ul className="mt-1 list-disc pl-5">
            {warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-text-muted">Nothing has been changed. Undo events to correct, or submit as recorded.</p>
        </Alert>
      ) : null}
      {errors ? (
        <Alert tone="danger" className="mt-4">
          <ul className="list-disc pl-5">
            {errors.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </Alert>
      ) : null}

      <div className="mx-auto mt-5 flex max-w-md flex-col gap-2">
        {submitted ? (
          <>
            <p className="inline-flex items-center justify-center gap-2 text-center font-semibold text-status-success" data-testid="submitted-message">
              <Icon name="check" size={18} /> Match submitted successfully. Ratings and standings are updated.
            </p>
            {match.tournament_id ? (
              <Button to={`/tournaments/${match.tournament_id}`} variant="secondary">
                <Icon name="chart" size={16} /> View tournament standings
              </Button>
            ) : null}
            <Button to="/score" variant="ghost">
              <Icon name="arrowLeft" size={16} /> Back to scorer dashboard
            </Button>
          </>
        ) : (
          <>
            <Button size="xl" variant="gold" data-testid="submit-match" onClick={() => submit(Boolean(warnings))} disabled={busy}>
              {busy ? 'Submitting…' : warnings ? 'Submit as recorded' : 'Submit match'}
            </Button>
            {pending > 0 ? <p className="text-center text-xs text-text-muted">{pending} event(s) will sync first.</p> : null}
            <Button variant="ghost" size="sm" onClick={undoLast} disabled={!canUndo}>
              <Icon name="undo" size={14} /> Undo last rally
            </Button>
          </>
        )}
      </div>
    </Card>
  );
}

function SubstitutionPanel({ sub, setSub, state, players, teams, dispatch, toast }) {
  const team = sub.team;
  const onCourt = state.rotation[team].map((id) => players.get(id)).filter(Boolean);
  const onCourtIds = new Set(state.rotation[team].map(String));
  const bench = players[team].filter((p) => !onCourtIds.has(String(p.id)));
  return (
    <Card tone={team.toLowerCase()} className="p-3" data-testid="sub-panel">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h2 className="inline-flex items-center gap-2 text-sm font-bold">
          <Icon name="swap" size={16} className={TEAM_TEXT[team]} />
          Substitution · <span className={TEAM_TEXT[team]}>{teams[team]?.name || `Team ${team}`}</span> {sub.out ? `· ${playerLabel(sub.out)} out → choose who comes in` : '· choose who goes out'}
        </h2>
        <Button variant="ghost" size="sm" onClick={() => setSub(null)}>
          Cancel
        </Button>
      </div>
      <div className="grid grid-cols-3 gap-2 md:grid-cols-6">
        {(sub.out ? bench : onCourt).map((p) => (
          <button
            key={p.id}
            type="button"
            className="min-h-14 rounded-lg border border-border-strong bg-bg-surface font-display text-base font-bold hover:bg-bg-elevated"
            onClick={() => {
              if (!sub.out) setSub({ team, out: p });
              else {
                const res = dispatch('SUBSTITUTION', { team, out: sub.out.id, in: p.id });
                if (res.ok) toast(`Sub: ${playerLabel(sub.out)} → ${playerLabel(p)}`);
                setSub(null);
              }
            }}
          >
            {playerLabel(p)}
          </button>
        ))}
        {sub.out && !bench.length ? <p className="col-span-full text-sm text-text-muted">No bench players available.</p> : null}
      </div>
    </Card>
  );
}
