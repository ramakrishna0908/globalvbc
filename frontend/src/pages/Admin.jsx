import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import PageShell from '../components/ui/PageShell.jsx';
import Tabs from '../components/ui/Tabs.jsx';
import Field, { inputClass } from '../components/ui/Field.jsx';
import { LoadingBlock, ErrorBlock } from '../components/ui/Loading.jsx';
import { useToast } from '../components/ui/ToastProvider.jsx';
import StatCard from '../components/StatCard.jsx';
import EmptyState from '../components/EmptyState.jsx';
import Avatar from '../components/Avatar.jsx';
import { MatchStatusPill } from '../components/tournament/MatchCard.jsx';
import { useAdminOverview, useAdminUsers, useAdminMatches, useAdminAudit, useInvalidate } from '../hooks/queries.js';
import { adminApi } from '../api/endpoints.js';
import { ROLE_LABELS, formatDateTime } from '../lib/format.js';
import { useAuth } from '../context/AuthContext.jsx';

const ROLES = ['player', 'scorer', 'coach', 'organizer', 'admin'];
const TABS = [
  { key: 'users', label: 'Users' },
  { key: 'matches', label: 'Matches' },
  { key: 'audit', label: 'Audit log' },
];

function useDebounced(value, ms = 300) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

/* ---------------------------------------------------------------- Overview */

