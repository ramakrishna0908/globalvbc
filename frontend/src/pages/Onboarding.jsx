import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppHeader from '../components/AppHeader.jsx';
import Card from '../components/Card.jsx';
import Button from '../components/Button.jsx';
import Field from '../components/ui/Field.jsx';
import Icon from '../components/ui/Icon.jsx';
import RatingBadge from '../components/RatingBadge.jsx';
import LeaderboardWidget from '../components/dashboard/LeaderboardWidget.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useCommunities, useUpdateProfile, useRecordMatch, useLeaderboard } from '../hooks/queries.js';
import { POSITION_LABELS, ROLE_LABELS } from '../lib/format.js';

const STEPS = ['Profile', 'Position', 'First match', 'Rating', 'Rankings', 'Share'];
/** Roles a user may pick for themselves (admin is granted by an admin). */
const SELF_SERVICE_ROLES = ['player', 'scorer', 'coach', 'organizer'];
const ROLE_HELP = {
  scorer: 'Scorers run the live scoring panel for matches.',
  coach: 'Coaches manage teams and rosters.',
  organizer: 'Organizers create tournaments and schedules.',
  player: 'Players build a rating from officially scored matches.',
};

function Stepper({ step }) {
  return (
    <ol className="mb-6 flex items-center justify-center gap-1.5" aria-label="Onboarding progress">
      {STEPS.map((label, i) => {
        const done = i < step;
        const current = i === step;
        return (
          <li key={label} className="flex items-center gap-1.5">
            <span
              className={`flex h-8 w-8 items-center justify-center rounded-full font-display text-sm font-bold ${current ? 'bg-accent-500 text-white ring-4 ring-accent-500/25' : done ? 'bg-status-success/20 text-status-success' : 'bg-bg-elevated text-text-muted'}`}
              aria-current={current ? 'step' : undefined}
              aria-label={`Step ${i + 1}: ${label}${done ? ' (done)' : current ? ' (current)' : ''}`}
            >
              {done ? <Icon name="check" size={14} /> : i + 1}
            </span>
            {i < STEPS.length - 1 ? <span className={`h-0.5 w-4 rounded-full sm:w-6 ${i < step ? 'bg-status-success' : 'bg-bg-elevated'}`} aria-hidden="true" /> : null}
          </li>
        );
      })}
    </ol>
  );
}

