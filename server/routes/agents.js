import express from 'express';
import { chatCompletion, streamChatCompletion, anthropicCompletion } from '../services/ai.js';
import { getAgentContext, getSelectedPrdIds } from '../services/projectContext.js';
import { getWriterSystemPrompt } from '../prompts/writer.js';
import { getQCSystemPrompt } from '../prompts/qc.js';
import { getDeliveryRealityPrompt } from '../prompts/deliveryReality.js';
import { getTechnicalFeasibilityPrompt } from '../prompts/technicalFeasibility.js';
import { getBusinessValuePrompt } from '../prompts/businessValue.js';
import { getSecurityPrompt } from '../prompts/security.js';
import { getDebateSystemPrompt } from '../prompts/debate.js';
import { getQualityGatePrompt } from '../prompts/qualityGate.js';
import { getClaudeContextPrompt } from '../prompts/claudeContext.js';
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
    const context = await getAgentContext(getSelectedPrdIds(req));
    const systemPrompt = context + getWriterSystemPrompt(role);
    const userPrompt = `Generate a complete PRD for the following feature:

FEATURE: ${structuredData.featureName || 'Untitled Feature'}
PROBLEM: ${structuredData.problem || ''}
PRIMARY USERS: ${structuredData.users || ''}
SUCCESS OUTCOME: ${structuredData.successOutcome || ''}
SUCCESS METRIC: ${structuredData.successMetric || ''}
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

    // Persist before signalling done — protects against server crash between stages
    await saveProject(req);

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
 * QC Agent — scores PRD on 4 dimensions and produces constructive comments.
 * Runs automatically between writer and specialists. No owner interaction.
 */
router.post('/qc', requireAuth, async (req, res) => {
  const { prdText } = req.body;

  if (!prdText) {
    return res.status(400).json({ error: 'PRD text required' });
  }

  try {
    const systemPrompt = getQCSystemPrompt();
    const userPrompt = `Score and review this PRD:\n\n${prdText}`;

    const response = await chatCompletion([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ]);

    // Parse JSON; tolerate prose around it
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No valid JSON in QC response');
    }
    const qcResult = JSON.parse(jsonMatch[0]);

    // Ensure each comment has agent='QC' so the review UI groups them correctly
    if (Array.isArray(qcResult.comments)) {
      qcResult.comments = qcResult.comments.map((c, i) => ({
        ...c,
        id: c.id || `qc-${i + 1}`,
        agent: 'QC',
        status: c.status || 'pending',
      }));
    }

    // Stash in session for the review stage to read
    const state = req.session.pipelineState;
    state.prd.qcResult = qcResult;

    await saveProject(req);
    res.json(qcResult);
  } catch (error) {
    console.error('QC agent error:', error);
    res.status(500).json({ error: 'QC agent failed' });
  }
});

/**
 * POST /api/agents/delivery-reality
 * Delivery Reality Agent - First specialist review
 */
router.post('/delivery-reality', requireAuth, async (req, res) => {
  const { prdText } = req.body;

  if (!prdText) {
    return res.status(400).json({ error: 'PRD text required' });
  }

  try {
    const context = await getAgentContext(getSelectedPrdIds(req));
    const systemPrompt = context + getDeliveryRealityPrompt();
    const userPrompt = `Review this PRD:\n\n${prdText}`;

    const response = await chatCompletion([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ]);

    // Parse JSON from response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No valid JSON in Delivery Reality response');
    }

    const result = JSON.parse(jsonMatch[0]);

    // Store in session
    const state = req.session.pipelineState;
    state.prd.agentFeedback.deliveryReality.comments = result.comments || [];

    await saveProject(req);
    res.json(result);
  } catch (error) {
    console.error('Delivery Reality agent error:', error);
    res.status(500).json({ error: 'Delivery Reality agent failed' });
  }
});

/**
 * POST /api/agents/technical-feasibility
 * Technical Feasibility Agent - Second specialist review
 */
router.post('/technical-feasibility', requireAuth, async (req, res) => {
  const { prdText } = req.body;

  if (!prdText) {
    return res.status(400).json({ error: 'PRD text required' });
  }

  try {
    const state = req.session.pipelineState;

    // Build context: PRD + previous agent feedback + owner responses
    let context = `PRD to review:\n\n${prdText}\n\n`;

    // Add Delivery Reality feedback if exists
    if (state.prd.agentFeedback.deliveryReality.comments.length > 0) {
      context += `Previous Agent Feedback:\n\n`;
      context += `DELIVERY REALITY AGENT:\n${JSON.stringify(state.prd.agentFeedback.deliveryReality.comments, null, 2)}\n`;
      context += `OWNER RESPONSE: ${state.prd.agentFeedback.deliveryReality.ownerResponse || 'No response yet'}\n\n`;
    }

    const projectCtx = await getAgentContext(getSelectedPrdIds(req));
    const systemPrompt = projectCtx + getTechnicalFeasibilityPrompt();
    const userPrompt = context + `\nReview this PRD from a technical feasibility perspective.`;

    const response = await chatCompletion([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ]);

    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No valid JSON in Technical Feasibility response');
    }

    const result = JSON.parse(jsonMatch[0]);
    state.prd.agentFeedback.technicalFeasibility.comments = result.comments || [];

    await saveProject(req);
    res.json(result);
  } catch (error) {
    console.error('Technical Feasibility agent error:', error);
    res.status(500).json({ error: 'Technical Feasibility agent failed' });
  }
});

/**
 * POST /api/agents/business-value
 * Business Value Agent - Third specialist review
 */
router.post('/business-value', requireAuth, async (req, res) => {
  const { prdText } = req.body;

  if (!prdText) {
    return res.status(400).json({ error: 'PRD text required' });
  }

  try {
    const state = req.session.pipelineState;

    // Build context with all previous feedback
    let context = `PRD to review:\n\n${prdText}\n\nPrevious Agent Feedback:\n\n`;

    if (state.prd.agentFeedback.deliveryReality.comments.length > 0) {
      context += `DELIVERY REALITY:\n${JSON.stringify(state.prd.agentFeedback.deliveryReality.comments, null, 2)}\n`;
      context += `OWNER: ${state.prd.agentFeedback.deliveryReality.ownerResponse || 'No response'}\n\n`;
    }

    if (state.prd.agentFeedback.technicalFeasibility.comments.length > 0) {
      context += `TECHNICAL FEASIBILITY:\n${JSON.stringify(state.prd.agentFeedback.technicalFeasibility.comments, null, 2)}\n`;
      context += `OWNER: ${state.prd.agentFeedback.technicalFeasibility.ownerResponse || 'No response'}\n\n`;
    }

    const projectCtx = await getAgentContext(getSelectedPrdIds(req));
    const systemPrompt = projectCtx + getBusinessValuePrompt();
    const userPrompt = context + `\nReview this PRD from a business value perspective.`;

    const response = await chatCompletion([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ]);

    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No valid JSON in Business Value response');
    }

    const result = JSON.parse(jsonMatch[0]);
    state.prd.agentFeedback.businessValue.comments = result.comments || [];

    await saveProject(req);
    res.json(result);
  } catch (error) {
    console.error('Business Value agent error:', error);
    res.status(500).json({ error: 'Business Value agent failed' });
  }
});

/**
 * POST /api/agents/security
 * Security Agent - Fourth specialist review
 */
router.post('/security', requireAuth, async (req, res) => {
  const { prdText } = req.body;

  if (!prdText) {
    return res.status(400).json({ error: 'PRD text required' });
  }

  try {
    const state = req.session.pipelineState;

    // Build context with all previous feedback
    let context = `PRD to review:\n\n${prdText}\n\nPrevious Agent Feedback:\n\n`;

    const agents = ['deliveryReality', 'technicalFeasibility', 'businessValue'];
    agents.forEach(agent => {
      if (state.prd.agentFeedback[agent].comments.length > 0) {
        context += `${agent.toUpperCase()}:\n${JSON.stringify(state.prd.agentFeedback[agent].comments, null, 2)}\n`;
        context += `OWNER: ${state.prd.agentFeedback[agent].ownerResponse || 'No response'}\n\n`;
      }
    });

    const projectCtx = await getAgentContext(getSelectedPrdIds(req));
    const systemPrompt = projectCtx + getSecurityPrompt();
    const userPrompt = context + `\nReview this PRD from a security perspective.`;

    const response = await chatCompletion([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ]);

    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No valid JSON in Security response');
    }

    const result = JSON.parse(jsonMatch[0]);
    state.prd.agentFeedback.security.comments = result.comments || [];

    await saveProject(req);
    res.json(result);
  } catch (error) {
    console.error('Security agent error:', error);
    res.status(500).json({ error: 'Security agent failed' });
  }
});

/**
 * POST /api/agents/debate
 * Debate Agent - Meta-layer review of all specialist feedback
 */
router.post('/debate', requireAuth, async (req, res) => {
  try {
    const state = req.session.pipelineState;

    // Build specialist feedback object for debate agent
    const specialistFeedback = {
      deliveryReality: {
        comments: state.prd.agentFeedback.deliveryReality.comments,
        ownerResponse: state.prd.agentFeedback.deliveryReality.ownerResponse,
      },
      technicalFeasibility: {
        comments: state.prd.agentFeedback.technicalFeasibility.comments,
        ownerResponse: state.prd.agentFeedback.technicalFeasibility.ownerResponse,
      },
      businessValue: {
        comments: state.prd.agentFeedback.businessValue.comments,
        ownerResponse: state.prd.agentFeedback.businessValue.ownerResponse,
      },
      security: {
        comments: state.prd.agentFeedback.security.comments,
        ownerResponse: state.prd.agentFeedback.security.ownerResponse,
      },
    };

    const systemPrompt = getDebateSystemPrompt(specialistFeedback);
    const userPrompt = `Review the specialist feedback and identify meta-level concerns.`;

    // Debate agent uses Claude (Anthropic) — better at nuanced meta-reasoning
    // across multiple specialist outputs than gpt-4o in our testing.
    const response = await anthropicCompletion([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ]);

    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No valid JSON in Debate response');
    }

    const debateResult = JSON.parse(jsonMatch[0]);

    // Store in session
    state.prd.agentFeedback.debate.comments = debateResult.comments || [];
    state.prd.agentFeedback.debate.escalated = debateResult.escalated || false;
    state.prd.agentFeedback.debate.escalationReason = debateResult.escalationReason || null;

    // Combine all comments for review stage
    state.prd.allComments = [
      ...state.prd.agentFeedback.deliveryReality.comments,
      ...state.prd.agentFeedback.technicalFeasibility.comments,
      ...state.prd.agentFeedback.businessValue.comments,
      ...state.prd.agentFeedback.security.comments,
      ...state.prd.agentFeedback.debate.comments,
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
 * POST /api/agents/owner-response
 * Save owner's response to a specialist agent
 */
router.post('/owner-response', requireAuth, async (req, res) => {
  const { agent, response } = req.body;

  if (!agent || !response) {
    return res.status(400).json({ error: 'Agent name and response required' });
  }

  const validAgents = ['deliveryReality', 'technicalFeasibility', 'businessValue', 'security'];
  if (!validAgents.includes(agent)) {
    return res.status(400).json({ error: 'Invalid agent name' });
  }

  try {
    const state = req.session.pipelineState;
    state.prd.agentFeedback[agent].ownerResponse = response;

    // Auto-save after owner response
    await saveProject(req);

    res.json({ success: true });
  } catch (error) {
    console.error('Owner response error:', error);
    res.status(500).json({ error: 'Failed to save owner response' });
  }
});

/**
 * POST /api/agents/generate-claude-context
 * Generate claude.md implementation context from external PRD review
 */
router.post('/generate-claude-context', requireAuth, async (req, res) => {
  const { originalPRD, externalPRD } = req.body;

  if (!originalPRD || !externalPRD) {
    return res.status(400).json({ error: 'Both originalPRD and externalPRD required' });
  }

  try {
    const state = req.session.pipelineState;

    // Extract agent feedback and owner responses from externalPRD session data
    const agentFeedback = state.externalPRD?.agentFeedback || state.prd?.agentFeedback || {};
    const ownerResponses = {
      deliveryReality: agentFeedback.deliveryReality?.ownerResponse || '',
      technicalFeasibility: agentFeedback.technicalFeasibility?.ownerResponse || '',
      businessValue: agentFeedback.businessValue?.ownerResponse || '',
      security: agentFeedback.security?.ownerResponse || '',
    };

    const prompt = getClaudeContextPrompt(originalPRD, externalPRD, agentFeedback, ownerResponses);

    const claudeContext = await chatCompletion([
      { role: 'user', content: prompt },
    ], { temperature: 0.4, maxTokens: 6000 });

    // Save external PRD data to session
    if (!state.externalPRD) {
      state.externalPRD = {
        uploaded: false,
        originalPRD: '',
        externalPRD: '',
        agentFeedback: {},
        claudeContext: '',
      };
    }

    state.externalPRD.uploaded = true;
    state.externalPRD.originalPRD = originalPRD;
    state.externalPRD.externalPRD = externalPRD;
    state.externalPRD.agentFeedback = agentFeedback;
    state.externalPRD.claudeContext = claudeContext;
    state.stage = 6.5; // Mark as external PRD complete

    // Save to Supabase
    await saveProject(req);

    res.json({ claudeContext });
  } catch (error) {
    console.error('Claude context generation error:', error);
    res.status(500).json({ error: 'Failed to generate claude.md' });
  }
});

/**
 * POST /api/agents/quality-gate
 * Run pre-flight quality checks on final PRD
 */
router.post('/quality-gate', requireAuth, async (req, res) => {
  const { prdText } = req.body;

  if (!prdText) {
    return res.status(400).json({ error: 'PRD text required' });
  }

  try {
    const systemPrompt = getQualityGatePrompt();
    const userPrompt = `Run quality gate checks on this PRD:\n\n${prdText}`;

    const response = await chatCompletion([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ]);

    // Parse JSON from response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No valid JSON in Quality Gate response');
    }

    const qualityGateResult = JSON.parse(jsonMatch[0]);

    // Store in session
    const state = req.session.pipelineState;
    state.prd.qualityGate = qualityGateResult;

    res.json(qualityGateResult);
  } catch (error) {
    console.error('Quality gate error:', error);
    res.status(500).json({ error: 'Quality gate failed' });
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
