import pg from 'pg';

const { Pool } = pg;

// Enable SSL for hosted Postgres (Neon/Supabase). Local dev uses no SSL.
const useSsl =
  /\bsslmode=require\b/.test(process.env.DATABASE_URL || '') ||
  process.env.PGSSL === 'true' ||
  Boolean(process.env.VERCEL);

// Some managed poolers (e.g. Supabase Supavisor) present a custom-CA cert that
// isn't in Node's default trust store. Set DB_SSL_NO_VERIFY=true to keep TLS
// encryption while skipping chain verification. This is an explicit, opt-in
// choice — the default verifies the chain.
const sslConfig = () => {
  if (!useSsl) return undefined;
  if (process.env.DB_SSL_NO_VERIFY === 'true') return { rejectUnauthorized: false };
  return true;
};

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Keep the pool tiny on serverless — each function instance gets its own.
  max: process.env.VERCEL ? 1 : 10,
  ssl: sslConfig(),
});

export const query = (text, params) => pool.query(text, params);
