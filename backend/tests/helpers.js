import { query } from '../db.js';

export async function resetDb() {
  await query(
    'TRUNCATE user_badges, rating_history, matches, skill_stats, users, communities RESTART IDENTITY CASCADE'
  );
}
