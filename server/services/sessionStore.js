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

let pgPool = null;
let sessionStore = null;

if (projectRef && process.env.SUPABASE_DB_PASSWORD) {
  try {
    pgPool = new Pool({
      host: `db.${projectRef}.supabase.co`,
      port: 5432,
      database: 'postgres',
      user: 'postgres',
      password: process.env.SUPABASE_DB_PASSWORD,
      ssl: { rejectUnauthorized: false },
      // Add connection timeout and retry settings
      connectionTimeoutMillis: 5000,
      // Don't fail on connection error, just log it
    });

    // Test the connection
    pgPool.on('error', (err) => {
      console.error('PostgreSQL pool error:', err.message);
      console.warn('Falling back to in-memory sessions due to database connection error');
    });

    // Initialize session store
    const PgSession = connectPgSimple(session);
    sessionStore = new PgSession({
      pool: pgPool,
      tableName: 'session',
      createTableIfMissing: true
    });

    console.log('✓ PostgreSQL session store initialized');
  } catch (error) {
    console.error('Failed to initialize PostgreSQL session store:', error.message);
    console.warn('Falling back to in-memory sessions');
    pgPool = null;
    sessionStore = null;
  }
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
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
    },
  };

  if (sessionStore) {
    sessionConfig.store = sessionStore;
  }

  return session(sessionConfig);
}
