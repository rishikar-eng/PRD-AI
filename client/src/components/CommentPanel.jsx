import React, { useState } from 'react';
import CommentCard from './CommentCard';

const tabStyle = (active) => ({
  padding: '8px 16px',
  fontSize: '13px',
  fontWeight: 600,
  cursor: 'pointer',
  background: 'none',
  border: 'none',
  borderBottom: active ? '2px solid var(--teal)' : '2px solid transparent',
  color: active ? 'var(--teal)' : 'var(--text-secondary)',
  transition: 'color 0.2s',
});

// Keywords used to fuzzy-match each structured field to a PRD section title
const FIELD_KEYWORDS = {
  featureName:    ['objective', 'overview', 'summary', 'feature'],
  problem:        ['objective', 'overview', 'problem', 'background'],
  users:          ['objective', 'user', 'audience', 'stakeholder'],
  successOutcome: ['acceptance', 'success', 'criteria', 'outcome'],
  inScope:        ['in scope', 'scope'],
  outOfScope:     ['out of scope', 'exclusion'],
  userFlows:      ['user flow', 'flow', 'journey'],
  configuration:  ['configuration', 'config', 'setting'],
  failureStates:  ['failure', 'error', 'handling', 'edge'],
  constraints:    ['constraint', 'architecture', 'technical'],
  openQuestions:  ['open question', 'question', 'unknown'],
};

function findMatchingSection(fieldKey, prdSections) {
  const keywords = FIELD_KEYWORDS[fieldKey];
  if (!keywords || !prdSections.length) return null;
  let best = null, bestScore = 0;
  for (const title of prdSections) {
    const lower = title.toLowerCase();
    const score = keywords.filter(kw => lower.includes(kw)).length;
    if (score > bestScore) { bestScore = score; best = title; }
  }
  return bestScore > 0 ? best : null;
}

