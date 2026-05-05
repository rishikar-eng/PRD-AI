import connectPgSimple from 'connect-pg-simple';
import session from 'express-session';
import pg from 'pg';

const { Pool } = pg;

// Parse Supabase URL to get PostgreSQL connection details
const supabaseUrl = process.env.SUPABASE_URL;
const projectRef = supabaseUrl?.match(/https:\/\/(.+?)\.supabase\.co/)?.[1];

if (!projectRef || !process.env.SUPABASE_DB_PASSWORD) {
  console.warn('Supabase DB credentials not configured. Using in-memory sessions (not recommended for production)');
}

// IMPORTANT: PostgreSQL session storage is DISABLED for now
// Reason: Render cannot connect to Supabase PostgreSQL via IPv6
// Workaround: Using in-memory sessions (works for single-server deployment)
// Future fix: Need to configure Supabase connection pooler with correct region
// or use a different session storage mechanism (Redis, etc.)

console.warn('⚠️  PostgreSQL session storage is disabled');
console.warn('    Using in-memory sessions (not persistent across server restarts)');
console.warn('    To enable: Fix PostgreSQL connection in sessionStore.js');

const sessionStore = null;

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
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
    },
  };

  if (sessionStore) {
    sessionConfig.store = sessionStore;
  }

  return session(sessionConfig);
}
