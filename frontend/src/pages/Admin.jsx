import { useState } from 'react';
import { Link } from 'react-router-dom';
import PageShell from '../components/ui/PageShell.jsx';
import Tabs, { TabPanel } from '../components/ui/Tabs.jsx';
import Field, { inputClass } from '../components/ui/Field.jsx';
import Button from '../components/Button.jsx';
import Icon from '../components/ui/Icon.jsx';
import { Table, TableWrap, Th, Td } from '../components/ui/Table.jsx';
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
import { useDebounced } from './tournaments/tournamentUi.jsx';

const ROLES = ['player', 'scorer', 'coach', 'organizer', 'admin'];
const TABS = [
  { key: 'users', label: 'Users' },
  { key: 'matches', label: 'Matches' },
  { key: 'audit', label: 'Audit log' },
];

/* ---------------------------------------------------------------- Overview */

function Overview() {
  const q = useAdminOverview();
  if (q.isLoading) return <LoadingBlock label="Loading overview…" variant="cards" count={4} />;
  if (q.isError) return <ErrorBlock error={q.error} retry={() => q.refetch()} />;
  const d = q.data || {};
  const tiles = [
    ['Users', d.users, 'default'],
    ['Teams', d.teams, 'default'],
    ['Tournaments', d.tournaments, 'default'],
    ['Matches', d.matches, 'blue'],
    ['Live now', d.liveMatches, d.liveMatches ? 'live' : 'default'],
    ['Submitted', d.submittedMatches, 'gold'],
    ['Rating events', d.ratingEvents, 'gold'],
    ['Audit entries', d.auditEntries, 'default'],
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
      toast(`${u.name} is now ${ROLE_LABELS[role] || role}`, { tone: 'success' });
      setReason('');
      invalidate('admin-users', 'admin-audit', 'admin-overview');
    } catch (err) {
      toast(err.response?.data?.error || 'Could not change role', { tone: 'error', duration: 3000 });
    } finally {
      setBusy(false);
    }
  }

  return (
    <tr>
      <Td sticky>
        <Link to={`/p/${u.id}`} className="flex min-h-11 items-center gap-3 hover:text-accent-400">
          <Avatar src={u.photo_url} name={u.name} size="sm" />
          <span className="min-w-0">
            <span className="block truncate font-semibold">{u.name}</span>
            <span className="block text-xs text-text-muted">
              #{u.id} · joined {formatDateTime(u.created_at)}
            </span>
          </span>
        </Link>
      </Td>
      <Td muted>{u.email}</Td>
      <Td num muted>
        {u.elo ?? '—'}
      </Td>
      <Td>
        <label className="sr-only" htmlFor={`role-${u.id}`}>
          Role for {u.name}
        </label>
        <select id={`role-${u.id}`} className={`${inputClass} min-w-[130px]`} value={u.role} onChange={(e) => changeRole(e.target.value)} disabled={busy || self}>
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {ROLE_LABELS[r]}
            </option>
          ))}
        </select>
        {self ? <span className="mt-1 block text-2xs text-text-muted">You cannot change your own role</span> : null}
      </Td>
      <Td>
        <label className="sr-only" htmlFor={`reason-${u.id}`}>
          Reason for changing {u.name}'s role
        </label>
        <input id={`reason-${u.id}`} className={`${inputClass} min-w-[180px]`} placeholder="Reason (optional)" value={reason} onChange={(e) => setReason(e.target.value)} disabled={busy || self} />
      </Td>
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
        <LoadingBlock label="Loading users…" variant="table" />
      ) : users.isError ? (
        <ErrorBlock error={users.error} retry={() => users.refetch()} />
      ) : !users.data?.length ? (
        <EmptyState icon="users" headline="No users found" copy={q ? `Nothing matches “${q}”.` : 'No accounts yet.'} />
      ) : (
        <TableWrap>
          <Table caption="Users and roles" minWidth={820}>
            <thead>
              <tr>
                <Th sticky>User</Th>
                <Th>Email</Th>
                <Th num>Rating</Th>
                <Th>Role</Th>
                <Th>Reason</Th>
              </tr>
            </thead>
            <tbody>
              {users.data.map((u) => (
                <UserRow key={u.id} u={u} self={me && Number(me.id) === Number(u.id)} />
              ))}
            </tbody>
          </Table>
        </TableWrap>
      )}
    </div>
  );
}

/* ----------------------------------------------------------------- Matches */