export default function CommentPanel({ comments, onCommentAction, intakeData, activeTab, onTabChange, prdSections = [], highlightedSections = [], onHighlightSection, localMessages, isSendingMessage, hasNewMessages, isRegenerating, onSendMessage, onRegeneratePRD }) {
  const [inputText, setInputText] = useState('');

  const qcComments = comments.filter(c => c.agent === 'QC');
  const debateComments = comments.filter(c => c.agent === 'Debate');
  const allActioned = comments.every(c => c.status === 'accepted' || c.status === 'rejected');

  // Use localMessages (live, managed by ReviewStage) if available, fallback to intakeData
  const messages = localMessages ?? intakeData?.messages ?? [];
  const structured = intakeData?.structuredData || {};
  const hasIntake = messages.length > 0 || Object.keys(structured).length > 0;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!inputText.trim() || isSendingMessage || isRegenerating) return;
    onSendMessage(inputText.trim());
    setInputText('');
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header + Tabs */}
      <div style={{ padding: '20px 24px 0', borderBottom: '1px solid var(--border)' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '12px' }}>
          {activeTab === 'intake' ? 'Intake Context' : 'Agent Comments'}
        </h2>
        <div style={{ display: 'flex', gap: '4px' }}>
          <button style={tabStyle(activeTab === 'comments')} onClick={() => onTabChange('comments')}>
            Comments ({comments.length})
          </button>
          {hasIntake && (
            <button style={tabStyle(activeTab === 'intake')} onClick={() => onTabChange('intake')}>
              Intake Chat
            </button>
          )}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>

        {/* ── Comments Tab ── */}
        {activeTab === 'comments' && (
          <>
            {qcComments.length > 0 && (
              <div style={{ marginBottom: '32px' }}>
                <div style={{
                  fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)',
                  letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '16px',
                }}>
                  QC Agent ({qcComments.length})
                </div>
                {qcComments.map(comment => (
                  <CommentCard key={comment.id} comment={comment} onAction={onCommentAction} />
                ))}
              </div>
            )}

            {debateComments.length > 0 && (
              <div>
                <div style={{
                  fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)',
                  letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '16px',
                }}>
                  Debate Agent ({debateComments.length})
                </div>
                {debateComments.map(comment => (
                  <CommentCard key={comment.id} comment={comment} onAction={onCommentAction} />
                ))}
              </div>
            )}

            {comments.length === 0 && (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-tertiary)', fontSize: '14px' }}>
                No comments from agents
              </div>
            )}
          </>
        )}

        {/* ── Intake Tab ── */}
        {activeTab === 'intake' && (
          <>
            {/* Chat messages */}
            {messages.length > 0 && (
              <div style={{ marginBottom: '32px' }}>
                <div style={{
                  fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)',
                  letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '16px',
                }}>
                  Conversation
                </div>
                {messages.map((msg, i) => (
                  <div key={i} style={{
                    marginBottom: '12px',
                    display: 'flex',
                    flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
                    gap: '8px',
                  }}>
                    <div style={{
                      width: '28px', height: '28px', borderRadius: '50%', flexShrink: 0,
                      background: msg.role === 'user' ? 'var(--pink)' : 'var(--teal)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px',
                    }}>
                      {msg.role === 'user' ? '👤' : '🤖'}
                    </div>
                    <div style={{
                      background: msg.role === 'user' ? 'rgba(244, 114, 182, 0.08)' : 'var(--bg-surface)',
                      border: `1px solid ${msg.role === 'user' ? 'rgba(244, 114, 182, 0.2)' : 'var(--border)'}`,
                      borderRadius: 'var(--radius-sm)',
                      padding: '10px 14px',
                      maxWidth: '80%',
                      fontSize: '13px',
                      lineHeight: 1.6,
                      color: 'var(--text-primary)',
                    }}>
                      {msg.content}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Continue conversation input */}
            <div style={{ marginBottom: '32px' }}>
              {hasNewMessages && (
                <button
                  className="btn-primary"
                  onClick={onRegeneratePRD}
                  disabled={isRegenerating || isSendingMessage}
                  style={{ width: '100%', fontSize: '13px', marginBottom: '10px' }}
                >
                  {isRegenerating ? 'Regenerating PRD...' : 'Regenerate PRD'}
                </button>
              )}
              <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  value={inputText}
                  onChange={e => setInputText(e.target.value)}
                  placeholder="Continue the conversation..."
                  disabled={isSendingMessage || isRegenerating}
                  style={{ flex: 1, fontSize: '13px' }}
                />
                <button
                  type="submit"
                  className="btn-secondary"
                  disabled={!inputText.trim() || isSendingMessage || isRegenerating}
                  style={{ fontSize: '13px', whiteSpace: 'nowrap' }}
                >
                  {isSendingMessage ? '...' : 'Send'}
                </button>
              </form>
            </div>

            {/* Structured summary */}
            {Object.keys(structured).length > 0 && (
              <div>
                <div style={{
                  fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)',
                  letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '16px',
                }}>
                  Extracted Summary
                </div>
                {Object.entries(structured).map(([key, value]) => {
                  if (!value) return null;
                  const matchedSection = findMatchingSection(key, prdSections);
                  const isHighlighted = matchedSection && highlightedSections.includes(matchedSection);
                  const isClickable = !!matchedSection;
                  return (
                    <div
                      key={key}
                      onClick={() => isClickable && onHighlightSection(matchedSection)}
                      style={{
                        marginBottom: '10px',
                        padding: '10px 12px',
                        borderRadius: 'var(--radius-xs)',
                        border: `1px solid ${isHighlighted ? 'rgba(251, 146, 60, 0.4)' : 'var(--border)'}`,
                        background: isHighlighted ? 'rgba(251, 146, 60, 0.08)' : 'transparent',
                        cursor: isClickable ? 'pointer' : 'default',
                        transition: 'all 0.2s',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'capitalize' }}>
                          {key.replace(/([A-Z])/g, ' $1').trim()}
                        </div>
                        {isClickable && (
                          <div style={{ fontSize: '10px', color: isHighlighted ? 'var(--orange)' : 'var(--text-tertiary)' }}>
                            {isHighlighted ? '● ' : '○ '}{matchedSection}
                          </div>
                        )}
                      </div>
                      <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                        {Array.isArray(value) ? value.join(', ') : String(value)}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {!hasIntake && (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-tertiary)', fontSize: '14px' }}>
                No intake data available
              </div>
            )}
          </>
        )}
      </div>

      {/* Finalize Button — only on comments tab */}
      {activeTab === 'comments' && allActioned && comments.length > 0 && (
        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)' }}>
          <button className="btn-primary" style={{ width: '100%' }}>
            Finalize PRD →
          </button>
        </div>
      )}
    </div>
  );
}
