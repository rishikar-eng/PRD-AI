import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { attachSession } from './middleware/auth.js';
import { getSessionMiddleware } from './services/sessionStore.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Trust proxy - needed when behind Vercel/CloudFront
app.set('trust proxy', 1);

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
}));

app.use(express.json());

// Use database-backed sessions (Supabase PostgreSQL)
app.use(getSessionMiddleware());

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
import handoffRoutes from './routes/handoff.js';
import inputRequestsRoutes from './routes/inputRequests.js';
import teamRoutes from './routes/team.js';

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/intake', intakeRoutes);
app.use('/api/agents', agentsRoutes);
app.use('/api/projects', projectsRoutes);
app.use('/api/share', shareRoutes);
app.use('/api/handoff', handoffRoutes);
app.use('/api/input-requests', inputRequestsRoutes);
app.use('/api/team', teamRoutes);

// In production, serve the built frontend from the same Render service
// (single-service deployment — backend hosts the static SPA so we don't need
// a separate frontend service or CORS workarounds).
if (process.env.NODE_ENV === 'production') {
  const clientDist = path.join(__dirname, '..', 'client', 'dist');
  app.use(express.static(clientDist));
  // SPA fallback: any non-API GET serves the React app
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

// Error handling
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`🚀 Rian PRD Pipeline server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
