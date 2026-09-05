import { useState } from 'react';
import Button from '../components/Button.jsx';
import Icon from '../components/ui/Icon.jsx';
import PageShell from '../components/ui/PageShell.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { LoadingBlock } from '../components/ui/Loading.jsx';
import { SectionHeader } from '../components/ui/Section.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useStats, useMatches, useBadges, useLeaderboard } from '../hooks/queries.js';
import DashboardHeader from '../components/dashboard/DashboardHeader.jsx';
import SummaryCards from '../components/dashboard/SummaryCards.jsx';
import PerformanceSection from '../components/dashboard/PerformanceSection.jsx';
import MatchHistory from '../components/dashboard/MatchHistory.jsx';
import SkillStats from '../components/dashboard/SkillStats.jsx';
import RecognitionCenter from '../components/dashboard/RecognitionCenter.jsx';
import LeaderboardWidget from '../components/dashboard/LeaderboardWidget.jsx';
import UpcomingGames from '../components/dashboard/UpcomingGames.jsx';
import RecordMatchModal from '../components/dashboard/RecordMatchModal.jsx';
import ScoredStatsSection from '../components/dashboard/ScoredStatsSection.jsx';

/** Role-aware shortcuts. Everyone can explore tournaments; roles get their own workspace. */
export function quickActionsForRole(role) {
  const actions = [];
  if (role === 'scorer' || role === 'admin') actions.push({ to: '/score', label: 'Open scorer desk', icon: 'whistle', primary: true });
  if (role === 'organizer' || role === 'admin') actions.push({ to: '/tournaments?mine=1', label: 'Manage tournaments', icon: 'trophy', primary: true });
  if (role === 'coach' || role === 'admin') actions.push({ to: '/teams?mine=1', label: 'My teams', icon: 'users', primary: true });
  actions.push({ to: '/tournaments', label: 'Explore tournaments', icon: 'search', primary: actions.length === 0 });
  return actions;
}

function QuickActions({ role }) {
  const actions = quickActionsForRole(role);
  return (
    <nav aria-label="Quick actions" className="flex flex-wrap gap-2" data-testid="quick-actions">
      {actions.map((a) => (
        <Button key={a.to} to={a.to} variant={a.primary ? 'primary' : 'secondary'}>
          <Icon name={a.icon} size={16} />
          {a.label}
        </Button>
      ))}
    </nav>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [recordOpen, setRecordOpen] = useState(false);

  const stats = useStats();
  const matches = useMatches();
  const badges = useBadges();
  const leaderboard = useLeaderboard(user?.community_id ? { community: user.community_id, nearby: 1 } : { nearby: 1 });

  const loading = stats.isLoading || matches.isLoading || badges.isLoading;

  const myEntry = leaderboard.data?.entries?.find((e) => e.isYou);
  const rank = myEntry?.rank;
  const earnedBadges = (badges.data || []).filter((b) => b.earned).length;
  const metrics = stats.data?.metrics;

  const incompleteProfile = user && !user.profile_complete;

  return (
    <PageShell
      headerRight={
        <Button size="sm" variant="secondary" className="hidden sm:inline-flex" onClick={() => setRecordOpen(true)}>
          <Icon name="plus" size={16} /> Record match
        </Button>
      }
      className="space-y-6"
    >
      {user ? <QuickActions role={user.role} /> : null}
      {loading || !metrics ? (
        <LoadingBlock label="Loading your dashboard…" variant="cards" count={4} />
      ) : (
        <>
          <DashboardHeader user={user} rank={rank} movement={myEntry?.movement} />

          {incompleteProfile && <EmptyState icon="edit" headline="Complete your volleyball profile" copy="Add your photo and preferred position to build trust and earn recognition." ctaLabel="Complete profile" ctaTo="/onboarding" compact />}

          <SummaryCards user={user} metrics={metrics} rank={rank} badgeCount={earnedBadges} />

          <ScoredStatsSection userId={user.id} />

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="space-y-6 lg:col-span-2">
              <PerformanceSection stats={stats.data} rank={rank} />
              <section>
                <SectionHeader
                  title="Self-reported matches"
                  action={
                    <Button size="sm" variant="secondary" onClick={() => setRecordOpen(true)}>
                      <Icon name="plus" size={14} /> Add match
                    </Button>
                  }
                />
                <MatchHistory matches={matches.data || []} onRecord={() => setRecordOpen(true)} />
              </section>
              <RecognitionCenter badges={badges.data || []} onRecord={() => setRecordOpen(true)} />
            </div>

            <div className="space-y-6">
              <UpcomingGames />
              <SkillStats metrics={metrics} />
              <LeaderboardWidget entries={leaderboard.data?.entries} />
            </div>
          </div>
        </>
      )}

      <RecordMatchModal open={recordOpen} onClose={() => setRecordOpen(false)} />
    </PageShell>
  );
}
