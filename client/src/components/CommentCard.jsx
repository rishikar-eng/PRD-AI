import React, { useState } from 'react';

export default function CommentCard({ comment, onAction }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState('');

  const handleAccept = () => {
    onAction(comment.id, 'accepted', null);
  };

  const handleReject = () => {
    onAction(comment.id, 'rejected', null);
  };

  const handleEditClick = () => {
    setIsEditing(true);
    setEditText('');
  };

  const handleEditSave = () => {
    if (editText.trim()) {
      onAction(comment.id, 'accepted', editText.trim());
      setIsEditing(false);
      setEditText('');
    }
  };

  const isActioned = comment.status === 'accepted' || comment.status === 'rejected';

  return (
    <div
      className="card"
      style={{
        marginBottom: '16px',
        opacity: comment.status === 'rejected' ? 0.5 : 1,
        background: comment.status === 'accepted' ? 'rgba(74, 222, 128, 0.05)' : 'var(--bg-card)',
        borderColor: comment.status === 'accepted' ? 'rgba(74, 222, 128, 0.2)' : 'var(--border)',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
        <span className={`badge badge-${comment.agent.toLowerCase()}`}>
          {comment.agent}
        </span>
        <span className={`badge badge-${comment.type}`}>
          {comment.type}
        </span>
        {comment.escalated && (
          <span className="badge badge-escalated">Escalated</span>
        )}
        <span style={{
          fontSize: '11px',
          color: 'var(--text-tertiary)',
          fontWeight: 600,
          padding: '3px 0',
        }}>
          {comment.section}
        </span>
      </div>

      {/* Comment Text */}
      <div style={{
        fontSize: '14px',
        lineHeight: 1.7,
        color: 'var(--text-secondary)',
        marginBottom: '16px',
      }}>
        {comment.text}
      </div>

      {/* Edit Mode */}
      {isEditing && (
        <div style={{ marginBottom: '16px' }}>
          <textarea
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            placeholder="Add your response or modification before accepting..."
            style={{ minHeight: '80px', marginBottom: '8px' }}
            autoFocus
          />
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn-accept" onClick={handleEditSave} disabled={!editText.trim()}>
              Save & Accept
            </button>
            <button className="btn-secondary" style={{ fontSize: '12px', padding: '6px 14px' }} onClick={() => setIsEditing(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Actions */}
      {!isActioned && !isEditing && (
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn-accept" onClick={handleAccept}>
            Accept
          </button>
          <button className="btn-reject" onClick={handleReject}>
            Reject
          </button>
          <button className="btn-edit" onClick={handleEditClick}>
            Edit
          </button>
        </div>
      )}

      {/* Status */}
      {isActioned && (
        <div style={{
          fontSize: '12px',
          fontWeight: 700,
          color: comment.status === 'accepted' ? 'var(--accepted)' : 'var(--rejected)',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}>
          {comment.status === 'accepted' ? '✓ Accepted' : '✗ Rejected'}
          {comment.ownerResponse && (
            <span style={{ display: 'block', marginTop: '8px', color: 'var(--text-secondary)', textTransform: 'none', letterSpacing: 'normal', fontWeight: 400 }}>
              Your note: {comment.ownerResponse}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
