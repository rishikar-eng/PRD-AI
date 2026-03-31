import React from 'react';
import CommentCard from './CommentCard';

export default function CommentPanel({ comments, onCommentAction }) {
  const qcComments = comments.filter(c => c.agent === 'QC');
  const debateComments = comments.filter(c => c.agent === 'Debate');

  const allActioned = comments.every(c => c.status === 'accepted' || c.status === 'rejected');

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{
        padding: '24px 24px 16px',
        borderBottom: '1px solid var(--border)',
      }}>
        <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '8px' }}>
          Agent Comments
        </h2>
        <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
          {comments.filter(c => c.status === 'accepted' || c.status === 'rejected').length} of {comments.length} actioned
        </div>
      </div>

      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '24px',
      }}>
        {/* QC Comments */}
        {qcComments.length > 0 && (
          <div style={{ marginBottom: '32px' }}>
            <div style={{
              fontSize: '12px',
              fontWeight: 700,
              color: 'var(--text-secondary)',
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              marginBottom: '16px',
            }}>
              QC Agent ({qcComments.length})
            </div>
            {qcComments.map(comment => (
              <CommentCard
                key={comment.id}
                comment={comment}
                onAction={onCommentAction}
              />
            ))}
          </div>
        )}

        {/* Debate Comments */}
        {debateComments.length > 0 && (
          <div>
            <div style={{
              fontSize: '12px',
              fontWeight: 700,
              color: 'var(--text-secondary)',
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              marginBottom: '16px',
            }}>
              Debate Agent ({debateComments.length})
            </div>
            {debateComments.map(comment => (
              <CommentCard
                key={comment.id}
                comment={comment}
                onAction={onCommentAction}
              />
            ))}
          </div>
        )}

        {comments.length === 0 && (
          <div style={{
            textAlign: 'center',
            padding: '40px 20px',
            color: 'var(--text-tertiary)',
            fontSize: '14px',
          }}>
            No comments from agents
          </div>
        )}
      </div>

      {/* Finalize Button */}
      {allActioned && comments.length > 0 && (
        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid var(--border)',
        }}>
          <button className="btn-primary" style={{ width: '100%' }}>
            Finalize PRD →
          </button>
        </div>
      )}
    </div>
  );
}
