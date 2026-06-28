import { pool } from '../db.js';

export async function listCommunities() {
  const { rows } = await pool.query(
    'SELECT id, name, slug, city FROM communities ORDER BY name'
  );
  return rows;
}
