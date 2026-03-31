import express from 'express';
import { supabase } from '../services/db.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

/**
 * SPEC: GET /api/projects
 * Purpose: List all projects for the current authenticated user
 * Inputs: None - uses user email from session
 * Outputs: Array of project objects with id, title, stage, created_at, updated_at
 * Side effects: None - read-only query
 * Error states: 401 if not authenticated, 500 if database query fails
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    const userEmail = req.session.userEmail;

    const { data, error } = await supabase
      .from('projects')
      .select('id, title, stage, created_at, updated_at')
      .eq('user_email', userEmail)
      .order('updated_at', { ascending: false });

    if (error) throw error;

    res.json(data || []);
  } catch (error) {
    console.error('List projects error:', error);
    res.status(500).json({ error: 'Failed to load projects' });
  }
});

/**
 * SPEC: POST /api/projects
 * Purpose: Create a new project
 * Inputs: { title, stage, session_data } in request body
 * Outputs: Created project object with id, title, stage, created_at
 * Side effects: Inserts new row in projects table
 * Error states: 400 if required fields missing, 500 if database insert fails
 */
router.post('/', requireAuth, async (req, res) => {
  try {
    const { title, stage, session_data } = req.body;

    if (!title || stage === undefined || !session_data) {
      return res.status(400).json({ error: 'Title, stage, and session_data required' });
    }

    const userEmail = req.session.userEmail;

    const { data, error } = await supabase
      .from('projects')
      .insert({
        user_email: userEmail,
        title,
        stage,
        session_data,
      })
      .select('id, title, stage, created_at')
      .single();

    if (error) throw error;

    res.json(data);
  } catch (error) {
    console.error('Create project error:', error);
    res.status(500).json({ error: 'Failed to create project' });
  }
});

/**
 * SPEC: GET /api/projects/:id
 * Purpose: Get a single project by ID
 * Inputs: id in URL params
 * Outputs: Full project object including session_data blob
 * Side effects: None - read-only query
 * Error states: 404 if project not found or not owned by user, 500 if query fails
 */
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const userEmail = req.session.userEmail;

    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('id', id)
      .eq('user_email', userEmail)
      .single();

    if (error || !data) {
      return res.status(404).json({ error: 'Project not found' });
    }

    res.json(data);
  } catch (error) {
    console.error('Get project error:', error);
    res.status(500).json({ error: 'Failed to load project' });
  }
});

/**
 * SPEC: PUT /api/projects/:id
 * Purpose: Update an existing project
 * Inputs: id in URL params, { title?, stage?, session_data? } in request body
 * Outputs: Updated project with id and updated_at timestamp
 * Side effects: Updates row in projects table, triggers updated_at timestamp update
 * Error states: 400 if no fields to update, 404 if not found, 500 if update fails
 */
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, stage, session_data } = req.body;
    const userEmail = req.session.userEmail;

    const updates = {};
    if (title !== undefined) updates.title = title;
    if (stage !== undefined) updates.stage = stage;
    if (session_data !== undefined) updates.session_data = session_data;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    const { data, error } = await supabase
      .from('projects')
      .update(updates)
      .eq('id', id)
      .eq('user_email', userEmail)
      .select('id, updated_at')
      .single();

    if (error || !data) {
      return res.status(404).json({ error: 'Project not found' });
    }

    res.json(data);
  } catch (error) {
    console.error('Update project error:', error);
    res.status(500).json({ error: 'Failed to update project' });
  }
});

/**
 * SPEC: DELETE /api/projects/:id
 * Purpose: Delete a project
 * Inputs: id in URL params
 * Outputs: { success: true }
 * Side effects: Deletes row from projects table
 * Error states: 404 if not found or not owned by user, 500 if delete fails
 */
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const userEmail = req.session.userEmail;

    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', id)
      .eq('user_email', userEmail);

    if (error) throw error;

    res.json({ success: true });
  } catch (error) {
    console.error('Delete project error:', error);
    res.status(500).json({ error: 'Failed to delete project' });
  }
});

/**
 * SPEC: POST /api/projects/:id/restore
 * Purpose: Load a saved project into the current session state
 * Inputs: id in URL params
 * Outputs: { stage, session_data }
 * Side effects: Writes session_data to req.session.pipelineState
 * Error states: 404 if project not found, 500 if restore fails
 */
router.post('/:id/restore', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const userEmail = req.session.userEmail;

    const { data, error } = await supabase
      .from('projects')
      .select('stage, session_data')
      .eq('id', id)
      .eq('user_email', userEmail)
      .single();

    if (error || !data) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Load session_data into session
    req.session.pipelineState = {
      ...data.session_data,
      projectId: id, // Track which project is loaded
    };

    res.json({
      stage: data.stage,
      session_data: data.session_data,
    });
  } catch (error) {
    console.error('Restore project error:', error);
    res.status(500).json({ error: 'Failed to restore project' });
  }
});

export default router;
