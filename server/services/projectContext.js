/**
 * Project context loader.
 *
 * Provides agents with two layers of context:
 *   1. Static  — server/assets/project_context.md (tech stack, hard rules, glossary)
 *                Edited manually; agents pick up changes on next call (mtime-cached).
 *   2. Dynamic — selected past PRDs pulled from Supabase by ID.
 *                Phase A: always empty (no UI to set yet).
 *                Phase B: PRD-picker UI populates session.pipelineState.contextPrdIds.
 *
 * The combined context is prepended to each agent's system prompt by the routes.
 * Caching: OpenAI auto-caches prefixes >=1024 tokens for ~5-10 min. Since this
 * context is the same across all agent calls in a single pipeline run, that
 * caching kicks in automatically — no extra code needed.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { supabase } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CONTEXT_PATH = path.join(__dirname, '..', 'assets', 'project_context.md');

let cached = { mtimeMs: 0, content: '' };

/** Read the static project context markdown file. Re-reads only if mtime changes. */
export function getStaticContext() {
  try {
    const stat = fs.statSync(CONTEXT_PATH);
    if (stat.mtimeMs === cached.mtimeMs) {
      return cached.content;
    }
    const content = fs.readFileSync(CONTEXT_PATH, 'utf8');
    cached = { mtimeMs: stat.mtimeMs, content };
    return content;
  } catch (err) {
    if (err.code !== 'ENOENT') {
      console.warn('Could not read project_context.md:', err.message);
    }
    return '';
  }
}

/**
 * Fetch selected past PRDs and format as a markdown section.
 * @param {string[]} prdIds  Project UUIDs to include. Empty array = no-op.
 * @returns {Promise<string>}
 */
export async function getSelectedPRDsContext(prdIds) {
  if (!prdIds || prdIds.length === 0) return '';
  try {
    const { data, error } = await supabase
      .from('projects')
      .select('id, title, session_data')
      .in('id', prdIds);
    if (error || !data || data.length === 0) return '';

    let md = '## Referenced Past PRDs\n\nThe owner selected these PRDs as relevant context for the current work. Read them to avoid contradicting prior decisions or repeating shipped functionality.\n\n';
    for (const p of data) {
      const title = p.title || 'Untitled PRD';
      const prdText =
        p.session_data?.prd?.finalPRD ||
        p.session_data?.prd?.v0 ||
        '(PRD content not available)';
      md += `### ${title}\n\n${prdText}\n\n`;
    }
    return md;
  } catch (err) {
    console.warn('Could not fetch past PRDs for context:', err.message);
    return '';
  }
}

/**
 * Build the combined context string to prepend to an agent's system prompt.
 * Returns empty string if no context is available.
 */
export async function getAgentContext(prdIds = []) {
  const staticPart = getStaticContext();
  const prdsPart = await getSelectedPRDsContext(prdIds);

  const parts = [];
  if (staticPart) parts.push(staticPart);
  if (prdsPart) parts.push(prdsPart);
  if (parts.length === 0) return '';

  return parts.join('\n\n---\n\n') + '\n\n---\n\n';
}

/**
 * Get the user-selected PRD IDs from session state.
 * Phase A: always returns []. Phase B (picker UI) will populate this.
 */
export function getSelectedPrdIds(req) {
  return req.session?.pipelineState?.contextPrdIds || [];
}
