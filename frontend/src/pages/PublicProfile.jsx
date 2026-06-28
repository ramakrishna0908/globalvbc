import { useParams, Link } from 'react-router-dom';
import AppHeader from '../components/AppHeader.jsx';
import Card from '../components/Card.jsx';
import Button from '../components/Button.jsx';
import Avatar from '../components/Avatar.jsx';
import RatingBadge from '../components/RatingBadge.jsx';
import RankPill from '../components/RankPill.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { usePublicProfile } from '../hooks/queries.js';
import { positionLabel } from '../lib/format.js';

function ShareCard({ profile }) {
  const url = `${window.location.origin}/p/${profile.id}`;
  const qr = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&bgcolor=255-255-255&data=${encodeURIComponent(
    url
  )}`;

  async function share() {
    const data = {
      title: `${profile.name} on GlobalVBC`,
      text: `Check out ${profile.name}'s volleyball profile — rating ${Number(
        profile.rating_score
      ).toFixed(1)}.`,
      url,
    };
    try {
      if (navigator.share) await navigator.share(data);
      else {
        await navigator.clipboard.writeText(url);
        alert('Profile link copied to clipboard!');
      }
    } catch {
      /* user cancelled */
    }
  }

  return (
    <Card className="overflow-hidden">
      <div className="bg-gradient-to-br from-accent-600 to-violet-600 p-6 text-white">
        <div className="flex items-center gap-4">
          <Avatar src={profile.photo_url} name={profile.name} size="lg" />
          <div className="flex-1">
            <h1 className="font-display text-2xl font-bold">{profile.name}</h1>
            <p className="opacity-90">{positionLabel(profile.position)}</p>
            <div className="mt-2">
              <RankPill rank={profile.rank} movement="same" />
            </div>
          </div>
          <RatingBadge score={profile.rating_score} size="lg" />
        </div>
      </div>

      <div className="grid grid-cols-3 divide-x divide-border-default border-b border-border-default text-center">
        {[
          [Number(profile.rating_score).toFixed(1), 'Rating'],
          [`${profile.win_rate}%`, 'Win Rate'],
          [profile.matches_played, 'Matches'],
        ].map(([v, l]) => (
          <div key={l} className="p-4">
            <div className="font-display text-xl font-bold text-brand-400">{v}</div>
            <div className="text-xs text-text-muted">{l}</div>
          </div>
        ))}
      </div>

      <div className="p-5">
        {profile.badges?.length ? (
          <div className="mb-4 flex flex-wrap gap-2">
            {profile.badges.map((b) => (
              <span
                key={b.key}
                className="rounded-full bg-brand-500/15 px-2.5 py-1 text-xs font-medium text-brand-300"
              >
                {b.icon} {b.name}
              </span>
            ))}
          </div>
        ) : (
          <p className="mb-4 text-sm text-text-muted">No badges earned yet.</p>
        )}

        <div className="flex items-center justify-between gap-4">
          <img
            src={qr}
            alt="Scan to view profile"
            className="h-[120px] w-[120px] rounded-lg bg-white p-1"
          />
          <div className="flex-1">
            <p className="text-sm text-text-secondary">Scan or share this card.</p>
            <Button className="mt-2 w-full" onClick={share}>
              Share Profile
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}

export default function PublicProfile() {
  const { id } = useParams();
  const { data: profile, isLoading, isError } = usePublicProfile(id);

  return (
    <>
      <AppHeader />
      <main className="mx-auto max-w-md px-4 py-10">
        {isLoading ? (
          <div className="py-20 text-center text-text-muted">Loading profile…</div>
        ) : isError || !profile ? (
          <EmptyState icon="🤔" headline="Profile not found" copy="This player profile doesn't exist." />
        ) : (
          <>
            <ShareCard profile={profile} />
            <p className="mt-6 text-center text-sm text-text-muted">
              <Link to="/register" className="font-semibold text-accent-400 hover:underline">
                Build your own volleyball profile →
              </Link>
            </p>
          </>
        )}
      </main>
    </>
  );
}
