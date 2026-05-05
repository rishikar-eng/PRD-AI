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

const pgPool = projectRef && process.env.SUPABASE_DB_PASSWORD ? new Pool({
  host: `aws-0-ap-south-1.pooler.supabase.com`,
  port: 6543,
  database: 'postgres',
  user: `postgres.${projectRef}`,
  password: process.env.SUPABASE_DB_PASSWORD,
  ssl: { rejectUnauthorized: false },
  // Force IPv4 to avoid IPv6 connectivity issues
  family: 4
}) : null;

// Initialize session store
const PgSession = connectPgSimple(session);

export const sessionStore = pgPool ? new PgSession({
  pool: pgPool,
  tableName: 'session',
  createTableIfMissing: true
}) : null;

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
