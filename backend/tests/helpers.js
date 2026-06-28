import { query } from '../db.js';

export async function resetDb() {
  // Truncate user-generated data only; keep seeded reference data
  // (communities, badges) so FKs and badge rules stay intact across tests.
  await query(
    'TRUNCATE user_badges, rating_history, matches, skill_stats, users RESTART IDENTITY CASCADE'
  );
}
