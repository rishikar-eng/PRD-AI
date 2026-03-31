import express from 'express';
import { chatCompletion, streamChatCompletion } from '../services/ai.js';
import { getWriterSystemPrompt } from '../prompts/writer.js';
import { getQCSystemPrompt } from '../prompts/qc.js';
import { getDebateSystemPrompt } from '../prompts/debate.js';
import { requireAuth } from '../middleware/auth.js';
import { supabase } from '../services/db.js';

const router = express.Router();

/**
 * POST /api/agents/writer
 * Generate PRD with streaming output (SSE)
 */
router.post('/writer', requireAuth, async (req, res) => {
  const { structuredData } = req.body;

  if (!structuredData) {
    return res.status(400).json({ error: 'Structured data required' });
  }

  try {
    const state = req.session.pipelineState;
    const role = state.role;

    // Build the prompt with structured data
    const systemPrompt = getWriterSystemPrompt(role);
    const userPrompt = `Generate a complete PRD for the following feature:

FEATURE: ${structuredData.featureName || 'Untitled Feature'}
PROBLEM: ${structuredData.problem || ''}
PRIMARY USERS: ${structuredData.users || ''}
SUCCESS OUTCOME: ${structuredData.successOutcome || ''}
IN SCOPE: ${structuredData.inScope || ''}
OUT OF SCOPE: ${structuredData.outOfScope || ''}
USER FLOWS: ${structuredData.userFlows || ''}
CONFIGURATION: ${structuredData.configuration || ''}
FAILURE STATES: ${structuredData.failureStates || ''}
CONSTRAINTS: ${structuredData.constraints || ''}
OPEN QUESTIONS: ${structuredData.openQuestions || ''}

Write the complete PRD now.`;

    // Set up SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Get streaming response
    const stream = await streamChatCompletion([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ]);

    let fullPRD = '';

    // Stream tokens to client
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      if (content) {
        fullPRD += content;
        res.write(`data: ${JSON.stringify({ content })}\n\n`);
      }
    }

    // Store PRD in session
    state.prd.v0 = fullPRD;

    // Send completion signal
    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (error) {
    console.error('Writer agent error:', error);
    res.write(`data: ${JSON.stringify({ error: 'Writer agent failed' })}\n\n`);
    res.end();
  }
});

/**
 * POST /api/agents/qc
 * QC review of PRD
 */
router.post('/qc', requireAuth, async (req, res) => {
  const { prdText } = req.body;

  if (!prdText) {
    return res.status(400).json({ error: 'PRD text required' });
  }

  try {
    const systemPrompt = getQCSystemPrompt();
    const userPrompt = `Review this PRD:\n\n${prdText}`;

    const response = await chatCompletion([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ]);

    // Parse JSON from response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No valid JSON in QC response');
    }

    const qcResult = JSON.parse(jsonMatch[0]);

    // Store in session
    const state = req.session.pipelineState;
    state.prd.qcResult = qcResult;

    res.json(qcResult);
  } catch (error) {
    console.error('QC agent error:', error);
    res.status(500).json({ error: 'QC agent failed' });
  }
});

/**
 * POST /api/agents/debate
 * Debate agent adversarial review
 */
router.post('/debate', requireAuth, async (req, res) => {
  const { prdText, qcScores } = req.body;

  if (!prdText || !qcScores) {
    return res.status(400).json({ error: 'PRD text and QC scores required' });
  }

  try {
    const systemPrompt = getDebateSystemPrompt(qcScores);
    const userPrompt = `Perform adversarial review of this PRD:\n\n${prdText}`;

    const response = await chatCompletion([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ]);

    // Parse JSON from response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No valid JSON in Debate response');
    }

    const debateResult = JSON.parse(jsonMatch[0]);

    // Store in session
    const state = req.session.pipelineState;
    state.prd.debateResult = debateResult;

    // Combine all comments
    state.prd.allComments = [
      ...(state.prd.qcResult.comments || []),
      ...(debateResult.comments || []),
    ];

    // Move to review stage and auto-save
    state.stage = 5;
    await saveProject(req);

    res.json(debateResult);
  } catch (error) {
    console.error('Debate agent error:', error);
    res.status(500).json({ error: 'Debate agent failed' });
  }
});

/**
 * SPEC: saveProject
 * Purpose: Auto-save or update project in Supabase after agent pipeline completes
 * Inputs: req (Express request with session)
 * Outputs: None (async operation)
 * Side effects: Creates or updates row in projects table
 * Error states: Logs error but doesn't throw (non-blocking save)
 */
async function saveProject(req) {
  try {
    const state = req.session.pipelineState;
    const userEmail = req.session.userEmail;

    if (!userEmail) return;

    const title = state.intake.structuredData?.featureName || `Untitled — ${new Date().toLocaleDateString()}`;

    if (state.projectId) {
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
        state.projectId = data.id;
      }
    }
  } catch (error) {
    console.error('Auto-save project error:', error);
  }
}

export default router;
