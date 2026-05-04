import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { attachSession } from './middleware/auth.js';
import { getSessionMiddleware } from './services/sessionStore.js';

dotenv.config();

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

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/intake', intakeRoutes);
app.use('/api/agents', agentsRoutes);
app.use('/api/projects', projectsRoutes);
app.use('/api/share', shareRoutes);
app.use('/api/handoff', handoffRoutes);
app.use('/api/input-requests', inputRequestsRoutes);

// Error handling
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`🚀 Rian PRD Pipeline server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