function MatchesTab() {
  const q = useAdminMatches();
  if (q.isLoading) return <LoadingBlock label="Loading matches…" variant="table" />;
  if (q.isError) return <ErrorBlock error={q.error} retry={() => q.refetch()} />;
  if (!q.data?.length) return <EmptyState icon="ball" headline="No matches yet" copy="Matches appear here as soon as a scorer or organizer creates one." />;
  return (
    <TableWrap>
      <Table caption="All matches" minWidth={880}>
        <thead>
          <tr>
            <Th>ID</Th>
            <Th>Status</Th>
            <Th sticky>Teams</Th>
            <Th num>Sets</Th>
            <Th>Tournament</Th>
            <Th>Scorer</Th>
            <Th num>Last seq</Th>
            <Th>When</Th>
            <Th className="text-right">Open</Th>
          </tr>
        </thead>
        <tbody>
          {q.data.map((m) => (
            <tr key={m.id}>
              <Td className="font-mono text-text-muted">#{m.id}</Td>
              <Td>
                <MatchStatusPill status={m.status} />
              </Td>
              <Td sticky className="font-display text-base font-bold uppercase tracking-wide">
                <span className="text-team-a">{m.team_a_name || 'TBD'}</span> <span className="text-xs text-text-muted">vs</span> <span className="text-team-b">{m.team_b_name || 'TBD'}</span>
              </Td>
              <Td num className="font-display text-base font-bold">
                {m.sets_a ?? 0}–{m.sets_b ?? 0}
              </Td>
              <Td muted>{m.tournament_name || '—'}</Td>
              <Td muted>{m.scorer_name || '—'}</Td>
              <Td num muted className="font-mono">
                {m.last_seq ?? 0}
              </Td>
              <Td className="text-text-muted">{formatDateTime(m.submitted_at || m.scheduled_at) || '—'}</Td>
              <Td>
                <div className="flex justify-end gap-1">
                  <Button to={`/matches/${m.id}`} size="sm" variant="secondary">
                    View
                  </Button>
                  {m.status !== 'submitted' && m.status !== 'cancelled' ? (
                    <Button to={`/score/${m.id}`} size="sm">
                      Score
                    </Button>
                  ) : null}
                </div>
              </Td>
            </tr>
          ))}
        </tbody>
      </Table>
    </TableWrap>
  );
}

/* ------------------------------------------------------------------- Audit */

const ENTITY_SUGGESTIONS = ['user', 'match', 'tournament', 'team', 'registration', 'rating'];

function AuditRow({ e }) {
  const [open, setOpen] = useState(false);
  const hasDiff = e.before != null || e.after != null;
  return (
    <>
      <tr>
        <Td className="whitespace-nowrap text-text-muted">{formatDateTime(e.created_at)}</Td>
        <Td>{e.actor_name || <span className="text-text-muted">system</span>}</Td>
        <Td className="font-mono text-xs">
          {e.entity}
          <span className="text-text-muted">/</span>
          {e.entity_id}
        </Td>
        <Td>
          <span className="rounded-md bg-bg-elevated px-2 py-0.5 font-mono text-xs font-semibold">{e.action}</span>
        </Td>
        <Td muted className="max-w-[260px] truncate" title={e.reason || ''}>
          {e.reason || '—'}
        </Td>
        <Td className="text-right">
          {hasDiff ? (
            <Button size="sm" variant="secondary" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
              {open ? 'Hide' : 'Diff'}
            </Button>
          ) : null}
        </Td>
      </tr>
      {open ? (
        <tr className="bg-bg-surface">
          <td colSpan={6} className="px-3 py-3">
            <div className="grid gap-3 md:grid-cols-2">
              {[
                ['Before', e.before],
                ['After', e.after],
              ].map(([label, value]) => (
                <div key={label}>
                  <div className="eyebrow mb-1">{label}</div>
                  <pre className="max-h-64 overflow-auto rounded-md border border-border-default bg-bg-page p-3 font-mono text-xs text-text-secondary">{value == null ? 'null' : JSON.stringify(value, null, 2)}</pre>
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
        <LoadingBlock label="Loading audit log…" variant="table" />
      ) : q.isError ? (
        <ErrorBlock error={q.error} retry={() => q.refetch()} />
      ) : !q.data?.length ? (
        <EmptyState icon="shield" headline="No audit entries" copy="Scoring, rating and admin changes are recorded here with before/after state." />
      ) : (
        <TableWrap>
          <Table caption="Audit log" minWidth={760}>
            <thead>
              <tr>
                <Th>Time</Th>
                <Th>Actor</Th>
                <Th>Entity</Th>
                <Th>Action</Th>
                <Th>Reason</Th>
                <Th className="text-right">Before / after</Th>
              </tr>
            </thead>
            <tbody>
              {q.data.map((e) => (
                <AuditRow key={e.id} e={e} />
              ))}
            </tbody>
          </Table>
        </TableWrap>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------- Page */

export default function Admin() {
  const [tab, setTab] = useState('users');
  const tabsId = 'admin-tabs';
  return (
    <PageShell
      title="Admin"
      subtitle="Platform overview, roles and the audit trail."
      wide
      eyebrow={
        <span className="eyebrow inline-flex items-center gap-1.5">
          <Icon name="shield" size={14} /> Platform administration
        </span>
      }
    >
      <Overview />
      <Tabs id={tabsId} label="Admin sections" tabs={TABS} value={tab} onChange={setTab} className="mb-5 mt-8" />
      <TabPanel id={tabsId} value={tab}>
        {tab === 'users' ? <UsersTab /> : tab === 'matches' ? <MatchesTab /> : <AuditTab />}
      </TabPanel>
    </PageShell>
  );
}
