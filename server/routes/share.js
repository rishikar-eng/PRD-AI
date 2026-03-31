import express from 'express';
import { supabase } from '../services/db.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

/**
 * SPEC: GET /api/share/:token
 * Purpose: Fetch a shared PRD by its share token (requires Rian login)
 * Inputs: token in URL params
 * Outputs: { title, featureName, prd, createdAt }
 * Side effects: None - read-only
 * Error states: 401 if not authenticated, 404 if token not found, 500 on DB error
 */
router.get('/:token', requireAuth, async (req, res) => {
  try {
    const { token } = req.params;

    // Token is stored inside session_data JSONB — query using PostgREST JSON path
    const { data, error } = await supabase
      .from('projects')
      .select('title, session_data, created_at')
      .eq('session_data->>shareToken', token)
      .single();

    if (error || !data) {
      return res.status(404).json({ error: 'Share link not found or has been removed' });
    }

    const sessionData = data.session_data;
    const prd = sessionData?.prd?.finalPRD || sessionData?.prd?.v0 || '';
    const featureName = sessionData?.intake?.structuredData?.featureName || data.title;

    res.json({
      title: data.title,
      featureName,
      prd,
      createdAt: data.created_at,
    });
  } catch (error) {
    console.error('Get share error:', error);
    res.status(500).json({ error: 'Failed to load shared PRD' });
  }
});

export default router;
