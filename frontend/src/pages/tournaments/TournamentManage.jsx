import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import PageShell from '../../components/ui/PageShell.jsx';
import Tabs, { TabPanel } from '../../components/ui/Tabs.jsx';
import Field, { Checkbox, inputClass } from '../../components/ui/Field.jsx';
import Button from '../../components/Button.jsx';
import Card, { CardHeader } from '../../components/Card.jsx';
import Avatar from '../../components/Avatar.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import Alert from '../../components/ui/Alert.jsx';
import Icon from '../../components/ui/Icon.jsx';
import StatusBadge from '../../components/ui/StatusBadge.jsx';
import { GroupLabel } from '../../components/ui/Section.jsx';
import { Table, TableWrap, Th, Td } from '../../components/ui/Table.jsx';
import { LoadingBlock, ErrorBlock } from '../../components/ui/Loading.jsx';
import { useToast } from '../../components/ui/ToastProvider.jsx';
import { MatchStatusPill } from '../../components/tournament/MatchCard.jsx';
import { useTournament, useScoredMatches, usePlayerSearch, useInvalidate } from '../../hooks/queries.js';
import { tournamentsApi, matchesApi } from '../../api/endpoints.js';
import { TOURNAMENT_FORMAT_LABELS, LEVEL_LABELS } from '../../lib/format.js';
import { TournamentStatusPill, RegistrationStatusPill, FORMAT_HELP, POOL_FORMATS, errorMessage, useDebounced, toLocalInput, toDateInput, dateRange } from './tournamentUi.jsx';

const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'registrations', label: 'Registrations' },
  { key: 'divisions', label: 'Divisions' },
  { key: 'schedule', label: 'Schedule' },
  { key: 'courts', label: 'Courts' },
];

const INVALIDATE_KEYS = ['tournament', 'tournaments', 'matches', 'standings', 'bracket'];

/** Wraps a mutation with busy state, toast and cache invalidation. */
function useAction() {
  const { toast } = useToast();
  const invalidate = useInvalidate();
  const [busy, setBusy] = useState(false);
  const run = async (fn, success, opts = {}) => {
    setBusy(true);
    try {
      const out = await fn();
      invalidate(...INVALIDATE_KEYS);
      if (success) toast(typeof success === 'function' ? success(out) : success, { tone: 'success', ...opts });
      return out;
    } catch (err) {
      toast(errorMessage(err), { tone: 'error', duration: 4500 });
      return null;
    } finally {
      setBusy(false);
    }
  };
  return { run, busy };
}

/** Two-step destructive button: first click arms it, second click confirms. */
export function ConfirmButton({ label, confirmLabel = 'Yes, do it', warning = 'Are you sure?', onConfirm, disabled, variant = 'secondary', size = 'md', className = '' }) {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return undefined;
    const id = setTimeout(() => setArmed(false), 8000);
    return () => clearTimeout(id);
  }, [armed]);
  if (!armed) {
    return (
      <Button variant={variant} size={size} disabled={disabled} className={className} onClick={() => setArmed(true)}>
        {label}
      </Button>
    );
  }
  return (
    <span role="group" aria-label={warning} className="inline-flex flex-wrap items-center gap-2 rounded-md border border-status-warning/50 bg-status-warning/10 p-1.5">
      <span className="px-1 text-xs font-semibold text-text-primary">{warning}</span>
      <Button
        variant="danger"
        size={size}
        disabled={disabled}
        onClick={async () => {
          await onConfirm();
          setArmed(false);
        }}
      >
        {confirmLabel}
      </Button>
      <Button variant="ghost" size={size} onClick={() => setArmed(false)}>
        No
      </Button>
    </span>
  );
}

// ---------------------------------------------------------------------------
// Overview: details form + status transitions
// ---------------------------------------------------------------------------
const FLOW = ['draft', 'published', 'live', 'completed'];

