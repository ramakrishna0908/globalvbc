import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppHeader from '../components/AppHeader.jsx';
import Card from '../components/Card.jsx';
import Button from '../components/Button.jsx';
import RatingBadge from '../components/RatingBadge.jsx';
import LeaderboardWidget from '../components/dashboard/LeaderboardWidget.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useCommunities, useUpdateProfile, useRecordMatch, useLeaderboard } from '../hooks/queries.js';
import { POSITION_LABELS } from '../lib/format.js';

const STEPS = ['Profile', 'Position', 'First Match', 'Rating', 'Rankings', 'Share'];
const field =
  'mt-1 w-full rounded-lg border border-border-default bg-bg-surface px-3 py-2 text-text-primary focus:border-accent-500';

function StepDots({ step }) {
  return (
    <div className="mb-6 flex items-center justify-center gap-2">
      {STEPS.map((label, i) => (
        <div key={label} className="flex items-center gap-2">
          <div
            className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
              i <= step ? 'bg-accent-500 text-white' : 'bg-bg-elevated text-text-muted'
            }`}
          >
            {i + 1}
          </div>
          {i < STEPS.length - 1 && (
            <div className={`h-0.5 w-4 ${i < step ? 'bg-accent-500' : 'bg-bg-elevated'}`} />
          )}
        </div>
      ))}
    </div>
  );
}

export default function Onboarding() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const communities = useCommunities();
  const updateProfile = useUpdateProfile();
  const recordMatch = useRecordMatch();

  const [profile, setProfile] = useState({
    name: user?.name || '',
    photo_url: user?.photo_url || '',
    community_id: user?.community_id || '',
  });
  const [position, setPosition] = useState(user?.position || '');
  const [match, setMatch] = useState({
    opponent_name: '',
    result: 'won',
    score_for: 21,
    score_against: 18,
  });
  const [rating, setRating] = useState(null);

  const leaderboard = useLeaderboard(
    user?.community_id ? { community: user.community_id, nearby: 1 } : { nearby: 1 }
  );

  const next = () => setStep((s) => Math.min(s + 1, STEPS.length - 1));

  async function saveProfile() {
    const updated = await updateProfile.mutateAsync({
      name: profile.name,
      photo_url: profile.photo_url || null,
      community_id: profile.community_id ? Number(profile.community_id) : null,
    });
    setUser(updated);
    next();
  }

  async function savePosition() {
    const updated = await updateProfile.mutateAsync({ position });
    setUser(updated);
    next();
  }

  async function saveMatch() {
    const res = await recordMatch.mutateAsync({
      ...match,
      score_for: Number(match.score_for),
      score_against: Number(match.score_against),
    });
    setRating(res);
    next();
  }

  return (
    <>
      <AppHeader />
      <main className="mx-auto max-w-xl px-4 py-10">
        <StepDots step={step} />
        <Card className="p-8">
          {step === 0 && (
            <div>
              <h1 className="font-display text-2xl font-bold">Create Your Profile</h1>
              <p className="mt-1 text-text-secondary">Tell the community who you are.</p>
              <div className="mt-6 space-y-4">
                <label className="block text-sm">
                  <span className="text-text-secondary">Name</span>
                  <input
                    className={field}
                    value={profile.name}
                    onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                  />
                </label>
                <label className="block text-sm">
                  <span className="text-text-secondary">Photo URL (optional)</span>
                  <input
                    className={field}
                    placeholder="https://…"
                    value={profile.photo_url}
                    onChange={(e) => setProfile({ ...profile, photo_url: e.target.value })}
                  />
                </label>
                <label className="block text-sm">
                  <span className="text-text-secondary">Community</span>
                  <select
                    className={field}
                    value={profile.community_id}
                    onChange={(e) => setProfile({ ...profile, community_id: e.target.value })}
                  >
                    <option value="">Select a community…</option>
                    {(communities.data || []).map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} · {c.city}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <Button className="mt-6 w-full" onClick={saveProfile} disabled={updateProfile.isPending}>
                Continue
              </Button>
            </div>
          )}

          {step === 1 && (
            <div>
              <h1 className="font-display text-2xl font-bold">Select Your Position</h1>
              <p className="mt-1 text-text-secondary">What do you play?</p>
              <div className="mt-6 grid grid-cols-2 gap-3">
                {Object.entries(POSITION_LABELS).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setPosition(key)}
                    className={`rounded-xl border p-4 text-left font-semibold transition-colors ${
                      position === key
                        ? 'border-accent-500 bg-accent-500/10 text-text-primary'
                        : 'border-border-default text-text-secondary hover:border-border-strong'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <Button
                className="mt-6 w-full"
                onClick={savePosition}
                disabled={!position || updateProfile.isPending}
              >
                Continue
              </Button>
            </div>
          )}

          {step === 2 && (
            <div>
              <h1 className="font-display text-2xl font-bold">Add Your First Match</h1>
              <p className="mt-1 text-text-secondary">This sets your initial rating.</p>
              <div className="mt-6 space-y-4">
                <label className="block text-sm">
                  <span className="text-text-secondary">Opponent</span>
                  <input
                    className={field}
                    value={match.opponent_name}
                    onChange={(e) => setMatch({ ...match, opponent_name: e.target.value })}
                  />
                </label>
                <label className="block text-sm">
                  <span className="text-text-secondary">Result</span>
                  <select
                    className={field}
                    value={match.result}
                    onChange={(e) => setMatch({ ...match, result: e.target.value })}
                  >
                    <option value="won">Won</option>
                    <option value="lost">Lost</option>
                  </select>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label className="block text-sm">
                    <span className="text-text-secondary">Your Score</span>
                    <input
                      type="number"
                      className={field}
                      value={match.score_for}
                      onChange={(e) => setMatch({ ...match, score_for: e.target.value })}
                    />
                  </label>
                  <label className="block text-sm">
                    <span className="text-text-secondary">Opponent Score</span>
                    <input
                      type="number"
                      className={field}
                      value={match.score_against}
                      onChange={(e) => setMatch({ ...match, score_against: e.target.value })}
                    />
                  </label>
                </div>
              </div>
              <Button
                className="mt-6 w-full"
                onClick={saveMatch}
                disabled={!match.opponent_name || recordMatch.isPending}
              >
                {recordMatch.isPending ? 'Calculating…' : 'Get My Rating'}
              </Button>
            </div>
          )}

          {step === 3 && (
            <div className="text-center">
              <h1 className="font-display text-2xl font-bold">Your Initial Rating</h1>
              <div className="mt-6 flex justify-center">
                <RatingBadge score={rating?.ratingScoreAfter ?? 0} size="lg" />
              </div>
              <p className="mt-4 text-text-secondary">
                You're on the board with a rating of{' '}
                <span className="font-bold text-brand-400">
                  {Number(rating?.ratingScoreAfter ?? 0).toFixed(1)}
                </span>
                .
              </p>
              {rating?.newBadges?.length ? (
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  {rating.newBadges.map((b) => (
                    <span
                      key={b.key}
                      className="rounded-full bg-brand-500/15 px-3 py-1 text-sm font-medium text-brand-300"
                    >
                      {b.icon} {b.name} unlocked!
                    </span>
                  ))}
                </div>
              ) : null}
              <Button className="mt-6 w-full" onClick={next}>
                Explore Rankings
              </Button>
            </div>
          )}

          {step === 4 && (
            <div>
              <h1 className="font-display text-2xl font-bold">Your Local Rankings</h1>
              <p className="mt-1 text-text-secondary">See where you stand.</p>
              <div className="mt-6">
                <LeaderboardWidget entries={leaderboard.data?.entries} />
              </div>
              <Button className="mt-6 w-full" onClick={next}>
                Continue
              </Button>
            </div>
          )}

          {step === 5 && (
            <div className="text-center">
              <h1 className="font-display text-2xl font-bold">Share Your Profile</h1>
              <p className="mt-1 text-text-secondary">
                Your volleyball identity is ready. Show it off!
              </p>
              <div className="mt-6 flex flex-col gap-3">
                <Button onClick={() => navigate(`/p/${user.id}`)}>View &amp; Share Profile</Button>
                <Button variant="secondary" onClick={() => navigate('/dashboard')}>
                  Go to Dashboard
                </Button>
              </div>
            </div>
          )}
        </Card>
      </main>
    </>
  );
}
