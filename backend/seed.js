// Demo-world seed. Everything goes through the real service layer (register,
// createTeam, createTournament, generateSchedule, appendEvents, submitMatch …)
// so derived state — event logs, stats, ratings, brackets, badges — is exactly
// what the app would have produced. Idempotent: truncates first.
//
//   cd backend && npm run seed        (DATABASE_URL from .env)
import 'dotenv/config';
import { ensureSuperadmin } from './scripts/create-admin.js';
import { pool, query } from './db.js';
import { register } from './services/auth.js';
import { updateProfile } from './services/profile.js';
import { recordMatch } from './services/ratingEngine.js';
import { createTeam, addMember } from './services/teams.js';
import { createTournament, updateTournament, registerTeam, generateSchedule } from './services/tournaments.js';
import { createMatch, listMatches, getMatch, updateMatch, setLineups, startMatch, appendEvents, submitMatch } from './services/matches.js';
import { deriveState } from '../shared/engine/index.js';
import { rng, shuffle, nameFactory, emailFor, avatarFor, localDate, EventFactory, planSets, simulateMatch } from './seed-helpers.js';

// Demo accounts share one password so the demo world is easy to explore.
// Override with SEED_DEMO_PASSWORD when seeding anything internet-facing.
const PASSWORD = process.env.SEED_DEMO_PASSWORD || 'volleyball123';
const OPPONENTS = ['Tigers', 'Eagles', 'Sharks', 'Falcons', 'Wolves', 'Panthers', 'Hawks'];

