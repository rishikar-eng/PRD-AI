import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { chatCompletion } from '../services/ai.js';
import { getStage2HandoffPrompt } from '../prompts/stage2Handoff.js';
import { getClaudeContextPrompt } from '../prompts/claudeContext.js';
import { buildStage2Zip } from '../services/zipBuilder.js';
import archiver from 'archiver';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

/**
 * POST /api/handoff/stage2
 * Generates Stage 2 handoff bundle (zip file)
 * Contains: PRD_v1.0.md + rian_theme_reference.html + stage2_prompt.txt
 */
router.post('/stage2', requireAuth, async (req, res) => {
  const { prdText, featureName } = req.body;

  if (!prdText || !featureName) {
    return res.status(400).json({ error: 'prdText and featureName are required' });
  }

  try {
    // Step 1: Generate feature-aware Stage 2 prompt using AI
    const promptTemplate = getStage2HandoffPrompt(prdText, featureName);

    const stage2Prompt = await chatCompletion([
      { role: 'user', content: promptTemplate }
    ], { temperature: 0.4, maxTokens: 4000 });

    // Step 2: Build zip bundle with all 3 files
    const zipBuffer = await buildStage2Zip({
      prdText,
      featureName,
      stage2Prompt
    });

    // Step 3: Send zip as download
    const timestamp = Date.now();
    const sanitizedFeatureName = featureName.replace(/[^a-zA-Z0-9]/g, '_');
    const filename = `stage2_handoff_${sanitizedFeatureName}_${timestamp}.zip`;

    res.set({
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': zipBuffer.length
    });

    res.send(zipBuffer);
  } catch (error) {
    console.error('Stage 2 handoff generation error:', error);
    res.status(500).json({ error: 'Failed to generate Stage 2 handoff bundle' });
  }
});

/**
 * POST /api/handoff/claude-code
 * Generates Claude Code handoff bundle (zip file)
 * Contains: PRD_v1.0.md + rian_theme_reference.html + CLAUDE.md
 */
router.post('/claude-code', requireAuth, async (req, res) => {
  const { originalPRD, externalPRD, agentFeedback, featureName } = req.body;

  if (!externalPRD || !featureName) {
    return res.status(400).json({ error: 'externalPRD and featureName are required' });
  }

  try {
    // Step 1: Generate CLAUDE.md implementation context
    const ownerResponses = {
      deliveryReality: agentFeedback?.deliveryReality?.ownerResponse || '',
      technicalFeasibility: agentFeedback?.technicalFeasibility?.ownerResponse || '',
      businessValue: agentFeedback?.businessValue?.ownerResponse || '',
      security: agentFeedback?.security?.ownerResponse || '',
    };

    const promptTemplate = getClaudeContextPrompt(
      originalPRD || externalPRD,
      externalPRD,
      agentFeedback || {},
      ownerResponses
    );

    const claudeContext = await chatCompletion([
      { role: 'user', content: promptTemplate }
    ], { temperature: 0.4, maxTokens: 6000 });

    // Step 2: Build zip bundle
    const archive = archiver('zip', { zlib: { level: 9 } });
    const chunks = [];

    archive.on('data', (chunk) => chunks.push(chunk));
    archive.on('error', (err) => {
      throw err;
    });

    // Add PRD as markdown file
    archive.append(externalPRD, { name: 'PRD_v1.0.md' });

    // Add CLAUDE.md implementation context
    archive.append(claudeContext, { name: 'CLAUDE.md' });

    // Add rian_theme_reference.html from assets folder
    const themeReferencePath = path.join(__dirname, '..', 'assets', 'rian_theme_reference.html');
    if (fs.existsSync(themeReferencePath)) {
      archive.file(themeReferencePath, { name: 'rian_theme_reference.html' });
    } else {
      archive.append(
        '<!-- ERROR: rian_theme_reference.html not found. Please add this file to /server/assets/ -->',
        { name: 'rian_theme_reference.html' }
      );
    }

    // Finalize archive
    const zipBufferPromise = new Promise((resolve) => {
      archive.on('end', () => resolve(Buffer.concat(chunks)));
    });

    archive.finalize();
    const zipBuffer = await zipBufferPromise;

    // Step 3: Send zip as download
    const timestamp = Date.now();
    const sanitizedFeatureName = featureName.replace(/[^a-zA-Z0-9]/g, '_');
    const filename = `claude_code_handoff_${sanitizedFeatureName}_${timestamp}.zip`;

    res.set({
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': zipBuffer.length
    });

    res.send(zipBuffer);
  } catch (error) {
    console.error('Claude Code handoff generation error:', error);
    res.status(500).json({ error: 'Failed to generate Claude Code handoff bundle' });
  }
});

export default router;
