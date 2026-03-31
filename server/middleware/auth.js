/**
 * Auth middleware for protected routes
 * Checks if user has valid session
 */
export function requireAuth(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Unauthorized - please login' });
  }
  next();
}

/**
 * SPEC: attachSession
 * Purpose: Initialize session state structure if not present
 * Inputs: Express req, res, next
 * Outputs: None
 * Side effects: Writes pipelineState to req.session if missing
 * Error states: None - always succeeds
 */
export function attachSession(req, res, next) {
  // Initialize session state if not exists
  if (!req.session.pipelineState) {
    req.session.pipelineState = {
      sessionId: req.session.id,
      userId: req.session.userId || null,
      role: null,
      stage: 0,
      projectId: null, // Track which Supabase project is loaded
      input: { raw: '', mode: 'oneline' },
      intake: {
        conversationHistory: [],
        structuredData: {},
      },
      prd: {
        v0: '',
        qcResult: { scores: {}, comments: [] },
        debateResult: { escalated: false, escalationReason: null, comments: [] },
        allComments: [],
        finalPRD: '',
      },
      review: {
        commentActions: {},
      },
    };
  }
  next();
}