// Legacy self-reporting players (old dashboard, badges, "sample" profile).
const LEGACY_PLAYERS = [
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

const TEAM_NAMES = ['Austin Aces', 'Spike City', 'Net Ninjas', 'Block Party', 'Dig Deep', 'Sideout Kings', 'Libero Legends', 'Rally Cats'];
// Roster template: 7 core slots + 1 extra for the bigger squads.
const ROSTER_SLOTS = ['setter', 'outside_hitter', 'outside_hitter', 'middle_blocker', 'middle_blocker', 'opposite', 'libero'];
const EXTRA_SLOTS = ['outside_hitter', 'setter', 'middle_blocker', 'opposite'];

const BATCH_SIZE = 200;

async function clearAll() {
  await query(
    'TRUNCATE notifications, audit_log, rating_events, player_match_stats, match_events, match_lineups, matches, pool_teams, pools, tournament_registrations, divisions, courts, tournaments, venues, team_members, teams, password_resets, user_badges, rating_history, player_match_reports, skill_stats, users RESTART IDENTITY CASCADE'
  );
}

async function makeUser({ name, email, role = 'player', position = null, jersey = null, communityId }) {
  const user = await register({ email: email || emailFor(name), password: PASSWORD, name, role });
  await updateProfile(user.id, {
    position,
    jersey_number: jersey,
    community_id: communityId,
    photo_url: avatarFor(name),
  });
  return user;
}

// ---------------------------------------------------------------------------
// Scoring helpers (service-driven)
// ---------------------------------------------------------------------------
function lineupFor(roster) {
  // starters: S, OH, MB, OPP, OH, L (rotation order) — bench: the rest
  const want = ['setter', 'outside_hitter', 'middle_blocker', 'opposite', 'outside_hitter', 'libero'];
  const left = roster.slice();
  const starters = [];
  for (const pos of want) {
    const i = left.findIndex((p) => p.position === pos);
    if (i >= 0) starters.push(left.splice(i, 1)[0]);
  }
  while (starters.length < 6 && left.length) starters.push(left.shift());
  return { starters: starters.map((p) => p.id), bench: left.map((p) => p.id) };
}

async function flush(matchId, scorer, batch) {
  if (!batch.length) return null;
  const res = await appendEvents(matchId, scorer.id, scorer.role, batch);
  if (res.rejected.length) {
    throw new Error(`appendEvents rejected ${res.rejected.length} event(s) on match ${matchId}: ${JSON.stringify(res.rejected.slice(0, 3))}`);
  }
  return res;
}

/**
 * Set lineups, start the match as `scorer`, then simulate rallies from the
 * plan. When `stopAt` is given the match is left live (not submitted).
 */
async function playMatch({ match, scorer, rosters, rand, winner, dropSet, stopAt = null, startMs }) {
  const A = rosters[match.team_a_id];
  const B = rosters[match.team_b_id];
  await setLineups(match.id, scorer.id, scorer.role, { A: lineupFor(A), B: lineupFor(B) });
  await startMatch(match.id, scorer.id, scorer.role, { servingTeam: rand() < 0.5 ? 'A' : 'B' });

  const started = await getMatch(match.id);
  const state = deriveState(started.format, started.events);
  const plan = planSets(rand, state.format, winner, { dropSet });
  const factory = new EventFactory(`seed-m${match.id}`, startMs);
  const { events, state: finalState } = simulateMatch({ state, rand, rosters: { A, B }, plan, factory, stopAt });

  let last = null;
  for (let i = 0; i < events.length; i += BATCH_SIZE) last = await flush(match.id, scorer, events.slice(i, i + BATCH_SIZE));
  if (last.lastSeq !== finalState.lastSeq) throw new Error(`Seq mismatch on match ${match.id}: server ${last.lastSeq} vs local ${finalState.lastSeq}`);

  const score = finalState.sets.map((s) => `${s.scoreA}–${s.scoreB}`).join(', ');
  if (stopAt) return { score, events: events.length, live: true };
  if (last.status !== 'completed') throw new Error(`Match ${match.id} did not complete (status ${last.status})`);
  const sub = await submitMatch(match.id, scorer.id, scorer.role, { confirmWarnings: true });
  return { score, events: events.length, warnings: sub.warnings, winnerTeamId: sub.match.winner_team_id };
}

// ---------------------------------------------------------------------------
async function run() {
  const t0 = Date.now();
  console.log('seeding demo world…');
  await clearAll();

  const { rows: comms } = await query('SELECT id FROM communities ORDER BY id LIMIT 1');
  const communityId = comms[0]?.id || 1;
  const rand = rng(20260905);
  const nextName = nameFactory(rand);

  // ---- staff accounts ------------------------------------------------------
  const organizer = await makeUser({ name: 'Ola Organizer', email: 'ola.organizer@globalvbc.demo', role: 'organizer', communityId });
  const sam = await makeUser({ name: 'Sam Scorer', email: 'sam.scorer@globalvbc.demo', role: 'scorer', communityId });
  const jess = await makeUser({ name: 'Jess Scorer', email: 'jess.scorer@globalvbc.demo', role: 'scorer', communityId });
  const cara = await makeUser({ name: 'Cara Coach', email: 'cara.coach@globalvbc.demo', role: 'coach', communityId });
  const admin = await makeUser({ name: 'Ada Admin', email: 'admin@globalvbc.demo', role: 'organizer', communityId });
  await query(`UPDATE users SET role = 'admin' WHERE id = $1`, [admin.id]); // register() rejects admin by design
  admin.role = 'admin';
  // The platform superadmin is never a demo account: keep it across re-seeds.
  // No default password: use SUPERADMIN_PASSWORD or a generated one (printed once).
  const superadmin = await ensureSuperadmin({ password: process.env.SUPERADMIN_PASSWORD });
  console.log(`  staff: organizer #${organizer.id}, scorers #${sam.id}/#${jess.id}, coach #${cara.id}, admin #${admin.id}`);

  // ---- legacy players + self-reported match reports ------------------------
  const legacy = [];
  let sampleId = null;
  let pi = 0;
  for (const p of LEGACY_PLAYERS) {
    pi += 1;
    const user = await makeUser({ name: p.name, position: p.position, jersey: pi, communityId });
    const lr = rng(pi * 97 + 13);
    const results = shuffle(lr, [...Array(p.wins).fill('won'), ...Array(p.losses).fill('lost')]);
    for (let m = 0; m < results.length; m++) {
      const result = results[m];
      const winScore = 21 + Math.floor(lr() * 4);
      const loseScore = 12 + Math.floor(lr() * 9);
      await recordMatch(user.id, {
        opponent_name: OPPONENTS[m % OPPONENTS.length],
        result,
        score_for: result === 'won' ? winScore : loseScore,
        score_against: result === 'won' ? loseScore : winScore,
        opponent_elo: 1450 + Math.floor(lr() * 200),
        is_mvp: m < p.mvp,
      });
    }
    if (p.sample) sampleId = user.id;
    // Talent weights who gets attributed kills/blocks/digs in simulated rallies.
    // The sample profile (Sarah) is the star so she stays the top-rated player.
    legacy.push({ id: user.id, name: p.name, position: p.position, jersey: pi, talent: p.sample ? 3.0 : 1.2 + lr() * 0.4 });
  }
  console.log(`  ${legacy.length} legacy players with self-reported matches (sample profile #${sampleId})`);

  // ---- teams ---------------------------------------------------------------
  // Teams 0–3 are coached by Cara, 4–7 by the organizer. Legacy players are
  // spread across the teams (two on each of the first four, one on the rest).
  const teams = [];
  const rosters = {}; // teamId -> [{id, name, position, jersey, talent}]
  const legacyPool = legacy.slice();
  for (let i = 0; i < TEAM_NAMES.length; i++) {
    const coach = i < 4 ? cara : organizer;
    const team = await createTeam(coach.id, { name: TEAM_NAMES[i], community_id: communityId, logo_url: avatarFor(TEAM_NAMES[i]) });
    const slots = i < 4 ? [...ROSTER_SLOTS, EXTRA_SLOTS[i]] : [...ROSTER_SLOTS];
    const members = [];
    const legacyCount = i < 4 ? 2 : 1;
    for (let k = 0; k < legacyCount && legacyPool.length; k++) {
      const lp = legacyPool.shift();
      const si = slots.indexOf(lp.position);
      slots.splice(si >= 0 ? si : slots.length - 1, 1);
      members.push(lp);
    }
    let jersey = 1;
    const taken = new Set(members.map((m) => m.jersey));
    for (const position of slots) {
      const name = nextName();
      while (taken.has(jersey)) jersey += 1;
      const user = await makeUser({ name, position, jersey, communityId });
      members.push({ id: user.id, name, position, jersey, talent: 0.6 + rand() * 0.9 });
      taken.add(jersey);
      jersey += 1;
    }
    for (let k = 0; k < members.length; k++) {
      const m = members[k];
      await addMember(team.id, coach.id, coach.role, { user_id: m.id, jersey_number: m.jersey, position: m.position, is_captain: k === 0 });
    }
    teams.push(team);
    rosters[team.id] = members;
    console.log(`  team ${team.name} (#${team.id}) — ${members.length} players, coach ${coach.name}`);
  }
  const teamById = new Map(teams.map((t) => [t.id, t]));
  const aces = teams[0];

  // ---- Tournament 1: Austin Summer Slam (pool + knockout, today) -----------
  let slam = await createTournament(organizer.id, {
    name: 'Austin Summer Slam',
    description: 'Eight teams, two pools of four, top two advance to the semis. Best of three to 25.',
    format: 'pool_knockout',
    level: 'regional',
    courts: 3,
    setPoints: 25,
    settings: { pools: 2, advance: 2 },
    venue_name: 'Austin Rec Center',
    city: 'Austin',
    starts_on: localDate(0),
  });
  slam = await updateTournament(slam.id, organizer.id, organizer.role, { status: 'published' });
  for (const t of teams) await registerTeam(slam.id, organizer.id, organizer.role, { team_id: t.id }); // organizer → auto-approved
  const gen = await generateSchedule(slam.id, slam.divisions[0].id, organizer.id, organizer.role);
  console.log(`  ${slam.name} (#${slam.id}) published — ${gen.matches} matches scheduled on ${slam.courts.length} courts`);

  const slamMatches = () => listMatches({ tournament: slam.id, limit: 200 });
  const startMsFor = (m, offsetMin = 0) => (m.scheduled_at ? new Date(m.scheduled_at).getTime() : Date.now()) + offsetMin * 60000;
  const stats = { matches: 0, events: 0 };

  // Pick a winner: the Aces (Sarah Spiker's team) are the favourites; otherwise
  // the higher-rated team wins ~65% of the time.
  const chooseWinner = (m) => {
    if (m.team_a_id === aces.id) return 'A';
    if (m.team_b_id === aces.id) return 'B';
    const eloA = teamById.get(m.team_a_id)?.elo ?? 1000;
    const eloB = teamById.get(m.team_b_id)?.elo ?? 1000;
    const favourite = eloA >= eloB ? 'A' : 'B';
    return rand() < 0.65 ? favourite : favourite === 'A' ? 'B' : 'A';
  };

  const scoreStage = async (matches, scorer, label) => {
    for (const m of matches) {
      await updateMatch(m.id, organizer.id, organizer.role, { scorer_id: scorer.id });
      const res = await playMatch({ match: m, scorer, rosters, rand, winner: chooseWinner(m), dropSet: rand() < 0.4, startMs: startMsFor(m) });
      stats.matches += 1;
      stats.events += res.events;
      const names = `${teamById.get(m.team_a_id).name} v ${teamById.get(m.team_b_id).name}`;
      console.log(`    ${label} ${m.bracket_key.padEnd(9)} ${names.padEnd(32)} ${res.score}  → ${teamById.get(res.winnerTeamId).name}`);
    }
  };

  const pools = (await slamMatches()).filter((m) => m.bracket_stage === 'pool');
  console.log(`  scoring ${pools.length} pool matches as ${sam.name}…`);
  await scoreStage(pools, sam, 'pool');

  const semis = (await slamMatches()).filter((m) => m.bracket_stage === 'bracket' && m.bracket_type !== 'final');
  if (semis.some((m) => !m.team_a_id || !m.team_b_id)) throw new Error('Semifinals were not filled from pool standings');
  console.log(`  scoring ${semis.length} semifinals as ${sam.name}…`);
  await scoreStage(semis, sam, 'semi');

  const final = (await slamMatches()).find((m) => m.bracket_type === 'final');
  if (!final?.team_a_id || !final?.team_b_id) throw new Error('Final was not filled from the semifinals');
  await updateMatch(final.id, organizer.id, organizer.role, { scorer_id: jess.id });
  const live = await playMatch({
    match: final,
    scorer: jess,
    rosters,
    rand,
    winner: chooseWinner(final),
    dropSet: true,
    stopAt: { set: 2, rallies: 18 },
    startMs: Date.now() - 45 * 60000,
  });
  stats.events += live.events;
  console.log(`  FINAL ${teamById.get(final.team_a_id).name} v ${teamById.get(final.team_b_id).name} is LIVE (${live.score}) — scorer ${jess.name}, match #${final.id}`);

  // ---- Tournament 2: Fall Classic (single elimination, +14 days) -----------
  let fall = await createTournament(organizer.id, {
    name: 'Fall Classic',
    description: 'One-day single-elimination bracket. Registration open.',
    format: 'single_elimination',
    level: 'local',
    courts: 2,
    venue_name: 'Zilker Park Courts',
    city: 'Austin',
    starts_on: localDate(14),
  });
  fall = await updateTournament(fall.id, organizer.id, organizer.role, { status: 'published' });
  for (const t of [teams[0], teams[1], teams[4], teams[5]]) await registerTeam(fall.id, organizer.id, organizer.role, { team_id: t.id }); // approved
  for (const t of [teams[2], teams[3]]) await registerTeam(fall.id, cara.id, cara.role, { team_id: t.id }); // coach → pending
  console.log(`  ${fall.name} (#${fall.id}) published — 4 approved, 2 pending registrations, no schedule yet`);

  // ---- Tournament 3: Winter League (draft) ---------------------------------
  const winter = await createTournament(organizer.id, {
    name: 'Winter League',
    description: 'Round-robin league play over the winter. Draft — not yet announced.',
    format: 'round_robin',
    level: 'local',
    courts: 2,
    venue_name: 'Austin Rec Center',
    city: 'Austin',
    starts_on: localDate(60),
  });
  console.log(`  ${winter.name} (#${winter.id}) draft`);

  // ---- Ad-hoc friendly created by Sam, today ---------------------------------
  const tonight = new Date();
  tonight.setHours(18, 30, 0, 0);
  const friendly = await createMatch(sam.id, sam.role, {
    team_a_id: teams[6].id,
    team_b_id: teams[7].id,
    level: 'friendly',
    scheduled_at: tonight.toISOString(),
    notes: 'Friendly scrimmage — best of 3',
  });
  console.log(`  friendly ${teams[6].name} v ${teams[7].name} (#${friendly.id}) scheduled tonight, scorer ${sam.name}`);

  // ---- summary ---------------------------------------------------------------
  const { rows: sample } = await query('SELECT id, name, elo FROM users ORDER BY elo DESC, id ASC LIMIT 1');
  const secs = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`
done in ${secs}s — ${stats.matches} matches submitted, ${stats.events} events appended.

Demo accounts (password: ${PASSWORD})
  organizer  ola.organizer@globalvbc.demo   (#${organizer.id})
  scorer     sam.scorer@globalvbc.demo      (#${sam.id})  — pool + semis, friendly tonight
  scorer     jess.scorer@globalvbc.demo     (#${jess.id})  — live final ("Resume")
  coach      cara.coach@globalvbc.demo      (#${cara.id})  — ${TEAM_NAMES.slice(0, 4).join(', ')}
  admin      admin@globalvbc.demo           (#${admin.id})
  superadmin ${superadmin.email}      (#${superadmin.id})${superadmin.password ? ` — generated password: ${superadmin.password}` : ' — password unchanged'}
  players    sarah.spiker@globalvbc.demo, mike.setter@globalvbc.demo … (legacy 12 + ${Object.values(rosters).flat().length - legacy.length} roster players)

Tournaments
  #${slam.id}  ${slam.name} — live (pools + semis done, final in progress)
  #${fall.id}  ${fall.name} — published, 2 pending registrations
  #${winter.id}  ${winter.name} — draft

Matches
  live final   #${final.id}  (${teamById.get(final.team_a_id).name} v ${teamById.get(final.team_b_id).name})
  friendly     #${friendly.id}  (today, not started)

Sample profile: #${sampleId} Sarah Spiker (top rated: #${sample[0].id} ${sample[0].name}, elo ${sample[0].elo})`);
}

run()
  .then(async () => {
    await pool.end();
    process.exit(0);
  })
  .catch(async (err) => {
    console.error('seed failed:', err.message);
    if (err.details) console.error(JSON.stringify(err.details));
    if (process.env.SEED_DEBUG) console.error(err.stack);
    await pool.end().catch(() => {});
    process.exit(1);
  });
