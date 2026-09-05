// Match setup: tournament → court → teams → format → lineups → start.
// Works for (a) a brand-new ad-hoc match (/score/new) and (b) an assigned
// match that needs lineups (/score/:id/setup).
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { FORMAT_PRESETS } from '@engine/match.js';
import PageShell from '../../components/ui/PageShell.jsx';
import Button from '../../components/Button.jsx';
import Field from '../../components/ui/Field.jsx';
import { LoadingBlock, ErrorBlock } from '../../components/ui/Loading.jsx';
import { useToast } from '../../components/ui/ToastProvider.jsx';
import { useScoredMatch, useTeams, useTournaments, useTournament, useTeam, useInvalidate } from '../../hooks/queries.js';
import { matchesApi } from '../../api/endpoints.js';

const PRESETS = [
  { key: 'best_of_3', label: 'Best of 3', hint: '25 pts, deciding to 15' },
  { key: 'best_of_5', label: 'Best of 5', hint: '25 pts, deciding to 15' },
  { key: 'best_of_1', label: 'Single set', hint: 'One set to 25' },
  { key: 'custom', label: 'Custom', hint: 'Set your own rules' },
];

function Choice({ selected, onClick, children, tone = 'accent', className = '' }) {
  const ring = tone === 'a' ? 'border-team-a bg-team-a/15' : tone === 'b' ? 'border-team-b bg-team-b/15' : 'border-accent-500 bg-accent-500/15';
  return (
    <button type="button" onClick={onClick} aria-pressed={selected} className={`min-h-[56px] rounded-xl border-2 px-3 text-left font-semibold transition-colors ${selected ? ring : 'border-border-default bg-bg-card hover:border-border-strong'} ${className}`}>
      {children}
    </button>
  );
}

