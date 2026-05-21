import connectPgSimple from 'connect-pg-simple';
import session from 'express-session';
import pg from 'pg';

const { Pool } = pg;

/**
 * Persistent session storage backed by Supabase Postgres.
 *
 * Setup:
 *   1. Run server/migrations/create_sessions_table.sql once on Supabase
 *      (Supabase dashboard → SQL Editor → paste + Run).
 *   2. Set DATABASE_URL in env to the Supabase **Session pooler** URL:
 *        postgresql://postgres.PROJECTREF:PASSWORD@aws-0-<REGION>.pooler.supabase.com:5432/postgres
 *      Copy this string from Supabase dashboard → Project Settings → Database →
 *      Connection string → "Session" mode.
 *
 * If DATABASE_URL is not set, the server falls back to in-memory sessions and
 * logs a warning. The app still runs but sessions die on every restart.
 */

const databaseUrl = process.env.DATABASE_URL;

let pool = null;
let sessionStore = null;

if (databaseUrl) {
  pool = new Pool({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
    max: 10,
    idleTimeoutMillis: 30000,
  });

  pool.on('error', (err) => {
    console.error('Postgres session pool error:', err.message);
  });

  const PgStore = connectPgSimple(session);
  sessionStore = new PgStore({
    pool,
    tableName: 'session',
    createTableIfMissing: true,
    pruneSessionInterval: 60 * 60, // expired-session cleanup every hour
  });

  console.log('✓ PostgreSQL session storage enabled (Supabase pooler)');
} else {
  console.warn('⚠️  DATABASE_URL not set — using in-memory sessions.');
  console.warn('    Sessions will NOT survive server restarts.');
  console.warn('    To enable persistent sessions: set DATABASE_URL to the Supabase Session pooler URL.');
}

export { sessionStore };

export function getSessionMiddleware() {
  const sessionConfig = {
    secret: process.env.SESSION_SECRET || 'dev-secret-change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 1000 * 60 * 60 * 24 * 7,
    },
  };

  if (sessionStore) {
    sessionConfig.store = sessionStore;
  }

  return session(sessionConfig);
}
