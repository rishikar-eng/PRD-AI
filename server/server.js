import express from 'express';
import cors from 'cors';
import session from 'express-session';
import dotenv from 'dotenv';
import { attachSession } from './middleware/auth.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
}));

app.use(express.json());

app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-secret-change-in-production',
  resave: false,
  saveUninitialized: true,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', // Allow cross-origin cookies
    maxAge: 1000 * 60 * 60 * 24, // 24 hours
  },
}));

app.use(attachSession);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Import routes
import authRoutes from './routes/auth.js';
import intakeRoutes from './routes/intake.js';
import agentsRoutes from './routes/agents.js';
import projectsRoutes from './routes/projects.js';
import shareRoutes from './routes/share.js';

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/intake', intakeRoutes);
app.use('/api/agents', agentsRoutes);
app.use('/api/projects', projectsRoutes);
app.use('/api/share', shareRoutes);

// Error handling
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`🚀 Rian PRD Pipeline server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