function StepTitle({ children, copy }) {
  return (
    <>
      <p className="eyebrow">Step {STEPS.indexOf(children) + 1 || ''}</p>
      <h1 className="mt-1 font-display text-display-sm font-bold uppercase">{children}</h1>
      {copy ? <p className="mt-1 text-text-secondary">{copy}</p> : null}
    </>
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
    role: SELF_SERVICE_ROLES.includes(user?.role) ? user.role : 'player',
    jersey_number: user?.jersey_number ?? '',
  });
  const [position, setPosition] = useState(user?.position || '');
  const [match, setMatch] = useState({ opponent_name: '', result: 'won', score_for: 21, score_against: 18 });
  const [rating, setRating] = useState(null);

  const leaderboard = useLeaderboard(user?.community_id ? { community: user.community_id, nearby: 1 } : { nearby: 1 });

  const next = () => setStep((s) => Math.min(s + 1, STEPS.length - 1));

  async function saveProfile() {
    const updated = await updateProfile.mutateAsync({
      name: profile.name,
      photo_url: profile.photo_url || null,
      community_id: profile.community_id ? Number(profile.community_id) : null,
      // Admins keep their role; everyone else can pick a self-service role.
      ...(user?.role === 'admin' ? {} : { role: profile.role }),
      jersey_number: profile.jersey_number === '' || profile.jersey_number == null ? null : Number(profile.jersey_number),
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
      <main id="main" className="mx-auto max-w-xl px-4 py-8 md:py-10">
        <Stepper step={step} />
        <Card className="p-6 md:p-8">
          {step === 0 && (
            <div>
              <StepTitle copy="Tell the community who you are.">Profile</StepTitle>
              <div className="mt-6 space-y-4">
                <Field label="Name" value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} autoComplete="name" required />
                <Field label="Photo URL (optional)" type="url" placeholder="https://…" value={profile.photo_url} onChange={(e) => setProfile({ ...profile, photo_url: e.target.value })} />
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field as="select" label="I am a…" value={profile.role} onChange={(e) => setProfile({ ...profile, role: e.target.value })} disabled={user?.role === 'admin'} data-testid="role-select" hint={ROLE_HELP[profile.role]}>
                    {SELF_SERVICE_ROLES.map((r) => (
                      <option key={r} value={r}>
                        {ROLE_LABELS[r]}
                      </option>
                    ))}
                  </Field>
                  <Field label="Jersey number (optional)" type="number" inputMode="numeric" min="0" max="99" placeholder="e.g. 7" value={profile.jersey_number} onChange={(e) => setProfile({ ...profile, jersey_number: e.target.value })} data-testid="jersey-input" />
                </div>
                <Field as="select" label="Community" value={profile.community_id} onChange={(e) => setProfile({ ...profile, community_id: e.target.value })}>
                  <option value="">Select a community…</option>
                  {(communities.data || []).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} · {c.city}
                    </option>
                  ))}
                </Field>
              </div>
              <Button className="mt-6" full size="lg" onClick={saveProfile} disabled={updateProfile.isPending}>
                Continue <Icon name="arrowRight" size={18} />
              </Button>
            </div>
          )}

          {step === 1 && (
            <div>
              <StepTitle copy="What do you play?">Position</StepTitle>
              <div className="mt-6 grid grid-cols-2 gap-3" role="group" aria-label="Position">
                {Object.entries(POSITION_LABELS).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setPosition(key)}
                    aria-pressed={position === key}
                    className={`min-h-14 rounded-lg border-2 p-4 text-left font-display text-lg font-bold uppercase tracking-wide transition-colors ${position === key ? 'border-accent-500 bg-accent-500/10 text-text-primary' : 'border-border-default text-text-secondary hover:border-border-strong'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <Button className="mt-6" full size="lg" onClick={savePosition} disabled={!position || updateProfile.isPending}>
                Continue <Icon name="arrowRight" size={18} />
              </Button>
            </div>
          )}

          {step === 2 && (
            <div>
              <StepTitle copy="This sets your initial self-reported rating.">First match</StepTitle>
              <div className="mt-6 space-y-4">
                <Field label="Opponent" value={match.opponent_name} onChange={(e) => setMatch({ ...match, opponent_name: e.target.value })} required />
                <Field as="select" label="Result" value={match.result} onChange={(e) => setMatch({ ...match, result: e.target.value })}>
                  <option value="won">Won</option>
                  <option value="lost">Lost</option>
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Your score" type="number" inputMode="numeric" value={match.score_for} onChange={(e) => setMatch({ ...match, score_for: e.target.value })} />
                  <Field label="Opponent score" type="number" inputMode="numeric" value={match.score_against} onChange={(e) => setMatch({ ...match, score_against: e.target.value })} />
                </div>
              </div>
              <Button className="mt-6" full size="lg" onClick={saveMatch} disabled={!match.opponent_name || recordMatch.isPending}>
                {recordMatch.isPending ? 'Calculating…' : 'Get my rating'}
              </Button>
            </div>
          )}

          {step === 3 && (
            <div className="text-center">
              <StepTitle>Rating</StepTitle>
              <div className="mt-6 flex justify-center">
                <RatingBadge score={rating?.ratingScoreAfter ?? 0} size="lg" />
              </div>
              <p className="mt-4 text-text-secondary">
                You're on the board with a rating of <span className="font-display text-lg font-bold text-brand-400">{Number(rating?.ratingScoreAfter ?? 0).toFixed(1)}</span>.
              </p>
              {rating?.newBadges?.length ? (
                <ul className="mt-4 flex flex-wrap justify-center gap-2" aria-label="New badges">
                  {rating.newBadges.map((b) => (
                    <li key={b.key} className="rounded-full border border-brand-500/40 bg-brand-500/10 px-3 py-1 text-sm font-semibold text-brand-400">
                      {b.icon} {b.name} unlocked!
                    </li>
                  ))}
                </ul>
              ) : null}
              <Button className="mt-6" full size="lg" onClick={next}>
                Explore rankings <Icon name="arrowRight" size={18} />
              </Button>
            </div>
          )}

          {step === 4 && (
            <div>
              <StepTitle copy="See where you stand.">Rankings</StepTitle>
              <div className="mt-6">
                <LeaderboardWidget entries={leaderboard.data?.entries} />
              </div>
              <Button className="mt-6" full size="lg" onClick={next}>
                Continue <Icon name="arrowRight" size={18} />
              </Button>
            </div>
          )}

          {step === 5 && (
            <div className="text-center">
              <StepTitle copy="Your volleyball identity is ready. Show it off!">Share</StepTitle>
              <div className="mt-6 flex flex-col gap-3">
                <Button size="lg" onClick={() => navigate(`/p/${user.id}`)}>
                  <Icon name="share" size={18} /> View &amp; share profile
                </Button>
                <Button size="lg" variant="secondary" onClick={() => navigate('/dashboard')}>
                  Go to dashboard
                </Button>
              </div>
            </div>
          )}
        </Card>
      </main>
    </>
  );
}