function StatusFlow({ status }) {
  const idx = FLOW.indexOf(status);
  return (
    <ol className="flex flex-wrap items-center gap-1.5" aria-label="Status flow">
      {FLOW.map((s, i) => {
        const done = idx > i;
        const current = idx === i;
        return (
          <li key={s} className="flex items-center gap-1.5">
            <span
              className={`inline-flex min-h-7 items-center gap-1 rounded-full px-2.5 font-display text-2xs font-bold uppercase tracking-wider ${current ? 'bg-accent-500 text-white' : done ? 'bg-status-success/15 text-status-success' : 'bg-bg-elevated text-text-muted'}`}
              aria-current={current ? 'step' : undefined}
            >
              {done ? <Icon name="check" size={12} /> : null}
              {s}
            </span>
            {i < FLOW.length - 1 ? <Icon name="chevronRight" size={12} className="text-text-muted" /> : null}
          </li>
        );
      })}
      {status === 'cancelled' ? (
        <li>
          <StatusBadge status="cancelled" size="sm" />
        </li>
      ) : null}
    </ol>
  );
}

function OverviewTab({ t }) {
  const { run, busy } = useAction();
  const initial = useMemo(
    () => ({
      name: t.name || '',
      description: t.description || '',
      starts_on: toDateInput(t.starts_on),
      ends_on: toDateInput(t.ends_on),
      location: t.location || '',
      level: t.level || 'local',
      registration_open: Boolean(t.registration_open),
    }),
    [t]
  );
  const [form, setForm] = useState(initial);
  useEffect(() => setForm(initial), [initial]);
  const dirty = JSON.stringify(form) !== JSON.stringify(initial);
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  const save = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    await run(() => tournamentsApi.update(t.id, { ...form, name: form.name.trim(), ends_on: form.ends_on || form.starts_on }), 'Tournament saved');
  };
  const setStatus = (status, msg) => run(() => tournamentsApi.update(t.id, { status }), msg);

  const approved = (t.registrations || []).filter((r) => r.status === 'approved').length;
  const unscheduled = (t.divisions || []).filter((d) => !d.match_count).length;

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
      <Card padding>
        <CardHeader title="Details" as="h2" />
        <form onSubmit={save} noValidate className="grid gap-4 sm:grid-cols-2">
          <Field label="Name" value={form.name} onChange={set('name')} required className="sm:col-span-2" error={form.name.trim() ? undefined : 'Name is required'} />
          <Field label="Description" as="textarea" rows={3} value={form.description} onChange={set('description')} className="sm:col-span-2" />
          <Field label="Start date" type="date" value={form.starts_on} onChange={set('starts_on')} />
          <Field label="End date" type="date" value={form.ends_on} onChange={set('ends_on')} min={form.starts_on || undefined} />
          <Field label="Location / city" value={form.location} onChange={set('location')} hint={t.venue_name ? `Venue: ${t.venue_name}` : undefined} />
          <Field label="Level" as="select" value={form.level} onChange={set('level')}>
            {Object.entries(LEVEL_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </Field>
          <Checkbox className="sm:col-span-2" label="Registration open" hint="Coaches can request a spot from the public page." checked={form.registration_open} onChange={set('registration_open')} />
          <div className="flex gap-2 sm:col-span-2">
            <Button type="submit" disabled={busy || !dirty || !form.name.trim()}>
              {busy ? 'Saving…' : 'Save changes'}
            </Button>
            {dirty ? (
              <Button type="button" variant="ghost" onClick={() => setForm(initial)}>
                Discard
              </Button>
            ) : null}
          </div>
        </form>
      </Card>

      <div className="space-y-4">
        <Card padding>
          <CardHeader title="Status" as="h2" />
          <StatusFlow status={t.status} />
          <p className="mt-3 text-sm text-text-secondary">
            {t.status === 'draft' && 'Only you can see this tournament. Publish it to open registration and let players find it.'}
            {t.status === 'published' && 'Visible to everyone. Approve teams, generate the schedule, then mark it live on match day.'}
            {t.status === 'live' && 'Matches are being scored. Publishing results advances brackets, crowns champions and locks the event.'}
            {t.status === 'completed' && 'Results are published. This tournament is locked.'}
            {t.status === 'cancelled' && 'Cancelled. You can reopen it as a draft.'}
          </p>
          <div className="mt-4 flex flex-col gap-2">
            {t.status === 'draft' ? (
              <Button disabled={busy} onClick={() => run(() => tournamentsApi.publish(t.id), 'Tournament published')}>
                Publish tournament
              </Button>
            ) : null}
            {t.status === 'published' ? (
              <Button variant="live" disabled={busy} onClick={() => setStatus('live', 'Tournament is live')}>
                Mark as live
              </Button>
            ) : null}
            {t.status === 'published' || t.status === 'live' ? (
              <ConfirmButton
                label="Publish results & complete"
                confirmLabel="Publish results"
                warning="This finalises standings and locks the event."
                variant={t.status === 'live' ? 'gold' : 'secondary'}
                disabled={busy}
                onConfirm={() => run(() => tournamentsApi.publishResults(t.id), 'Results published — tournament completed')}
              />
            ) : null}
            {t.status === 'published' ? (
              <Button variant="ghost" disabled={busy} onClick={() => setStatus('draft', 'Moved back to draft')}>
                Unpublish (back to draft)
              </Button>
            ) : null}
            {t.status === 'cancelled' ? (
              <Button disabled={busy} onClick={() => setStatus('draft', 'Reopened as draft')}>
                Reopen as draft
              </Button>
            ) : null}
            {['draft', 'published', 'live'].includes(t.status) ? (
              <ConfirmButton label="Cancel tournament" confirmLabel="Yes, cancel it" warning="Cancel this tournament?" variant="ghost" className="text-status-danger" disabled={busy} onConfirm={() => setStatus('cancelled', 'Tournament cancelled')} />
            ) : null}
          </div>
        </Card>

        <Card padding>
          <CardHeader title="At a glance" as="h2" />
          <dl className="grid grid-cols-2 gap-3 text-sm">
            {[
              ['Dates', dateRange(t)],
              ['Format', TOURNAMENT_FORMAT_LABELS[t.format] || t.format],
              [
                'Teams approved',
                <>
                  {approved}
                  {t.pending_count ? <span className="ml-1 text-status-warning">(+{t.pending_count} pending)</span> : null}
                </>,
              ],
              ['Matches', `${t.match_count} · ${t.completed_count} final`],
              ['Courts', t.court_count],
              ['Scoring', `Best of ${(t.settings?.setsToWin || 2) * 2 - 1} to ${t.settings?.setPoints || 25}`],
            ].map(([k, v]) => (
              <div key={k}>
                <dt className="eyebrow !text-[10px]">{k}</dt>
                <dd className="mt-0.5 font-semibold">{v}</dd>
              </div>
            ))}
          </dl>
          {unscheduled ? (
            <Alert tone="warning" className="mt-3">
              {unscheduled} division{unscheduled > 1 ? 's' : ''} without a schedule.
            </Alert>
          ) : null}
          <Link to={`/tournaments/${t.id}`} className="link mt-3 inline-flex min-h-11 items-center gap-1 text-sm">
            View public page <Icon name="arrowRight" size={14} />
          </Link>
        </Card>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Registrations
// ---------------------------------------------------------------------------
function SeedInput({ t, reg }) {
  const { run } = useAction();
  const [value, setValue] = useState(reg.seed ?? '');
  useEffect(() => setValue(reg.seed ?? ''), [reg.seed]);
  const commit = () => {
    if (String(value) === String(reg.seed ?? '')) return;
    run(() => tournamentsApi.updateRegistration(t.id, reg.id, { seed: value === '' ? null : Number(value) }), value === '' ? 'Seed cleared' : `Seed ${value} saved`);
  };
  return (
    <input
      type="number"
      min={1}
      max={999}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
      aria-label={`Seed for ${reg.team_name}`}
      className={`${inputClass} w-20 px-2 text-center`}
      placeholder="—"
    />
  );
}

function RegistrationRow({ t, reg }) {
  const { run, busy } = useAction();
  const setStatus = (status) => run(() => tournamentsApi.updateRegistration(t.id, reg.id, { status }), `${reg.team_name}: ${status}`);
  const setDivision = (e) => run(() => tournamentsApi.updateRegistration(t.id, reg.id, { division_id: e.target.value || null }), `${reg.team_name} moved`);
  return (
    <tr className={reg.status === 'pending' ? 'bg-status-warning/5' : ''}>
      <Td sticky>
        <Link to={`/teams/${reg.team_id}`} className="inline-flex min-h-11 items-center gap-2 font-display text-base font-bold uppercase tracking-wide hover:text-accent-400">
          <Avatar src={reg.team_logo} name={reg.team_name} size="sm" shape="square" />
          {reg.team_name}
        </Link>
      </Td>
      <Td num>{reg.member_count}</Td>
      <Td num strong className="text-brand-400">
        {reg.team_elo}
      </Td>
      <Td>
        <select value={reg.division_id || ''} onChange={setDivision} disabled={busy} aria-label={`Division for ${reg.team_name}`} className={`${inputClass} min-w-[130px] px-2`}>
          <option value="">—</option>
          {t.divisions.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
      </Td>
      <Td>
        <SeedInput t={t} reg={reg} />
      </Td>
      <Td>
        <RegistrationStatusPill status={reg.status} size="md" />
      </Td>
      <Td>
        <div className="flex flex-wrap justify-end gap-1">
          {reg.status !== 'approved' ? (
            <Button size="sm" disabled={busy} onClick={() => setStatus('approved')}>
              <Icon name="check" size={14} /> Approve
            </Button>
          ) : null}
          {reg.status !== 'rejected' ? (
            <Button size="sm" variant="secondary" disabled={busy} className="text-status-danger" onClick={() => setStatus('rejected')}>
              Reject
            </Button>
          ) : null}
          {reg.status !== 'pending' ? (
            <Button size="sm" variant="ghost" disabled={busy} onClick={() => setStatus('pending')}>
              Pending
            </Button>
          ) : null}
        </div>
      </Td>
    </tr>
  );
}

function RegistrationsTab({ t }) {
  const regs = t.registrations || [];
  if (!regs.length) {
    return <EmptyState icon="users" headline="No registrations yet" copy={t.status === 'draft' ? 'Publish the tournament so coaches can register their teams.' : t.registration_open ? 'Coaches register from the public tournament page.' : 'Registration is closed — reopen it from the Overview tab.'} />;
  }
  const order = { pending: 0, approved: 1, rejected: 2, withdrawn: 3 };
  const sorted = [...regs].sort((a, b) => order[a.status] - order[b.status] || (a.seed ?? 999) - (b.seed ?? 999) || a.team_name.localeCompare(b.team_name));
  const pending = regs.filter((r) => r.status === 'pending').length;
  return (
    <div className="space-y-3">
      {pending ? (
        <Alert tone="warning" title={`${pending} registration${pending > 1 ? 's' : ''} waiting for approval`}>
          Approve or reject them below. Approved teams count toward the schedule.
        </Alert>
      ) : null}
      <TableWrap>
        <Table caption="Team registrations" minWidth={820}>
          <thead>
            <tr>
              <Th sticky>Team</Th>
              <Th num>Players</Th>
              <Th num>Rating</Th>
              <Th>Division</Th>
              <Th>Seed</Th>
              <Th>Status</Th>
              <Th className="text-right">Actions</Th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((r) => (
              <RegistrationRow key={r.id} t={t} reg={r} />
            ))}
          </tbody>
        </Table>
      </TableWrap>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Divisions + schedule generation
// ---------------------------------------------------------------------------
function DivisionCard({ t, d }) {
  const { run, busy } = useAction();
  const [startsAt, setStartsAt] = useState(t.starts_on ? `${toDateInput(t.starts_on)}T09:00` : '');
  const [slot, setSlot] = useState(60);
  const approved = (t.registrations || []).filter((r) => r.status === 'approved' && (r.division_id == null || Number(r.division_id) === Number(d.id))).length;
  const locked = t.status === 'completed' || t.status === 'cancelled';
  const canGenerate = approved >= 2 && !locked;
  const settings = { ...(t.settings || {}), ...(d.settings || {}) };
  const generate = () =>
    run(
      () => tournamentsApi.generate(t.id, d.id, { starts_at: startsAt ? new Date(startsAt).toISOString() : undefined, slotMinutes: Number(slot) || undefined }),
      (out) => `Generated ${out?.matches ?? 0} matches for ${d.name}`,
      { duration: 3000 }
    );

  return (
    <Card padding>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="font-display text-xl font-bold leading-none">{d.name}</h3>
          <p className="mt-1 text-sm text-text-secondary">
            {TOURNAMENT_FORMAT_LABELS[d.format] || d.format}
            {POOL_FORMATS.includes(d.format) ? ` · ${settings.pools || 2} pools, top ${settings.advance || 2} advance` : ''}
            {' · '}best of {(settings.setsToWin || 2) * 2 - 1} to {settings.setPoints || 25}
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <StatusBadge status="neutral" size="sm" label={d.status || 'pending'} />
          <StatusBadge status="neutral" size="sm" label={`${approved} approved`} />
          <StatusBadge status={d.match_count ? 'completed' : 'neutral'} size="sm" label={`${d.match_count} matches`} />
        </div>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_140px_auto] sm:items-end">
        <Field label="First match starts" type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
        <Field label="Slot (minutes)" type="number" min={15} max={240} step={5} value={slot} onChange={(e) => setSlot(e.target.value)} />
        {d.match_count > 0 ? (
          <ConfirmButton label="Regenerate schedule" confirmLabel="Replace schedule" warning="This replaces all unstarted matches." disabled={!canGenerate || busy} onConfirm={generate} />
        ) : (
          <Button disabled={!canGenerate || busy} onClick={generate}>
            <Icon name="calendar" size={16} /> {busy ? 'Generating…' : 'Generate schedule'}
          </Button>
        )}
      </div>
      {!canGenerate ? (
        <p className="mt-2 text-xs font-semibold text-status-warning">{locked ? 'The tournament is locked.' : `Need at least 2 approved teams in this division (${approved} now). Approve teams under Registrations.`}</p>
      ) : (
        <p className="mt-2 text-xs text-text-muted">
          Courts rotate across {t.courts?.length || 0} court{t.courts?.length === 1 ? '' : 's'}; matches are spaced by the slot length.
        </p>
      )}
    </Card>
  );
}

function DivisionsTab({ t }) {
  const { run, busy } = useAction();
  const [name, setName] = useState('');
  const [format, setFormat] = useState(t.format || 'round_robin');
  const add = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    const out = await run(() => tournamentsApi.addDivision(t.id, { name: name.trim(), format }), `Division “${name.trim()}” added`);
    if (out) setName('');
  };
  return (
    <div className="space-y-4">
      {t.divisions.map((d) => (
        <DivisionCard key={d.id} t={t} d={d} />
      ))}
      <Card padding>
        <CardHeader title="Add a division" />
        <form onSubmit={add} noValidate className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-start">
          <Field label="Name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Women A" required />
          <Field label="Format" as="select" value={format} onChange={(e) => setFormat(e.target.value)} hint={FORMAT_HELP[format]}>
            {Object.entries(TOURNAMENT_FORMAT_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </Field>
          <Button type="submit" disabled={busy || !name.trim()} className="sm:mt-6">
            <Icon name="plus" size={16} /> Add division
          </Button>
        </form>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Schedule
// ---------------------------------------------------------------------------
function ScorerPicker({ match, onPick, disabled }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const debounced = useDebounced(query.trim(), 250);
  const search = usePlayerSearch(open ? debounced : '');
  const results = (search.data || []).slice(0, 8);
  return (
    <div className="relative min-w-[170px]">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={`Scorer for ${match.team_a_name || 'TBD'} vs ${match.team_b_name || 'TBD'}`}
        className={`${inputClass} flex items-center justify-between gap-2 text-left ${match.scorer_name ? '' : 'text-text-muted'}`}
      >
        <span className="truncate">{match.scorer_name || 'Assign scorer…'}</span>
        <Icon name="chevronDown" size={16} className="text-text-muted" />
      </button>
      {open ? (
        <div className="absolute left-0 z-20 mt-1 w-72 rounded-lg border border-border-default bg-bg-card p-2 shadow-elevated">
          <label className="sr-only" htmlFor={`scorer-search-${match.id}`}>
            Search scorers
          </label>
          <input id={`scorer-search-${match.id}`} type="search" autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name or email…" className={inputClass} />
          <div role="listbox" aria-label="Scorer results" className="mt-1 max-h-64 overflow-y-auto">
            {debounced.length < 2 ? (
              <p className="px-2 py-2 text-xs text-text-muted">Type at least 2 letters.</p>
            ) : search.isLoading ? (
              <p className="px-2 py-2 text-xs text-text-muted">Searching…</p>
            ) : results.length ? (
              results.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  role="option"
                  aria-selected={Number(p.id) === Number(match.scorer_id)}
                  onClick={() => {
                    onPick(p);
                    setOpen(false);
                    setQuery('');
                  }}
                  className="flex min-h-11 w-full items-center gap-2 rounded-md px-2 text-left hover:bg-bg-elevated"
                >
                  <Avatar src={p.photo_url} name={p.name} size="sm" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{p.name}</span>
                    <span className="block text-2xs font-semibold uppercase tracking-wider text-text-muted">{p.role}</span>
                  </span>
                </button>
              ))
            ) : (
              <p className="px-2 py-2 text-xs text-text-muted">No one found.</p>
            )}
          </div>
          <div className="mt-1 flex justify-between border-t border-border-default pt-1">
            {match.scorer_id ? (
              <button
                type="button"
                onClick={() => {
                  onPick(null);
                  setOpen(false);
                }}
                className="min-h-10 px-2 text-xs font-bold text-status-danger hover:underline"
              >
                Unassign
              </button>
            ) : (
              <span />
            )}
            <button type="button" onClick={() => setOpen(false)} className="min-h-10 px-2 text-xs font-bold text-text-secondary hover:text-text-primary">
              Close
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ScheduleRow({ t, m }) {
  const { run, busy } = useAction();
  const editable = m.status === 'scheduled';
  const label = `${m.team_a_name || 'TBD'} vs ${m.team_b_name || 'TBD'}`;
  const update = (body, msg) => run(() => matchesApi.update(m.id, body), msg);
  const winA = m.winner_team_id && Number(m.winner_team_id) === Number(m.team_a_id);
  const winB = m.winner_team_id && Number(m.winner_team_id) === Number(m.team_b_id);
  return (
    <tr className={m.status === 'cancelled' ? 'opacity-60' : ''}>
      <Td sticky>
        <div className="font-mono text-2xs text-text-muted">{m.bracket_key}</div>
        <div className="font-display text-base font-bold uppercase tracking-wide">
          <span className={winB ? 'text-text-muted' : 'text-text-primary'}>{m.team_a_name || <i className="normal-case text-text-muted">TBD</i>}</span>
          <span className="mx-1.5 text-xs font-semibold text-text-muted">vs</span>
          <span className={winA ? 'text-text-muted' : 'text-text-primary'}>{m.team_b_name || <i className="normal-case text-text-muted">TBD</i>}</span>
        </div>
        {m.status === 'submitted' ? (
          <div className="text-xs tabular-nums text-text-muted">
            Final {m.sets_a}–{m.sets_b}
          </div>
        ) : null}
      </Td>
      <Td>
        {editable ? (
          <select value={m.court_id || ''} disabled={busy} onChange={(e) => update({ court_id: e.target.value }, e.target.value ? 'Court updated' : 'Court cleared')} aria-label={`Court for ${label}`} className={`${inputClass} min-w-[110px] px-2`}>
            <option value="">—</option>
            {t.courts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        ) : (
          <span className="text-sm">{m.court_name || '—'}</span>
        )}
      </Td>
      <Td>
        {editable ? (
          <input
            type="datetime-local"
            defaultValue={toLocalInput(m.scheduled_at)}
            disabled={busy}
            aria-label={`Time for ${label}`}
            onBlur={(e) => {
              const next = e.target.value ? new Date(e.target.value).toISOString() : '';
              if (toLocalInput(next) !== toLocalInput(m.scheduled_at)) update({ scheduled_at: next }, next ? 'Time updated' : 'Time cleared');
            }}
            className={`${inputClass} min-w-[190px] px-2`}
          />
        ) : (
          <span className="text-sm tabular-nums">{m.scheduled_at ? toLocalInput(m.scheduled_at).replace('T', ' ') : '—'}</span>
        )}
      </Td>
      <Td>{editable ? <ScorerPicker match={m} disabled={busy} onPick={(p) => update({ scorer_id: p ? p.id : '' }, p ? `${p.name} assigned` : 'Scorer unassigned')} /> : <span className="text-sm">{m.scorer_name || '—'}</span>}</Td>
      <Td>
        <MatchStatusPill status={m.status} size="md" />
      </Td>
      <Td className="text-right">
        {m.status === 'live' ? (
          <Button to={`/score/${m.id}`} size="sm" variant="live">
            Score
          </Button>
        ) : m.status === 'completed' ? (
          <Button to={`/score/${m.id}`} size="sm" variant="gold">
            Submit
          </Button>
        ) : m.status === 'submitted' ? (
          <Button to={`/matches/${m.id}`} size="sm" variant="secondary">
            Box score
          </Button>
        ) : m.status === 'cancelled' ? (
          <Button size="sm" variant="ghost" disabled={busy} onClick={() => update({ status: 'scheduled' }, 'Match restored')}>
            Restore
          </Button>
        ) : (
          <ConfirmButton size="sm" label="Cancel" confirmLabel="Cancel match" warning="Cancel this match?" variant="ghost" className="text-status-danger" disabled={busy} onConfirm={() => update({ status: 'cancelled' }, 'Match cancelled')} />
        )}
      </Td>
    </tr>
  );
}

function groupLabel(m) {
  const parts = [m.division_name || 'Open'];
  if (m.pool_name) parts.push(`Pool ${m.pool_name}`);
  else if (m.bracket_stage === 'bracket') parts.push(m.bracket_type === 'final' ? 'Grand final' : m.bracket_type === 'losers' ? 'Losers bracket' : 'Bracket');
  if (m.bracket_type !== 'final' && m.bracket_round) parts.push(`Round ${m.bracket_round}`);
  return parts.join(' · ');
}

function ScheduleTab({ t }) {
  const q = useScoredMatches({ tournament: t.id, limit: 200 }, { refetchInterval: 15000 });
  if (q.isLoading) return <LoadingBlock label="Loading schedule…" variant="table" />;
  if (q.isError) return <ErrorBlock error={q.error} retry={q.refetch} />;
  const matches = q.data || [];
  if (!matches.length) return <EmptyState icon="calendar" headline="No matches yet" copy="Generate a schedule from the Divisions tab once you have at least two approved teams." />;
  const groups = [];
  const byKey = new Map();
  for (const m of matches) {
    const key = groupLabel(m);
    if (!byKey.has(key)) {
      byKey.set(key, []);
      groups.push(key);
    }
    byKey.get(key).push(m);
  }
  const unassigned = matches.filter((m) => m.status === 'scheduled' && !m.scorer_id).length;
  return (
    <div className="space-y-6">
      {unassigned ? (
        <Alert tone="warning" title={`${unassigned} scheduled match${unassigned > 1 ? 'es' : ''} without a scorer`}>
          Assign scorers below — edits save immediately.
        </Alert>
      ) : (
        <p className="text-sm text-text-secondary">{matches.length} matches · every scheduled match has a scorer. Edits save immediately.</p>
      )}
      {groups.map((key) => (
        <section key={key}>
          <GroupLabel count={byKey.get(key).length}>{key}</GroupLabel>
          <TableWrap>
            <Table caption={`Schedule — ${key}`} minWidth={900}>
              <thead>
                <tr>
                  <Th sticky>Match</Th>
                  <Th>Court</Th>
                  <Th>Scheduled</Th>
                  <Th>Scorer</Th>
                  <Th>Status</Th>
                  <Th className="text-right">Action</Th>
                </tr>
              </thead>
              <tbody>
                {byKey
                  .get(key)
                  .sort((a, b) => (a.bracket_slot ?? 0) - (b.bracket_slot ?? 0) || new Date(a.scheduled_at || 0) - new Date(b.scheduled_at || 0))
                  .map((m) => (
                    <ScheduleRow key={m.id} t={t} m={m} />
                  ))}
              </tbody>
            </Table>
          </TableWrap>
        </section>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Courts
// ---------------------------------------------------------------------------
function CourtsTab({ t }) {
  const { run, busy } = useAction();
  const [name, setName] = useState('');
  const add = async (e) => {
    e.preventDefault();
    const out = await run(() => tournamentsApi.addCourt(t.id, { name: name.trim() || undefined }), 'Court added');
    if (out) setName('');
  };
  return (
    <div className="space-y-4">
      {t.courts.length ? (
        <Card as="ul" className="divide-y divide-border-default">
          {t.courts.map((c) => (
            <li key={c.id} className="flex min-h-14 items-center justify-between gap-3 px-4 py-2">
              <span className="inline-flex items-center gap-2 font-display text-base font-bold uppercase tracking-wide">
                <Icon name="court" size={18} className="text-text-muted" /> {c.name}
              </span>
              <ConfirmButton size="sm" label="Remove" confirmLabel="Remove court" warning="Matches on this court lose their court." variant="ghost" className="text-status-danger" disabled={busy} onConfirm={() => run(() => tournamentsApi.removeCourt(t.id, c.id), `${c.name} removed`)} />
            </li>
          ))}
        </Card>
      ) : (
        <EmptyState icon="court" headline="No courts" copy="Add at least one court so the schedule can assign matches." />
      )}
      <form onSubmit={add} className="flex flex-wrap items-end gap-2">
        <Field label="Court name" value={name} onChange={(e) => setName(e.target.value)} placeholder={`Court ${t.courts.length + 1}`} className="min-w-[200px] flex-1" />
        <Button type="submit" disabled={busy}>
          <Icon name="plus" size={16} /> Add court
        </Button>
      </form>
    </div>
  );
}

// ---------------------------------------------------------------------------
export default function TournamentManage() {
  const { id } = useParams();
  const q = useTournament(id);
  const [tab, setTab] = useState('overview');

  if (q.isLoading) {
    return (
      <PageShell>
        <LoadingBlock label="Loading tournament…" variant="cards" />
      </PageShell>
    );
  }
  if (q.isError) {
    return (
      <PageShell title="Manage tournament">
        <ErrorBlock error={q.error} retry={q.refetch} />
      </PageShell>
    );
  }
  const t = q.data;
  if (!t.canManage) {
    return (
      <PageShell title={t.name}>
        <EmptyState icon="lock" headline="You do not manage this tournament" copy="Only the organizer (or an admin) can edit it." ctaLabel="View public page" ctaTo={`/tournaments/${t.id}`} />
      </PageShell>
    );
  }
  const tabs = TABS.map((x) => (x.key === 'registrations' && t.pending_count ? { ...x, count: t.pending_count } : x.key === 'divisions' ? { ...x, count: t.divisions.length } : x.key === 'courts' ? { ...x, count: t.courts.length } : x));
  const tabsId = 'manage-tabs';

  return (
    <PageShell
      wide
      eyebrow={
        <>
          <TournamentStatusPill status={t.status} />
          <span className="eyebrow">
            {dateRange(t)} · {TOURNAMENT_FORMAT_LABELS[t.format] || t.format}
          </span>
        </>
      }
      title={t.name}
      subtitle="Organizer desk — registrations, divisions, schedule and courts."
      actions={
        <Button to={`/tournaments/${t.id}`} variant="secondary">
          <Icon name="external" size={16} /> View public page
        </Button>
      }
    >
      <Tabs id={tabsId} label="Manage sections" tabs={tabs} value={tab} onChange={setTab} className="mb-5" />
      <TabPanel id={tabsId} value={tab}>
        {tab === 'overview' ? <OverviewTab t={t} /> : null}
        {tab === 'registrations' ? <RegistrationsTab t={t} /> : null}
        {tab === 'divisions' ? <DivisionsTab t={t} /> : null}
        {tab === 'schedule' ? <ScheduleTab t={t} /> : null}
        {tab === 'courts' ? <CourtsTab t={t} /> : null}
      </TabPanel>
    </PageShell>
  );
}