function Overview() {
  const q = useAdminOverview();
  if (q.isLoading) return <LoadingBlock label="Loading overview…" />;
  if (q.isError) return <ErrorBlock error={q.error} retry={() => q.refetch()} />;
  const d = q.data || {};
  const tiles = [
    ['Users', d.users, 'default'],
    ['Teams', d.teams, 'default'],
    ['Tournaments', d.tournaments, 'default'],
    ['Matches', d.matches, 'blue'],
    ['Live now', d.liveMatches, 'blue'],
    ['Submitted', d.submittedMatches, 'gold'],
    ['Rating events', d.ratingEvents, 'gold'],
    ['Audit entries', d.auditEntries, 'violet'],
  ];
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {tiles.map(([label, value, accent]) => (
        <StatCard key={label} label={label} value={value ?? 0} accent={accent} />
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------- Users */

function UserRow({ u, self }) {
  const { toast } = useToast();
  const invalidate = useInvalidate();
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  async function changeRole(role) {
    if (role === u.role) return;
    setBusy(true);
    try {
      await adminApi.setRole(u.id, role, reason.trim() || undefined);
      toast(`${u.name} is now ${ROLE_LABELS[role] || role}`, { tone: 'success', icon: '🛡️' });
      setReason('');
      invalidate('admin-users', 'admin-audit', 'admin-overview');
    } catch (err) {
      toast(err.response?.data?.error || 'Could not change role', { tone: 'error', duration: 3000 });
    } finally {
      setBusy(false);
    }
  }

  return (
    <tr className="border-t border-border-default align-middle">
      <td className="px-3 py-2">
        <Link to={`/p/${u.id}`} className="flex min-h-[44px] items-center gap-3 hover:text-accent-400">
          <Avatar src={u.photo_url} name={u.name} size="sm" />
          <span>
            <span className="block font-semibold">{u.name}</span>
            <span className="block text-xs text-text-muted">
              #{u.id} · joined {formatDateTime(u.created_at)}
            </span>
          </span>
        </Link>
      </td>
      <td className="px-3 py-2 text-text-secondary">{u.email}</td>
      <td className="px-3 py-2 tabular-nums text-text-secondary">{u.elo ?? '—'}</td>
      <td className="px-3 py-2">
        <label className="sr-only" htmlFor={`role-${u.id}`}>
          Role for {u.name}
        </label>
        <select id={`role-${u.id}`} className={`${inputClass} mt-0 min-w-[130px]`} value={u.role} onChange={(e) => changeRole(e.target.value)} disabled={busy || self}>
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {ROLE_LABELS[r]}
            </option>
          ))}
        </select>
        {self ? <span className="mt-1 block text-[11px] text-text-muted">You cannot change your own role</span> : null}
      </td>
      <td className="px-3 py-2">
        <label className="sr-only" htmlFor={`reason-${u.id}`}>
          Reason for changing {u.name}'s role
        </label>
        <input id={`reason-${u.id}`} className={`${inputClass} mt-0 min-w-[180px]`} placeholder="Reason (optional)" value={reason} onChange={(e) => setReason(e.target.value)} disabled={busy || self} />
      </td>
    </tr>
  );
}

function UsersTab() {
  const { user: me } = useAuth();
  const [search, setSearch] = useState('');
  const q = useDebounced(search);
  const users = useAdminUsers(q);

  return (
    <div>
      <div className="mb-4 max-w-md">
        <Field label="Search users" placeholder="Name or email" value={search} onChange={(e) => setSearch(e.target.value)} type="search" hint="Changing a role is audited. Add a reason so the log explains itself." />
      </div>
      {users.isLoading ? (
        <LoadingBlock label="Loading users…" />
      ) : users.isError ? (
        <ErrorBlock error={users.error} retry={() => users.refetch()} />
      ) : !users.data?.length ? (
        <EmptyState icon="👤" headline="No users found" copy={q ? `Nothing matches “${q}”.` : 'No accounts yet.'} />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border-default">
          <table className="w-full min-w-[820px] text-sm">
            <thead className="bg-bg-surface text-left text-[11px] uppercase tracking-wider text-text-muted">
              <tr>
                <th className="px-3 py-2">User</th>
                <th className="px-3 py-2">Email</th>
                <th className="px-3 py-2">Rating</th>
                <th className="px-3 py-2">Role</th>
                <th className="px-3 py-2">Reason</th>
              </tr>
            </thead>
            <tbody>
              {users.data.map((u) => (
                <UserRow key={u.id} u={u} self={me && Number(me.id) === Number(u.id)} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ----------------------------------------------------------------- Matches */

function MatchesTab() {
  const q = useAdminMatches();
  if (q.isLoading) return <LoadingBlock label="Loading matches…" />;
  if (q.isError) return <ErrorBlock error={q.error} retry={() => q.refetch()} />;
  if (!q.data?.length) return <EmptyState icon="🏐" headline="No matches yet" copy="Matches appear here as soon as a scorer or organizer creates one." />;
  return (
    <div className="overflow-x-auto rounded-xl border border-border-default">
      <table className="w-full min-w-[860px] text-sm">
        <thead className="bg-bg-surface text-left text-[11px] uppercase tracking-wider text-text-muted">
          <tr>
            <th className="px-3 py-2">ID</th>
            <th className="px-3 py-2">Status</th>
            <th className="px-3 py-2">Teams</th>
            <th className="px-3 py-2 text-center">Sets</th>
            <th className="px-3 py-2">Tournament</th>
            <th className="px-3 py-2">Scorer</th>
            <th className="px-3 py-2 text-right">Last seq</th>
            <th className="px-3 py-2">When</th>
            <th className="px-3 py-2 text-right">Open</th>
          </tr>
        </thead>
        <tbody>
          {q.data.map((m) => (
            <tr key={m.id} className="border-t border-border-default">
              <td className="px-3 py-2 font-mono text-text-muted">#{m.id}</td>
              <td className="px-3 py-2">
                <MatchStatusPill status={m.status} />
              </td>
              <td className="px-3 py-2 font-semibold">
                <span className="text-team-a">{m.team_a_name || 'TBD'}</span> <span className="text-text-muted">vs</span> <span className="text-team-b">{m.team_b_name || 'TBD'}</span>
              </td>
              <td className="px-3 py-2 text-center font-mono tabular-nums">
                {m.sets_a ?? 0}–{m.sets_b ?? 0}
              </td>
              <td className="px-3 py-2 text-text-secondary">{m.tournament_name || '—'}</td>
              <td className="px-3 py-2 text-text-secondary">{m.scorer_name || '—'}</td>
              <td className="px-3 py-2 text-right font-mono tabular-nums text-text-secondary">{m.last_seq ?? 0}</td>
              <td className="px-3 py-2 text-text-muted">{formatDateTime(m.submitted_at || m.scheduled_at) || '—'}</td>
              <td className="px-3 py-2">
                <div className="flex justify-end gap-1">
                  <Link to={`/matches/${m.id}`} className="inline-flex min-h-[40px] items-center rounded-lg border border-border-strong px-3 font-semibold hover:bg-bg-elevated">
                    View
                  </Link>
                  {m.status !== 'submitted' && m.status !== 'cancelled' ? (
                    <Link to={`/score/${m.id}`} className="inline-flex min-h-[40px] items-center rounded-lg bg-accent-500 px-3 font-semibold text-white hover:bg-accent-400">
                      Score
                    </Link>
                  ) : null}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ------------------------------------------------------------------- Audit */

const ENTITY_SUGGESTIONS = ['user', 'match', 'tournament', 'team', 'registration', 'rating'];

function AuditRow({ e }) {
  const [open, setOpen] = useState(false);
  const hasDiff = e.before != null || e.after != null;
  return (
    <>
      <tr className="border-t border-border-default">
        <td className="whitespace-nowrap px-3 py-2 text-text-muted">{formatDateTime(e.created_at)}</td>
        <td className="px-3 py-2">{e.actor_name || <span className="text-text-muted">system</span>}</td>
        <td className="px-3 py-2 font-mono text-xs">
          {e.entity}
          <span className="text-text-muted">/</span>
          {e.entity_id}
        </td>
        <td className="px-3 py-2">
          <span className="rounded-md bg-bg-elevated px-2 py-0.5 font-mono text-xs font-semibold">{e.action}</span>
        </td>
        <td className="max-w-[260px] truncate px-3 py-2 text-text-secondary" title={e.reason || ''}>
          {e.reason || '—'}
        </td>
        <td className="px-3 py-2 text-right">
          {hasDiff ? (
            <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className="min-h-[40px] rounded-lg border border-border-strong px-3 text-xs font-semibold hover:bg-bg-elevated">
              {open ? 'Hide' : 'Diff'}
            </button>
          ) : null}
        </td>
      </tr>
      {open ? (
        <tr className="border-t border-border-default bg-bg-surface">
          <td colSpan={6} className="px-3 py-3">
            <div className="grid gap-3 md:grid-cols-2">
              {[
                ['Before', e.before],
                ['After', e.after],
              ].map(([label, value]) => (
                <div key={label}>
                  <div className="mb-1 text-[11px] font-black uppercase tracking-wider text-text-muted">{label}</div>
                  <pre className="max-h-64 overflow-auto rounded-lg border border-border-default bg-bg-page p-3 font-mono text-xs text-text-secondary">{value == null ? 'null' : JSON.stringify(value, null, 2)}</pre>
                </div>
              ))}
            </div>
          </td>
        </tr>
      ) : null}
    </>
  );
}

function AuditTab() {
  const [entity, setEntity] = useState('');
  const [entityId, setEntityId] = useState('');
  const [limit, setLimit] = useState('50');
  const dEntity = useDebounced(entity);
  const dEntityId = useDebounced(entityId);
  const params = { limit };
  if (dEntity) params.entity = dEntity;
  if (dEntityId) params.entityId = dEntityId;
  const q = useAdminAudit(params);

  return (
    <div>
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Field label="Entity" list="audit-entities" placeholder="user, match…" value={entity} onChange={(e) => setEntity(e.target.value)} />
        <datalist id="audit-entities">
          {ENTITY_SUGGESTIONS.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
        <Field label="Entity ID" placeholder="e.g. 42" value={entityId} onChange={(e) => setEntityId(e.target.value)} />
        <Field as="select" label="Limit" value={limit} onChange={(e) => setLimit(e.target.value)}>
          {['25', '50', '100', '200'].map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </Field>
      </div>
      {q.isLoading ? (
        <LoadingBlock label="Loading audit log…" />
      ) : q.isError ? (
        <ErrorBlock error={q.error} retry={() => q.refetch()} />
      ) : !q.data?.length ? (
        <EmptyState icon="🧾" headline="No audit entries" copy="Scoring, rating and admin changes are recorded here with before/after state." />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border-default">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-bg-surface text-left text-[11px] uppercase tracking-wider text-text-muted">
              <tr>
                <th className="px-3 py-2">Time</th>
                <th className="px-3 py-2">Actor</th>
                <th className="px-3 py-2">Entity</th>
                <th className="px-3 py-2">Action</th>
                <th className="px-3 py-2">Reason</th>
                <th className="px-3 py-2 text-right">Before / after</th>
              </tr>
            </thead>
            <tbody>
              {q.data.map((e) => (
                <AuditRow key={e.id} e={e} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------- Page */

export default function Admin() {
  const [tab, setTab] = useState('users');
  return (
    <PageShell title="Admin" subtitle="Platform overview, roles and the audit trail." wide>
      <Overview />
      <Tabs tabs={TABS} value={tab} onChange={setTab} className="mb-5 mt-8" />
      {tab === 'users' ? <UsersTab /> : tab === 'matches' ? <MatchesTab /> : <AuditTab />}
    </PageShell>
  );
}
