import pg from 'pg';

const { Pool } = pg;

// Enable SSL for hosted Postgres (Neon/Supabase). Local dev uses no SSL.
const useSsl =
  /\bsslmode=require\b/.test(process.env.DATABASE_URL || process.env.POSTGRES_URL || '') ||
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

// DATABASE_URL is the canonical setting; POSTGRES_URL is what the Vercel
// Marketplace Postgres integrations (Supabase/Neon) provision automatically.
let connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;

// pg ≥ 8.13 treats `sslmode=` in the URL as authoritative and ignores the
// `ssl` option; when the operator explicitly opted out of chain verification
// (custom-CA poolers) drop the URL parameter so the `ssl` object below applies.
if (connectionString && process.env.DB_SSL_NO_VERIFY === 'true') {
  connectionString = connectionString.replace(/([?&])sslmode=[^&]*&?/, '$1').replace(/[?&]$/, '');
}

export const pool = new Pool({
  connectionString,
  // Keep the pool tiny on serverless — each function instance gets its own.
  max: process.env.VERCEL ? 1 : 10,
  ssl: sslConfig(),
});

export const query = (text, params) => pool.query(text, params);
