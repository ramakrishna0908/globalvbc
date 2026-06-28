import pg from 'pg';

const { Pool } = pg;

// Enable SSL for hosted Postgres (Neon/Supabase). Local dev uses no SSL.
const useSsl =
  /\bsslmode=require\b/.test(process.env.DATABASE_URL || '') ||
  process.env.PGSSL === 'true' ||
  Boolean(process.env.VERCEL);

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Keep the pool tiny on serverless — each function instance gets its own.
  max: process.env.VERCEL ? 1 : 10,
  // Neon/Supabase present publicly-trusted certs, so verify normally.
  ssl: useSsl ? true : undefined,
});

export const query = (text, params) => pool.query(text, params);
