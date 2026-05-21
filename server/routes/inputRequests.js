import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { supabase } from '../services/db.js';
import { sendInputRequestToTeams, notifyInputIncorporated } from '../services/teams.js';

const router = express.Router();

/**
 * POST /api/input-requests
 * Create a new input request and send Teams notification
 */
router.post('/', requireAuth, async (req, res) => {
  const { prdId, stage, stageDraft, requestedFrom, question } = req.body;
  const requestedBy = req.session.userEmail;

  if (!prdId || !stage || !requestedFrom || !question) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    // Get PRD title
    const { data: project } = await supabase
      .from('projects')
      .select('title')
      .eq('id', prdId)
      .single();

    // Get team member details
    const { data: teamMember } = await supabase
      .from('team_expertise')
      .select('user_name')
      .eq('user_email', requestedFrom)
      .single();

    const { data: requester } = await supabase
      .from('team_expertise')
      .select('user_name')
      .eq('user_email', requestedBy)
      .single();

    // Create input request
    const { data: inputRequest, error } = await supabase
      .from('input_requests')
      .insert({
        prd_id: prdId,
        stage,
        stage_draft: stageDraft,
        requested_by: requestedBy,
        requested_from: requestedFrom,
        question,
        status: 'pending'
      })
      .select()
      .single();

    if (error) throw error;

    // Send Teams notification
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const responseUrl = `${frontendUrl}/respond/${inputRequest.id}`;

    await sendInputRequestToTeams({
      requestedFromName: teamMember?.user_name || requestedFrom,
      requestedByName: requester?.user_name || requestedBy,
      prdTitle: project?.title || 'Untitled PRD',
      stage: formatStageName(stage),
      question,
      stageDraft,
      responseUrl
    });

    res.json({ success: true, inputRequest });
  } catch (error) {
    console.error('Create input request error:', error);
    res.status(500).json({ error: 'Failed to create input request' });
  }
});

/**
 * GET /api/input-requests/pending
 * Get all pending input requests for the current user
 */
router.get('/pending', requireAuth, async (req, res) => {
  const userEmail = req.session.userEmail;

  try {
    const { data, error } = await supabase
      .from('input_requests')
      .select(`
        *,
        projects:prd_id (id, title)
      `)
      .eq('requested_from', userEmail)
      .in('status', ['pending', 'responded'])
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json(data || []);
  } catch (error) {
    console.error('Get pending requests error:', error);
    res.status(500).json({ error: 'Failed to load pending requests' });
  }
});

/**
 * GET /api/input-requests/team
 * Get all team members with their expertise
 *
 * NOTE: Must be declared BEFORE GET /:id, otherwise Express's left-to-right
 * matching catches "/team" with the :id wildcard.
 */
router.get('/team', requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('team_expertise')
      .select('*')
      .eq('active', true)
      .order('user_name');

    if (error) throw error;

    res.json(data || []);
  } catch (error) {
    console.error('Get team error:', error);
    res.status(500).json({ error: 'Failed to load team' });
  }
});

/**
 * GET /api/input-requests/:id
 * Get a specific input request (for response page)
 */
router.get('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const { data, error } = await supabase
      .from('input_requests')
      .select(`
        *,
        projects:prd_id (id, title, session_data)
      `)
      .eq('id', id)
      .single();

    if (error || !data) {
      return res.status(404).json({ error: 'Input request not found' });
    }

    res.json(data);
  } catch (error) {
    console.error('Get input request error:', error);
    res.status(500).json({ error: 'Failed to load input request' });
  }
});

/**
 * POST /api/input-requests/:id/respond
 * Submit a response to an input request
 */
router.post('/:id/respond', async (req, res) => {
  const { id } = req.params;
  const { response } = req.body;

  if (!response || !response.trim()) {
    return res.status(400).json({ error: 'Response is required' });
  }

  try {
    const { data, error } = await supabase
      .from('input_requests')
      .update({
        response,
        status: 'responded',
        responded_at: new Date().toISOString()
      })
      .eq('id', id)
      .select(`
        *,
        projects:prd_id (title)
      `)
      .single();

    if (error) throw error;

    res.json({ success: true, inputRequest: data });
  } catch (error) {
    console.error('Submit response error:', error);
    res.status(500).json({ error: 'Failed to submit response' });
  }
});

/**
 * POST /api/input-requests/:id/incorporate
 * Mark input as incorporated and trigger regeneration
 */
router.post('/:id/incorporate', requireAuth, async (req, res) => {
  const { id } = req.params;

  try {
    // Update status to incorporated
    const { data: inputRequest, error } = await supabase
      .from('input_requests')
      .update({
        include_in_context: true,
        status: 'incorporated'
      })
      .eq('id', id)
      .select(`
        *,
        projects:prd_id (id, title)
      `)
      .single();

    if (error) throw error;

    // Send notification to responder that their input was used
    const { data: teamMember } = await supabase
      .from('team_expertise')
      .select('user_name')
      .eq('user_email', inputRequest.requested_from)
      .single();

    const { data: requester } = await supabase
      .from('team_expertise')
      .select('user_name')
      .eq('user_email', inputRequest.requested_by)
      .single();

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const prdUrl = `${frontendUrl}/prd/${inputRequest.projects.id}`;

    await notifyInputIncorporated({
      requestedByName: requester?.user_name || inputRequest.requested_by,
      requestedFromName: teamMember?.user_name || inputRequest.requested_from,
      prdTitle: inputRequest.projects.title,
      stage: formatStageName(inputRequest.stage),
      prdUrl
    });

    res.json({ success: true, inputRequest });
  } catch (error) {
    console.error('Incorporate input error:', error);
    res.status(500).json({ error: 'Failed to incorporate input' });
  }
});

/**
 * GET /api/input-requests/prd/:prdId
 * Get all input requests for a specific PRD
 */
router.get('/prd/:prdId', requireAuth, async (req, res) => {
  const { prdId } = req.params;

  try {
    const { data, error } = await supabase
      .from('input_requests')
      .select('*')
      .eq('prd_id', prdId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json(data || []);
  } catch (error) {
    console.error('Get PRD input requests error:', error);
    res.status(500).json({ error: 'Failed to load input requests' });
  }
});

// Helper function to format stage names
function formatStageName(stageSlug) {
  const stageNames = {
    'idea_capture': 'Idea Capture',
    'intake': 'AI Intake',
    'writer': 'PRD Generation',
    'qc': 'Quality Check',
    'success_metric': 'Success Metric',
    'delivery_reality': 'Delivery Reality',
    'technical_feasibility': 'Technical Feasibility',
    'business_value': 'Business Value',
    'security': 'Security',
    'debate': 'Debate & Meta-Review',
    'owner_review': 'Owner Review',
    'external_review': 'External PRD Review'
  };

  return stageNames[stageSlug] || stageSlug;
}

export default router;
