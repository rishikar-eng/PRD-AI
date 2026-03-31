import express from 'express';
import { chatCompletion } from '../services/ai.js';
import { getIntakeSystemPrompt } from '../prompts/intake.js';
import { requireAuth } from '../middleware/auth.js';
import { supabase } from '../services/db.js';

const router = express.Router();

/**
 * POST /api/intake/start
 * Start the intake conversation
 */
router.post('/start', requireAuth, async (req, res) => {
  const { role, input, inputMode } = req.body;

  if (!role || !input) {
    return res.status(400).json({ error: 'Role and input required' });
  }

  try {
    const state = req.session.pipelineState;
    state.role = role;
    state.input = { raw: input, mode: inputMode };
    state.stage = 1; // Move to intake stage

    // Initialize conversation
    const systemPrompt = getIntakeSystemPrompt(role);
    const userMessage = `Initial input from ${role}:\n\n${input}\n\nBegin the intake interview. Ask the first question.`;

    const response = await chatCompletion([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ]);

    // Extract suggestions if present
    const suggestionsMatch = response.match(/SUGGESTIONS:\[(.*?)\]/);
    let suggestions = [];
    let question = response;

    if (suggestionsMatch) {
      try {
        suggestions = JSON.parse(`[${suggestionsMatch[1]}]`);
        question = response.replace(/\nSUGGESTIONS:\[.*?\]/, '').trim();
      } catch (e) {
        console.error('Failed to parse suggestions:', e);
      }
    }

    // Store conversation history
    state.intake.conversationHistory = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
      { role: 'assistant', content: response },
    ];

    res.json({
      question,
      suggestions,
      turnCount: 1,
    });
  } catch (error) {
    console.error('Intake start error:', error);
    res.status(500).json({ error: 'Failed to start intake' });
  }
});

/**
 * POST /api/intake/reply
 * Continue the intake conversation
 */
router.post('/reply', requireAuth, async (req, res) => {
  const { reply } = req.body;

  if (!reply) {
    return res.status(400).json({ error: 'Reply required' });
  }

  try {
    const state = req.session.pipelineState;
    const history = state.intake.conversationHistory;

    // Add user reply to history
    history.push({ role: 'user', content: reply });

    // Get AI response
    const response = await chatCompletion(history);

    // Add AI response to history
    history.push({ role: 'assistant', content: response });

    // Check if intake is complete (Bug fix: check for exact line match to avoid false positives)
    const lines = response.split('\n').map(l => l.trim());
    const isComplete = lines.some(line => line === 'INTAKE_COMPLETE');

    if (isComplete) {
      // Extract structured data from conversation
      const structuredData = await extractStructuredData(history, state.role);
      state.intake.structuredData = structuredData;
      state.stage = 2; // Move to writer agent stage

      // Auto-save project to Supabase
      await saveProject(req);

      return res.json({
        complete: true,
        structuredData,
      });
    }

    // Extract suggestions
    const suggestionsMatch = response.match(/SUGGESTIONS:\[(.*?)\]/);
    let suggestions = [];
    let question = response;

    if (suggestionsMatch) {
      try {
        suggestions = JSON.parse(`[${suggestionsMatch[1]}]`);
        question = response.replace(/\nSUGGESTIONS:\[.*?\]/, '').trim();
      } catch (e) {
        console.error('Failed to parse suggestions:', e);
      }
    }

    const turnCount = Math.floor(history.filter(m => m.role === 'user').length);

    res.json({
      question,
      suggestions,
      turnCount,
      complete: false,
    });
  } catch (error) {
    console.error('Intake reply error:', error);
    res.status(500).json({ error: 'Failed to process reply' });
  }
});

/**
 * POST /api/intake/extract
 * Force-extract structuredData from current conversation (no INTAKE_COMPLETE needed)
 * Used when continuing the conversation from the Review stage
 */
router.post('/extract', requireAuth, async (req, res) => {
  try {
    const state = req.session.pipelineState;
    const history = state.intake.conversationHistory;

    if (!history || history.length === 0) {
      return res.status(400).json({ error: 'No conversation history found' });
    }

    const structuredData = await extractStructuredData(history, state.role);
    state.intake.structuredData = structuredData;

    res.json({ structuredData });
  } catch (error) {
    console.error('Extract error:', error);
    res.status(500).json({ error: 'Failed to extract structured data' });
  }
});

/**
 * Helper: Extract structured data from conversation
 */
async function extractStructuredData(history, role) {
  const extractionPrompt = `Based on the conversation above, extract the following information into JSON format. If a field wasn't discussed, use an empty string.

Return ONLY valid JSON in this exact format:
{
  "featureName": "",
  "problem": "",
  "users": "",
  "successOutcome": "",
  "inScope": "",
  "outOfScope": "",
  "userFlows": "",
  "configuration": "",
  "failureStates": "",
  "constraints": "",
  "openQuestions": ""
}`;

  try {
    const response = await chatCompletion([
      ...history,
      { role: 'user', content: extractionPrompt },
    ]);

    // Parse JSON from response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }

    throw new Error('No valid JSON found in extraction response');
  } catch (error) {
    console.error('Structured data extraction error:', error);
    // Return default structure if extraction fails
    return {
      featureName: 'Untitled Feature',
      problem: '',
      users: '',
      successOutcome: '',
      inScope: '',
      outOfScope: '',
      userFlows: '',
      configuration: '',
      failureStates: '',
      constraints: '',
      openQuestions: '',
    };
  }
}

/**
 * SPEC: saveProject
 * Purpose: Auto-save or update project in Supabase after stage transitions
 * Inputs: req (Express request with session)
 * Outputs: None (async operation)
 * Side effects: Creates or updates row in projects table
 * Error states: Logs error but doesn't throw (non-blocking save)
 */
async function saveProject(req) {
  try {
    const state = req.session.pipelineState;
    const userEmail = req.session.userEmail;

    if (!userEmail) return; // Skip if not authenticated

    const title = state.intake.structuredData?.featureName || `Untitled — ${new Date().toLocaleDateString()}`;

    if (state.projectId) {
      // Update existing project
      await supabase
        .from('projects')
        .update({
          title,
          stage: state.stage,
          session_data: state,
        })
        .eq('id', state.projectId)
        .eq('user_email', userEmail);
    } else {
      // Create new project
      const { data } = await supabase
        .from('projects')
        .insert({
          user_email: userEmail,
          title,
          stage: state.stage,
          session_data: state,
        })
        .select('id')
        .single();

      if (data) {
        state.projectId = data.id; // Track project ID in session
      }
    }
  } catch (error) {
    console.error('Auto-save project error:', error);
    // Don't throw - non-blocking save
  }
}

export default router;
