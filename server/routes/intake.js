import express from 'express';
import { chatCompletion } from '../services/ai.js';
import { getIntakeSystemPrompt } from '../prompts/intake.js';
import { getSuccessMetricPrompt } from '../prompts/successMetric.js';
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

    // Determine the level of detail in the input
    const inputLength = input.split(/\s+/).length;
    const isDetailed = inputLength > 50; // More than 50 words = detailed notes/upload

    let userMessage;
    if (isDetailed) {
      // For detailed input (notes/upload): Analyze critically, find flaws, ask debatable questions
      userMessage = `The ${role} has provided the following detailed input about a feature idea:

${input}

Your task:
1. Read this carefully as a knowledge base - understand what they're proposing
2. Identify gaps, ambiguities, or potential flaws in their thinking
3. Consider user flows that might not be well-defined
4. Think about edge cases, failure states, or constraints they might have missed
5. Ask debatable questions that challenge assumptions or explore alternatives

Start by acknowledging what you understand from their input, then ask ONE critical or debatable question that will help refine this into a solid PRD. Don't just ask for missing information - probe the quality of their thinking.`;
    } else {
      // For one-liner: Standard intake flow
      userMessage = `Initial input from ${role}:\n\n${input}\n\nBegin the intake interview. Ask the first question to understand what they want to build.`;
    }

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
      // NOTE: Don't move to stage 2 yet - wait for success metric confirmation
      state.stage = 1.5; // Intermediate stage: awaiting success metric

      // Auto-save project to Supabase
      await saveProject(req);

      return res.json({
        complete: true,
        structuredData,
        awaitingMetric: true,
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
  "successMetric": "",
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
      successMetric: '',
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
 * POST /api/intake/generate-metric
 * Generate AI-suggested success metric from intake conversation
 */
router.post('/generate-metric', requireAuth, async (req, res) => {
  try {
    const state = req.session.pipelineState;
    const history = state.intake.conversationHistory;

    if (!history || history.length === 0) {
      return res.status(400).json({ error: 'No conversation history found' });
    }

    const systemPrompt = getSuccessMetricPrompt();
    const userPrompt = `Based on the intake conversation above, generate ONE specific, measurable success metric for this feature.`;

    const response = await chatCompletion([
      ...history,
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ]);

    // Store suggested metric in session (not confirmed yet)
    state.intake.suggestedMetric = response.trim();

    res.json({ suggestedMetric: response.trim() });
  } catch (error) {
    console.error('Generate metric error:', error);
    res.status(500).json({ error: 'Failed to generate success metric' });
  }
});

/**
 * POST /api/intake/confirm-metric
 * Owner confirms or edits the suggested success metric
 */
router.post('/confirm-metric', requireAuth, async (req, res) => {
  const { metric } = req.body;

  if (!metric) {
    return res.status(400).json({ error: 'Metric required' });
  }

  try {
    const state = req.session.pipelineState;

    // Store confirmed metric in structured data
    state.intake.structuredData.successMetric = metric;

    // Now advance to writer agent stage
    state.stage = 2;

    // Auto-save with updated metric
    await saveProject(req);

    res.json({ success: true });
  } catch (error) {
    console.error('Confirm metric error:', error);
    res.status(500).json({ error: 'Failed to confirm metric' });
  }
});

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
