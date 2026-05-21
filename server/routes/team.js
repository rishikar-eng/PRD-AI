/**
 * Team directory routes.
 *
 * Aggregates data across three tables (team_expertise, projects, input_requests)
 * into a single per-teammate view: which PRDs they've generated, what input
 * requests are pending for them, and how many they've handled.
 */

import express from 'express';
import { supabase } from '../services/db.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

/**
 * GET /api/team/directory
 * Returns a list of teammates with PRDs, pending input requests, and counts.
 */
router.get('/directory', requireAuth, async (req, res) => {
  try {
    const [members, projects, requests] = await Promise.all([
      supabase
        .from('team_expertise')
        .select('*')
        .eq('active', true)
        .order('user_name'),
      supabase
        .from('projects')
        .select('id, title, stage, user_email, created_at, updated_at'),
      supabase
        .from('input_requests')
        .select('id, prd_id, requested_from, requested_by, stage, question, status, created_at, projects:prd_id(title)'),
    ]);

    if (members.error) throw members.error;

    const allProjects = projects.data || [];
    const allRequests = requests.data || [];

    const directory = (members.data || []).map((m) => {
      const userPrds = allProjects
        .filter((p) => p.user_email === m.user_email)
        .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));

      const userRequests = allRequests.filter((r) => r.requested_from === m.user_email);

      return {
        user_email: m.user_email,
        user_name: m.user_name,
        role: m.role,
        domain: m.domain,
        suggested_stages: m.suggested_stages || [],
        prds: userPrds.slice(0, 8),
        prdCount: userPrds.length,
        pendingRequests: userRequests.filter((r) => r.status === 'pending'),
        respondedCount: userRequests.filter((r) => r.status === 'responded').length,
        incorporatedCount: userRequests.filter((r) => r.status === 'incorporated').length,
      };
    });

    res.json(directory);
  } catch (error) {
    console.error('Get team directory error:', error);
    res.status(500).json({ error: 'Failed to load team directory' });
  }
});

export default router;
