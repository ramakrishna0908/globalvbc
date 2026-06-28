import 'dotenv/config';
import { pool, query } from './db.js';
import { register } from './services/auth.js';
import { updateProfile } from './services/profile.js';
import { recordMatch } from './services/ratingEngine.js';

const OPPONENTS = ['Tigers', 'Eagles', 'Sharks', 'Falcons', 'Wolves', 'Panthers', 'Hawks'];

// Deterministic pseudo-random so seeds are reproducible without Math.random.
function rng(seed) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

const PLAYERS = [
  { name: 'Sarah Spiker', position: 'outside_hitter', wins: 9, losses: 2, mvp: 3, sample: true },
  { name: 'Mike Setter', position: 'setter', wins: 8, losses: 3, mvp: 1 },
  { name: 'Emma Libero', position: 'libero', wins: 7, losses: 3, mvp: 1 },
  { name: 'David Blocker', position: 'middle_blocker', wins: 6, losses: 4, mvp: 0 },
  { name: 'Olivia Opposite', position: 'opposite', wins: 6, losses: 5, mvp: 1 },
  { name: 'Noah Server', position: 'outside_hitter', wins: 5, losses: 5, mvp: 0 },
  { name: 'Ava Passer', position: 'libero', wins: 5, losses: 6, mvp: 0 },
  { name: 'Liam Hitter', position: 'opposite', wins: 4, losses: 6, mvp: 0 },
  { name: 'Sophia Ace', position: 'setter', wins: 4, losses: 7, mvp: 0 },
  { name: 'James Net', position: 'middle_blocker', wins: 3, losses: 7, mvp: 0 },
  { name: 'Mia Rally', position: 'outside_hitter', wins: 2, losses: 8, mvp: 0 },
  { name: 'Lucas Dig', position: 'libero', wins: 1, losses: 4, mvp: 0 },
];

async function clearUsers() {
  await query(
    'TRUNCATE user_badges, rating_history, matches, skill_stats, users RESTART IDENTITY CASCADE'
  );
}

async function run() {
  console.log('seeding…');
  await clearUsers();

  // ensure community 1 exists
  const { rows: comms } = await query('SELECT id FROM communities ORDER BY id LIMIT 1');
  const communityId = comms[0]?.id || 1;

  let sampleId = null;
  let pi = 0;
  for (const p of PLAYERS) {
    pi += 1;
    const email = `${p.name.toLowerCase().replace(/\s+/g, '.')}@globalvbc.demo`;
    const user = await register({ email, password: 'volleyball123', name: p.name });
    await updateProfile(user.id, {
      position: p.position,
      community_id: communityId,
      photo_url: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(p.name)}`,
    });

    const rand = rng(pi * 97 + 13);
    const total = p.wins + p.losses;
    const results = [
      ...Array(p.wins).fill('won'),
      ...Array(p.losses).fill('lost'),
    ].sort(() => rand() - 0.5);

    for (let m = 0; m < total; m++) {
      const result = results[m];
      const winScore = 21 + Math.floor(rand() * 4); // 21–24
      const loseScore = 12 + Math.floor(rand() * 9); // 12–20
      await recordMatch(user.id, {
        opponent_name: OPPONENTS[m % OPPONENTS.length],
        result,
        score_for: result === 'won' ? winScore : loseScore,
        score_against: result === 'won' ? loseScore : winScore,
        // Strong opponents so wins are worth more — top players reach ~1600–1800.
        opponent_elo: 1450 + Math.floor(rand() * 200),
        is_mvp: m < p.mvp,
      });
    }

    if (p.sample) sampleId = user.id;
    console.log(`  ${p.name} (#${user.id}) — ${p.wins}W/${p.losses}L`);
  }

  console.log(`done. sample profile id = ${sampleId}`);
  await pool.end();
}

run().catch((err) => {
  console.error('seed failed:', err);
  process.exit(1);
});
