import React, { useState } from 'react';
import PRDDocument from './PRDDocument';
import CommentPanel from './CommentPanel';

export default function ReviewStage({ pipelineData, onFinalize }) {
  const [comments, setComments] = useState(() => {
    // Combine QC and Debate comments
    const allComments = [
      ...(pipelineData.qcResult?.comments || []),
      ...(pipelineData.debateResult?.comments || []),
    ];
    return allComments;
  });

  const [highlightedSections, setHighlightedSections] = useState([]);

  const handleCommentAction = (commentId, action, ownerResponse) => {
    setComments(prev => prev.map(comment => {
      if (comment.id === commentId) {
        return {
          ...comment,
          status: action,
          ownerResponse: ownerResponse || null,
        };
      }
      return comment;
    }));

    // Highlight the section if accepted
    if (action === 'accepted') {
      const comment = comments.find(c => c.id === commentId);
      if (comment && !highlightedSections.includes(comment.section)) {
        setHighlightedSections(prev => [...prev, comment.section]);
      }
    }
  };

  const allActioned = comments.every(c => c.status === 'accepted' || c.status === 'rejected');
  const averageScore = pipelineData.qcResult?.scores?.average || 0;

  return (
    <div style={{ marginTop: '80px' }}>
      {/* Header */}
      <div style={{
        maxWidth: '1400px',
        margin: '0 auto 32px',
        padding: '0 32px',
      }}>
        <h1 style={{ fontSize: '32px', fontWeight: 800, marginBottom: '8px' }}>
          Owner <span className="gradient-text">Review</span>
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '15px', marginBottom: '16px' }}>
          Review and action all agent comments to finalize the PRD
        </p>

        {/* Score Summary */}
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{
            padding: '8px 16px',
            borderRadius: 'var(--radius-xs)',
            background: `rgba(${averageScore >= 3.5 ? '74, 222, 128' : averageScore >= 2.5 ? '251, 146, 60' : '244, 114, 182'}, 0.1)`,
            border: `1px solid rgba(${averageScore >= 3.5 ? '74, 222, 128' : averageScore >= 2.5 ? '251, 146, 60' : '244, 114, 182'}, 0.3)`,
            color: averageScore >= 3.5 ? 'var(--green-bright)' : averageScore >= 2.5 ? 'var(--orange)' : 'var(--pink)',
            fontSize: '14px',
            fontWeight: 700,
          }}>
            QC Score: {averageScore.toFixed(1)}/5
          </div>
          <div style={{
            padding: '8px 16px',
            borderRadius: 'var(--radius-xs)',
            border: '1px solid var(--border)',
            fontSize: '14px',
            color: 'var(--text-secondary)',
          }}>
            {comments.length} total comments
          </div>
          {pipelineData.debateResult?.escalated && (
            <div className="badge badge-escalated">
              Debate Escalated
            </div>
          )}
        </div>
      </div>

      {/* Side-by-side Layout */}
      <div style={{
        maxWidth: '1400px',
        margin: '0 auto',
        padding: '0 32px 80px',
        display: 'grid',
        gridTemplateColumns: '1.5fr 1fr',
        gap: '24px',
        minHeight: 'calc(100vh - 300px)',
      }}>
        {/* Left: PRD Document */}
        <div className="card" style={{
          padding: 0,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}>
          <PRDDocument
            prdText={pipelineData.prd}
            highlightedSections={highlightedSections}
          />
        </div>

        {/* Right: Comments Panel */}
        <div className="card" style={{
          padding: 0,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}>
          <CommentPanel
            comments={comments}
            onCommentAction={handleCommentAction}
          />
        </div>
      </div>

      {/* Finalize Modal/Button */}
      {allActioned && (
        <div style={{
          position: 'fixed',
          bottom: 32,
          right: 32,
          zIndex: 100,
        }}>
          <button
            className="btn-primary"
            onClick={() => onFinalize({ prd: pipelineData.prd, comments })}
            style={{
              fontSize: '16px',
              padding: '16px 32px',
              boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
            }}
          >
            Finalize PRD →
          </button>
        </div>
      )}
    </div>
  );
}
