import { useState } from 'react';
import { Link } from 'react-router-dom';
import AppHeader from '../components/AppHeader.jsx';
import Button from '../components/Button.jsx';
import EmptyState from '../components/EmptyState.jsx';
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

export default function Dashboard() {
  const { user } = useAuth();
  const [recordOpen, setRecordOpen] = useState(false);

  const stats = useStats();
  const matches = useMatches();
  const badges = useBadges();
  const leaderboard = useLeaderboard(
    user?.community_id ? { community: user.community_id, nearby: 1 } : { nearby: 1 }
  );

  const loading = stats.isLoading || matches.isLoading || badges.isLoading;

  const myEntry = leaderboard.data?.entries?.find((e) => e.isYou);
  const rank = myEntry?.rank;
  const earnedBadges = (badges.data || []).filter((b) => b.earned).length;
  const metrics = stats.data?.metrics;

  const incompleteProfile = user && !user.profile_complete;

  return (
    <>
      <AppHeader
        right={<Button size="sm" onClick={() => setRecordOpen(true)}>+ Record Match</Button>}
      />
      <main className="mx-auto max-w-6xl space-y-6 px-4 py-8">
        {loading || !metrics ? (
          <div className="py-20 text-center text-text-muted">Loading your dashboard…</div>
        ) : (
          <>
            <DashboardHeader user={user} rank={rank} movement={myEntry?.movement} />

            {incompleteProfile && (
              <EmptyState
                icon="📸"
                headline="Complete Your Volleyball Profile"
                copy="Add your photo and preferred position to build trust and earn recognition."
                ctaLabel="Complete Profile"
                onCta={() => (window.location.href = '/onboarding')}
              />
            )}

            <SummaryCards user={user} metrics={metrics} rank={rank} badgeCount={earnedBadges} />

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <div className="space-y-6 lg:col-span-2">
                <PerformanceSection stats={stats.data} rank={rank} />
                <section>
                  <div className="mb-3 flex items-center justify-between">
                    <h2 className="font-display text-xl font-bold">Match History</h2>
                    <Button size="sm" variant="secondary" onClick={() => setRecordOpen(true)}>
                      + Add Match
                    </Button>
                  </div>
                  <MatchHistory matches={matches.data || []} onRecord={() => setRecordOpen(true)} />
                </section>
                <RecognitionCenter badges={badges.data || []} onRecord={() => setRecordOpen(true)} />
              </div>

              <div className="space-y-6">
                <SkillStats metrics={metrics} />
                <LeaderboardWidget entries={leaderboard.data?.entries} />
                <UpcomingGames />
                <p className="text-center text-sm text-text-muted">
                  <Link to="/" className="hover:text-text-primary">
                    ← Back to home
                  </Link>
                </p>
              </div>
            </div>
          </>
        )}
      </main>

      <RecordMatchModal open={recordOpen} onClose={() => setRecordOpen(false)} />
    </>
  );
}