function LineupPicker({ side, team, roster, value, onChange }) {
  const starters = value.starters;
  const bench = value.bench;
  const toggle = (id) => {
    if (starters.includes(id)) onChange({ starters: starters.filter((x) => x !== id), bench: [...bench, id] });
    else if (bench.includes(id)) onChange({ starters, bench: bench.filter((x) => x !== id) });
    else if (starters.length < 6) onChange({ starters: [...starters, id], bench });
    else onChange({ starters, bench: [...bench, id] });
  };
  const tone = side === 'A' ? 'text-team-a' : 'text-team-b';
  return (
    <div className="rounded-2xl border border-border-default bg-bg-card p-3">
      <div className={`mb-1 text-xs font-black uppercase tracking-[0.2em] ${tone}`}>
        {team?.name || `Team ${side}`} · {starters.length}/6 starters{bench.length ? ` · ${bench.length} bench` : ''}
      </div>
      <p className="mb-2 text-xs text-text-muted">Tap players in serving order (1 = first server). Tap again to move to bench, again to remove.</p>
      {!roster?.length ? (
        <p className="text-sm text-text-muted">
          This team has no roster yet.{' '}
          {team ? (
            <Link to={`/teams/${team.id}`} className="text-accent-400 hover:underline">
              Add players
            </Link>
          ) : null}
        </p>
      ) : null}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {(roster || []).map((p) => {
          const si = starters.indexOf(p.id);
          const onBench = bench.includes(p.id);
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => toggle(p.id)}
              aria-pressed={si >= 0 || onBench}
              data-testid={`lineup-${side}-${p.id}`}
              className={`flex min-h-[56px] items-center gap-2 rounded-xl border-2 px-2 text-left text-sm font-semibold ${
                si >= 0 ? (side === 'A' ? 'border-team-a bg-team-a/15' : 'border-team-b bg-team-b/15') : onBench ? 'border-border-strong bg-bg-elevated text-text-secondary' : 'border-border-default bg-bg-surface'
              }`}
            >
              <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-black ${si >= 0 ? 'bg-text-primary text-bg-page' : 'bg-bg-elevated text-text-muted'}`}>{si >= 0 ? si + 1 : onBench ? 'B' : ''}</span>
              <span className="min-w-0">
                <span className="block truncate">
                  {p.jersey_number != null ? `#${p.jersey_number} ` : ''}
                  {p.name}
                </span>
                {p.position ? <span className="block text-[11px] font-normal text-text-muted">{p.position.replace('_', ' ')}</span> : null}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function MatchSetup() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const invalidate = useInvalidate();
  const existing = useScoredMatch(id);
  const tournaments = useTournaments({ status: 'published,live' });
  const teams = useTeams({ limit: 300 });

  const [tournamentId, setTournamentId] = useState('');
  const [courtId, setCourtId] = useState('');
  const [teamA, setTeamA] = useState('');
  const [teamB, setTeamB] = useState('');
  const [preset, setPreset] = useState('best_of_3');
  const [custom, setCustom] = useState({ setsToWin: 2, setPoints: 25, decidingSetPoints: 15, winByTwo: true, pointCap: '' });
  const [lineupA, setLineupA] = useState({ starters: [], bench: [] });
  const [lineupB, setLineupB] = useState({ starters: [], bench: [] });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const tournament = useTournament(tournamentId);
  const rosterA = useTeam(teamA);
  const rosterB = useTeam(teamB);

  // Prefill from an assigned match
  useEffect(() => {
    const m = existing.data;
    if (!m) return;
    setTournamentId(m.tournament_id ? String(m.tournament_id) : '');
    setCourtId(m.court_id ? String(m.court_id) : '');
    setTeamA(m.team_a_id ? String(m.team_a_id) : '');
    setTeamB(m.team_b_id ? String(m.team_b_id) : '');
    setLineupA({ starters: m.lineups?.A?.starters || [], bench: m.lineups?.A?.bench || [] });
    setLineupB({ starters: m.lineups?.B?.starters || [], bench: m.lineups?.B?.bench || [] });
  }, [existing.data]);

  // Default lineups: first six of the roster when nothing chosen yet
  useEffect(() => {
    if (rosterA.data && !lineupA.starters.length && !lineupA.bench.length) {
      const ids = rosterA.data.members.map((m) => m.id);
      setLineupA({ starters: ids.slice(0, 6), bench: ids.slice(6) });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rosterA.data]);
  useEffect(() => {
    if (rosterB.data && !lineupB.starters.length && !lineupB.bench.length) {
      const ids = rosterB.data.members.map((m) => m.id);
      setLineupB({ starters: ids.slice(0, 6), bench: ids.slice(6) });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rosterB.data]);

  const format = useMemo(() => {
    if (preset !== 'custom') return preset;
    return {
      setsToWin: Number(custom.setsToWin),
      setPoints: Number(custom.setPoints),
      decidingSetPoints: Number(custom.decidingSetPoints),
      winByTwo: Boolean(custom.winByTwo),
      pointCap: custom.pointCap ? Number(custom.pointCap) : null,
    };
  }, [preset, custom]);

  const isAssigned = Boolean(existing.data);
  const teamList = teams.data || [];
  const ready = teamA && teamB && teamA !== teamB && lineupA.starters.length > 0 && lineupB.starters.length > 0;
  const shortHanded = ready && (lineupA.starters.length < 6 || lineupB.starters.length < 6);

  async function start() {
    setBusy(true);
    setError(null);
    try {
      let match = existing.data;
      if (!match) {
        match = await matchesApi.create({
          tournament_id: tournamentId || undefined,
          court_id: courtId || undefined,
          team_a_id: Number(teamA),
          team_b_id: Number(teamB),
          format,
        });
      }
      await matchesApi.lineups(match.id, { A: lineupA, B: lineupB });
      invalidate('matches', ['match', String(match.id)]);
      toast('Lineups saved', { icon: '✓' });
      navigate(`/score/${match.id}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Could not start the match');
    } finally {
      setBusy(false);
    }
  }

  if (id && existing.isLoading) return <PageShell title="Match setup"><LoadingBlock /></PageShell>;
  if (id && existing.isError) return <PageShell title="Match setup"><ErrorBlock error={existing.error} retry={existing.refetch} /></PageShell>;

  return (
    <PageShell title={isAssigned ? 'Confirm lineups' : 'New match'} subtitle={isAssigned ? `${existing.data.team_a_name || existing.data.teams?.A?.name} vs ${existing.data.team_b_name || existing.data.teams?.B?.name}` : 'Pick the teams, the format and the starting six. One screen, then score.'}>
      <div className="space-y-6">
        {!isAssigned ? (
          <>
            <section>
              <h2 className="mb-2 text-xs font-black uppercase tracking-[0.2em] text-text-muted">1 · Tournament (optional)</h2>
              <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                <Choice selected={!tournamentId} onClick={() => { setTournamentId(''); setCourtId(''); }}>
                  Friendly / none
                </Choice>
                {(tournaments.data || []).map((t) => (
                  <Choice key={t.id} selected={tournamentId === String(t.id)} onClick={() => setTournamentId(String(t.id))}>
                    <span className="block truncate">{t.name}</span>
                    <span className="block text-xs font-normal text-text-muted">{t.status} · {t.team_count} teams</span>
                  </Choice>
                ))}
              </div>
              {tournamentId && tournament.data?.courts?.length ? (
                <div className="mt-3">
                  <h3 className="mb-1 text-xs font-semibold text-text-muted">Court</h3>
                  <div className="flex flex-wrap gap-2">
                    {tournament.data.courts.map((c) => (
                      <Choice key={c.id} selected={courtId === String(c.id)} onClick={() => setCourtId(String(c.id))} className="min-w-[96px]">
                        {c.name}
                      </Choice>
                    ))}
                  </div>
                </div>
              ) : null}
            </section>

            <section>
              <h2 className="mb-2 text-xs font-black uppercase tracking-[0.2em] text-text-muted">2 · Teams</h2>
              {teams.isLoading ? <LoadingBlock label="Loading teams…" /> : null}
              {!teams.isLoading && !teamList.length ? (
                <p className="text-sm text-text-secondary">
                  No teams yet.{' '}
                  <Link to="/teams" className="font-semibold text-accent-400 hover:underline">
                    Create a team
                  </Link>{' '}
                  first.
                </p>
              ) : null}
              <div className="grid gap-3 md:grid-cols-2">
                {[
                  ['A', teamA, setTeamA, teamB],
                  ['B', teamB, setTeamB, teamA],
                ].map(([side, value, set, other]) => (
                  <div key={side}>
                    <h3 className={`mb-1 text-xs font-semibold ${side === 'A' ? 'text-team-a' : 'text-team-b'}`}>Team {side}</h3>
                    <div className="grid max-h-64 grid-cols-2 gap-2 overflow-y-auto pr-1">
                      {teamList.map((t) => (
                        <Choice key={t.id} tone={side.toLowerCase()} selected={value === String(t.id)} onClick={() => { set(String(t.id)); side === 'A' ? setLineupA({ starters: [], bench: [] }) : setLineupB({ starters: [], bench: [] }); }} className={other === String(t.id) ? 'opacity-40' : ''}>
                          <span className="block truncate">{t.name}</span>
                          <span className="block text-xs font-normal text-text-muted">{t.member_count} players · {t.elo}</span>
                        </Choice>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h2 className="mb-2 text-xs font-black uppercase tracking-[0.2em] text-text-muted">3 · Format</h2>
              <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                {PRESETS.map((p) => (
                  <Choice key={p.key} selected={preset === p.key} onClick={() => setPreset(p.key)}>
                    <span className="block">{p.label}</span>
                    <span className="block text-xs font-normal text-text-muted">{p.hint}</span>
                  </Choice>
                ))}
              </div>
              {preset === 'custom' ? (
                <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-5">
                  <Field label="Sets to win" type="number" min={1} max={5} value={custom.setsToWin} onChange={(e) => setCustom({ ...custom, setsToWin: e.target.value })} />
                  <Field label="Set points" type="number" min={1} max={99} value={custom.setPoints} onChange={(e) => setCustom({ ...custom, setPoints: e.target.value })} />
                  <Field label="Deciding set" type="number" min={1} max={99} value={custom.decidingSetPoints} onChange={(e) => setCustom({ ...custom, decidingSetPoints: e.target.value })} />
                  <Field label="Point cap" type="number" min={0} max={199} placeholder="none" value={custom.pointCap} onChange={(e) => setCustom({ ...custom, pointCap: e.target.value })} />
                  <label className="flex min-h-[44px] items-end gap-2 pb-2 text-sm font-semibold">
                    <input type="checkbox" className="h-5 w-5" checked={custom.winByTwo} onChange={(e) => setCustom({ ...custom, winByTwo: e.target.checked })} /> Win by two
                  </label>
                </div>
              ) : (
                <p className="mt-2 text-xs text-text-muted">
                  {FORMAT_PRESETS[preset].setsToWin * 2 - 1} sets max · to {FORMAT_PRESETS[preset].setPoints} · deciding set to {FORMAT_PRESETS[preset].decidingSetPoints} · win by two
                </p>
              )}
            </section>
          </>
        ) : null}

        <section>
          <h2 className="mb-2 text-xs font-black uppercase tracking-[0.2em] text-text-muted">{isAssigned ? 'Starting lineups' : '4 · Starting lineups'}</h2>
          {!teamA || !teamB ? (
            <p className="text-sm text-text-muted">Pick both teams first.</p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              <LineupPicker side="A" team={rosterA.data} roster={rosterA.data?.members} value={lineupA} onChange={setLineupA} />
              <LineupPicker side="B" team={rosterB.data} roster={rosterB.data?.members} value={lineupB} onChange={setLineupB} />
            </div>
          )}
        </section>

        {shortHanded ? <p className="text-sm text-status-warning">⚠ A team has fewer than 6 starters — the match will be recorded as short-handed.</p> : null}
        {error ? <ErrorBlock error={{ message: error }} /> : null}

        <div className="sticky bottom-0 -mx-4 border-t border-border-default bg-bg-page/95 px-4 py-3 backdrop-blur">
          <Button size="lg" className="min-h-[64px] w-full text-lg" onClick={start} disabled={!ready || busy} data-testid="setup-start">
            {busy ? 'Saving…' : 'Save lineups & open scoreboard →'}
          </Button>
        </div>
      </div>
    </PageShell>
  );
}
